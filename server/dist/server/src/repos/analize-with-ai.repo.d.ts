import type { AnalizerRepo } from './analizer.repo';
export declare namespace AnalizeWithAiRepo {
    type AnalizePageResult = AnalizerRepo.AnalizePageResult;
    function AnalizePageAI(url: string, html: string): Promise<AnalizePageResult>;
}
