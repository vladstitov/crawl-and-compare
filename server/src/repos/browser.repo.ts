import { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';

export namespace BrowserRepo {
  export type BrowserCommandName = 'NAVIGATE' | 'SCRAPE_PAGE' | 'CLICK_ELEMENT';

  export type BrowserCommand = {
    command: BrowserCommandName;
    url?: string;
    selector?: string;
    waitForLoad?: boolean;
  };

  export type ExtensionResponse = {
    ok: boolean;
    command?: BrowserCommandName;
    error?: string;
    data?: unknown;
  };

  export type BridgeResponse = {
    ok: boolean;
    message: string;
    data?: unknown;
  };

  type UploadedHtmlPayload = {
    url: string;
    html: string;
  };

  let extensionSocket: WebSocket | null = null;
  let webSocketServer: WebSocketServer | null = null;

  export function health(): BridgeResponse {
    return {
      ok: true,
      message: extensionSocket?.readyState === WebSocket.OPEN ? 'Extension connected.' : 'Waiting for extension connection.'
    };
  }

  function sendCommand(command: BrowserCommand): BridgeResponse {
    if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
      return {
        ok: false,
        message: 'No extension connected via WebSocket.'
      };
    }

    extensionSocket.send(JSON.stringify(command));
    return {
      ok: true,
      message: `Sent ${command.command} command to extension.`
    };
  }

  export function goToUrl(url: string): BridgeResponse {
    return sendCommand({ command: 'NAVIGATE', url, waitForLoad: true });
  }

  export function grabHtmlBody(): BridgeResponse {
    return sendCommand({ command: 'SCRAPE_PAGE' });
  }

  export function clickElement(selector: string): BridgeResponse {
    return sendCommand({ command: 'CLICK_ELEMENT', selector });
  }

  export function getElementContent(selector: string): BridgeResponse {
    return {
      ok: false,
      message: `Unsupported simplified command: getElementContent for selector ${selector}.`
    };
  }


  function analyzeAndProceed(url: string, _html: string): void {
    if (url.includes('/in/')) {
      console.log('Target profile HTML received. Ready for analysis.');
      return;
    }

    const response = sendCommand({
      command: 'CLICK_ELEMENT',
      selector: "button[aria-label*='About']"
    });

    if (!response.ok) {
      console.error(response.message);
    }
  }

  export function StartBridgeServer(app: Express, PORT: number): void {
    app.post('/api/upload-html', (req: Request, res: Response) => {
      const { url, html } = req.body as UploadedHtmlPayload;

      console.log(`Received HTML from: ${url} (${(html.length / 1024).toFixed(2)} KB)`);
      analyzeAndProceed(url, html);
      res.json({ status: 'processing' });
    });
  console.log(`HTML upload endpoint on http://localhost:${PORT}/api/upload-html`);
    if (!webSocketServer) {
      webSocketServer = new WebSocketServer({ port: 8080 });
        console.log('WebSocket command bridge  on ws://localhost:8080');

      webSocketServer.on('connection', (socket) => {
        console.log('Extension connected via WebSocket.');
        extensionSocket = socket;

        socket.on('message', (message) => {
          try {
            const response = JSON.parse(message.toString()) as ExtensionResponse;
            console.log('Extension response:', response);
          } catch {
            console.log('Extension sent a non-JSON message:', message.toString());
          }
        });

        socket.on('close', () => {
          if (extensionSocket === socket) {
            extensionSocket = null;
          }

          console.log('Extension WebSocket disconnected.');
        });
      });
    }
  }
}
