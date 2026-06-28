"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalizeWithAiRepo = void 0;
var AnalizeWithAiRepo;
(function (AnalizeWithAiRepo) {
    async function AnalizePageAI(url, html) {
        const normalizedUrl = url.trim();
        const fallbackResult = {
            _id: crypto.randomUUID(),
            reference: `ai-analysis:${Date.now()}`,
            url: normalizedUrl,
            title: normalizedUrl,
            sourceName: (() => {
                try {
                    return new URL(normalizedUrl).hostname;
                }
                catch {
                    return 'unknown';
                }
            })(),
            htmlPage: html,
            htmlData: '{}',
            hasTags: [],
            status: 'completed'
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
                        '- title: string',
                        "- status: 'pending' | 'running' | 'completed' | 'failed'",
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
                ...fallbackResult,
                title: typeof aiResult.title === 'string' && aiResult.title.trim().length > 0
                    ? aiResult.title.trim()
                    : fallbackResult.title,
                status: aiResult.status === 'pending' ||
                    aiResult.status === 'running' ||
                    aiResult.status === 'completed' ||
                    aiResult.status === 'failed'
                    ? aiResult.status
                    : fallbackResult.status
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