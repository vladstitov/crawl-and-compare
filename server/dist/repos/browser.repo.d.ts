import { Express } from 'express';
export declare namespace BrowserRepo {
    type BrowserCommandName = 'NAVIGATE' | 'SCRAPE_PAGE' | 'CLICK_ELEMENT';
    type BrowserCommand = {
        command: BrowserCommandName;
        url?: string;
        selector?: string;
        waitForLoad?: boolean;
    };
    type ExtensionResponse = {
        ok: boolean;
        command?: BrowserCommandName;
        error?: string;
        data?: unknown;
    };
    type BridgeResponse = {
        ok: boolean;
        message: string;
        data?: unknown;
    };
    function health(): BridgeResponse;
    function goToUrl(url: string): BridgeResponse;
    function grabHtmlBody(): BridgeResponse;
    function clickElement(selector: string): BridgeResponse;
    function getElementContent(selector: string): BridgeResponse;
    function logBridgeStatus(port: number): void;
    function StartBridgeServer(app: Express): void;
}
