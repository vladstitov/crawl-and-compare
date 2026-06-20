export interface NavigateCommand {
    _id: string;
    command: 'NAVIGATE';
    url: string;
    waitForLoad?: boolean;
}
export interface ScrapePageCommand {
    _id: string;
    command: 'SCRAPE_PAGE';
}
export interface ClickElementCommand {
    _id: string;
    command: 'CLICK_ELEMENT';
    selector: string;
    waitForLoad?: boolean;
}
export interface PingFromBackgroundCommand {
    command: 'PING_FROM_BACKGROUND';
}
export type ExtensionCommand = NavigateCommand | ScrapePageCommand | ClickElementCommand;
export type BrowserCommandName = ExtensionCommand['command'];
export type ContentScriptCommand = ScrapePageCommand | ClickElementCommand | PingFromBackgroundCommand;
export interface ExtensionSocketResponse {
    ok: boolean;
    _id?: string;
    command?: ExtensionCommand['command'];
    data?: unknown;
    error?: string;
}
export interface BridgeResponse {
    ok: boolean;
    message: string;
    data?: unknown;
}
export interface UploadedHtmlPayload {
    url: string;
    html: string;
}
export interface EventLog {
    from: 'background' | 'content_script';
    message: string;
    timestamp: number;
}
