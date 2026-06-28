import { ScrapePageCommand } from '../../../shared/interfaces';
export declare namespace WebCrawlerController {
    function Start(): Promise<{
        ok: boolean;
        message: string;
        status: {
            isCrawling: boolean;
            currentTask: string;
            current_id: string;
        };
        _id?: undefined;
    } | {
        ok: boolean;
        message: string;
        status?: undefined;
        _id?: undefined;
    } | {
        ok: boolean;
        message: string;
        _id: string;
        status?: undefined;
    }>;
    function currentStatus(): {
        isCrawling: boolean;
        currentTask: string;
        current_id: string;
    };
    function Stop(): {
        isCrawling: boolean;
        currentTask: string;
        current_id: string;
    };
    function ProcessPage(pageData: ScrapePageCommand): Promise<Partial<import("../core/database").JobDocument>>;
}
