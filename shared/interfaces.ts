export interface NavigateCommand {
  id: string;
  command: 'NAVIGATE';
  url: string;
  waitForLoad?: boolean;
}

export interface ScrapePageCommand {
  id: string;
  command: 'SCRAPE_PAGE';
}

export interface ClickElementCommand {
  id: string;
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
  id?: string;
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
