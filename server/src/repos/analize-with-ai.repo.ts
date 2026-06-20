import type { AnalizerRepo } from './analizer.repo';

export namespace AnalizeWithAiRepo {
  export type AnalizePageResult = AnalizerRepo.AnalizePageResult;

  interface OllamaGenerateResponse {
    response?: string;
  }

  interface OllamaAnalizePageResponse {
    isLinkedInProfile?: boolean;
    nextAction?: AnalizePageResult['nextAction'];
  }

  export async function AnalizePageAI(url: string, html: string): Promise<AnalizePageResult> {
    const normalizedUrl = url.trim();
    const fallbackResult: AnalizePageResult = {
      url: normalizedUrl,
      htmlSizeInBytes: html.length,
      isLinkedInProfile: normalizedUrl.includes('/in/'),
      nextAction: normalizedUrl.includes('/in/') ? 'NONE' : 'OPEN_ABOUT_SECTION'
    };

    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434/api/generate';
    const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.1';

    try {
      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ollamaModel,
          stream: false,
          format: 'json',
          prompt: [
            'Analyze this crawled web page and respond with JSON only.',
            'Return an object with exactly these fields:',
            '- isLinkedInProfile: boolean',
            "- nextAction: 'NONE' or 'OPEN_ABOUT_SECTION'",
            `URL: ${normalizedUrl}`,
            `HTML: ${html}`
          ].join('\n')
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as OllamaGenerateResponse;

      if (!payload.response) {
        return fallbackResult;
      }

      const aiResult = JSON.parse(payload.response) as OllamaAnalizePageResponse;

      return {
        url: normalizedUrl,
        htmlSizeInBytes: html.length,
        isLinkedInProfile: typeof aiResult.isLinkedInProfile === 'boolean'
          ? aiResult.isLinkedInProfile
          : fallbackResult.isLinkedInProfile,
        nextAction: aiResult.nextAction === 'NONE' || aiResult.nextAction === 'OPEN_ABOUT_SECTION'
          ? aiResult.nextAction
          : fallbackResult.nextAction
      };
    } catch (error) {
      console.error('Failed to analyze page with Ollama:', error);
      return fallbackResult;
    }

  }
}