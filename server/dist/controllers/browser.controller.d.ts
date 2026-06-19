import { Express } from 'express';
export declare namespace BrowserController {
    type BridgePayload = {
        [key: string]: unknown;
    };
    type BridgeResponse = {
        ok: boolean;
        message: string;
        data?: unknown;
    };
    function health(): BridgeResponse;
    function StartSocketServer(app: Express, port: number): void;
}
