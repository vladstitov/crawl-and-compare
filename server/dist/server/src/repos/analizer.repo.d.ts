export declare namespace AnalizerRepo {
    interface AnalizePageResult {
        url: string;
        htmlSizeInBytes: number;
        isLinkedInProfile: boolean;
        nextAction: 'NONE' | 'OPEN_ABOUT_SECTION';
    }
    function AnalizePage(url: string, html: string): Promise<AnalizePageResult>;
}
