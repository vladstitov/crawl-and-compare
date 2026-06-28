import type { JobDocument } from '../core/database';
export declare namespace AnalizerRepo {
    interface PageContainsRule {
        tag: string;
        text: string;
    }
    interface HtmlJsonNode {
        type: 'element' | 'text';
        tag?: string;
        attributes?: Record<string, string>;
        text?: string;
        children?: HtmlJsonNode[];
    }
    interface ParsedHtmlJson {
        title: string | null;
        links: string[];
        headings: string[];
        rootNodes: HtmlJsonNode[];
    }
    type AnalizePageResult = Partial<JobDocument>;
    function ParseHtmlToJson(html: string): ParsedHtmlJson | null;
    function AnalizePage(data: {
        _id: string;
        url?: string;
        title?: string;
        sourceName?: string;
        html?: string;
    }, pageContains?: PageContainsRule[]): Promise<AnalizePageResult>;
}
