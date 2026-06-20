"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalizeWithAiRepo = void 0;
var AnalizeWithAiRepo;
(function (AnalizeWithAiRepo) {
    async function AnalizePageAI(url, html) {
        const normalizedUrl = url.trim();
        const fallbackResult = {
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
            const payload = (await response.json());
            if (!payload.response) {
                return fallbackResult;
            }
            const aiResult = JSON.parse(payload.response);
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
        }
        catch (error) {
            console.error('Failed to analyze page with Ollama:', error);
            return fallbackResult;
        }
    }
    AnalizeWithAiRepo.AnalizePageAI = AnalizePageAI;
})(AnalizeWithAiRepo || (exports.AnalizeWithAiRepo = AnalizeWithAiRepo = {}));
//# sourceMappingURL=analize-with-ai.repo.js.map