export interface NavigateCommand {
    id: string;
    command: 'NAVIGATE';
    url?: string;
    waitForLoad?: boolean;
    result?: string;
}
export interface ScrapePageCommand {
    id: string;
    command: 'SCRAPE_PAGE';
    data: any;
    html?: string;
    url?: string;
}
export interface ClickElementCommand {
    id: string;
    command: 'CLICK_ELEMENT';
    data: any;
    selector?: string;
    result?: string;
}
export interface PingFromBackgroundCommand {
    command: 'PING_FROM_BACKGROUND';
}
export type ExtensionCommand = NavigateCommand | ScrapePageCommand | ClickElementCommand;
export type ContentScriptCommand = ScrapePageCommand | ClickElementCommand | PingFromBackgroundCommand;
export interface ExtensionSocketResponse {
    ok: boolean;
    id?: string;
    command?: ExtensionCommand['command'];
    data?: unknown;
    error?: string;
}
export interface PageStatus {
    url: string;
    status: 'pending' | 'loading' | 'completed' | 'failed' | 'network-progress';
}
export {};
