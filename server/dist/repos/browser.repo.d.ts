import { Express } from 'express';
export declare namespace BrowserRepo {
    type BrowserCommandAction = 'goToUrl' | 'grabHtmlBody' | 'clickElement' | 'getElementContent';
    type BrowserCommandRequest = {
        action: BrowserCommandAction;
        url?: string;
        selector?: string;
        tabId?: number;
        waitForLoad?: boolean;
    };
    type BridgePayload = {
        [key: string]: unknown;
    };
    type BridgeCommandEnvelope = {
        type: 'browser:command';
        requestId: string;
        command: BrowserCommandRequest;
    };
    type BridgeCommandResult = {
        type: 'browser:result';
        requestId: string;
        action: BrowserCommandAction;
        ok: boolean;
        data?: unknown;
        error?: string;
    };
    type BridgeEventEnvelope = {
        type: 'bridge:event';
        at: string;
        payload: unknown;
    };
    type BridgeResponse = {
        ok: boolean;
        message: string;
        data?: unknown;
    };
    function health(): BridgeResponse;
    function StartBridgeServer(app: Express, port: number): void;
}
