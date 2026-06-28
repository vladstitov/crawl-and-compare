import { Express } from 'express';
import type { BrowserCommandName, BridgeResponse, NavigateCommand, ScrapePageCommand, ExtensionSocketResponse } from '../../../shared/interfaces';
export declare namespace BrowserRepo {
    function health(): BridgeResponse;
    function waitForCommandResponse(_id: string, command: BrowserCommandName, timeoutMs?: number, pollMs?: number): Promise<ExtensionSocketResponse | null>;
    function sendNavigateCommand(command: NavigateCommand): BridgeResponse;
    function sendScrapeCommand(command: ScrapePageCommand): BridgeResponse;
    function scrapeHtmlAndSave(_id: string, timeoutMs?: number): Promise<BridgeResponse>;
    function goToUrl(_id: string, url: string): BridgeResponse;
    function grabHtmlBody(_id: string): BridgeResponse;
    function clickElement(_id: string, selector: string): BridgeResponse;
    function getElementContent(selector: string): BridgeResponse;
    function StartBridgeServer(app: Express, PORT: number): void;
}
