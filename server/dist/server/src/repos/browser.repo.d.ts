import { Express } from 'express';
import type { BridgeResponse } from '../../../shared/interfaces';
export declare namespace BrowserRepo {
    function health(): BridgeResponse;
    function goToUrl(url: string): BridgeResponse;
    function grabHtmlBody(): BridgeResponse;
    function clickElement(selector: string): BridgeResponse;
    function getElementContent(selector: string): BridgeResponse;
    function StartBridgeServer(app: Express, PORT: number): void;
}
