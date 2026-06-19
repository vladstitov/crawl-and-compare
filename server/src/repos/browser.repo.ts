import { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';

export namespace BrowserRepo {
  export type BridgePayload = {
    [key: string]: unknown;
  };

  export type BridgeResponse = {
    ok: boolean;
    message: string;
    data?: unknown;
  };

  export function health(): BridgeResponse {
    return {
      ok: true,
      message: 'Browser repo namespace is ready.'
    };
  }

  function sendJson(socket: WebSocket, data: unknown): void {
    socket.send(JSON.stringify(data));
  }

  function broadcastJson(bridge: WebSocketServer, data: unknown): void {
    const payload = JSON.stringify(data);

    bridge.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  export function StartSocketServer(app: Express, port: number): void {
    const server = createServer(app);
    const bridge = new WebSocketServer({ server, path: '/bridge' });

    bridge.on('connection', (socket: WebSocket) => {
      sendJson(socket, {
        type: 'bridge:welcome',
        at: new Date().toISOString(),
        clients: bridge.clients.size
      });

      socket.on('message', (raw: RawData) => {
        const text = raw.toString();

        console.log('Received message from bridge client:', text);

        let message: BridgePayload | unknown;
        try {
          message = JSON.parse(text) as BridgePayload;
        } catch {
          sendJson(socket, {
            type: 'bridge:error',
            error: 'Invalid JSON message received.'
          });
          return;
        }

        broadcastJson(bridge, {
          type: 'bridge:message',
          at: new Date().toISOString(),
          payload: message
        });
      });
    });

    app.post('/bridge/publish', (req: Request, res: Response) => {
      broadcastJson(bridge, {
        type: 'bridge:message',
        at: new Date().toISOString(),
        payload: req.body
      });

      res.json({ ok: true, recipients: bridge.clients.size });
    });

    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`Bridge websocket is running on ws://localhost:${port}/bridge`);
    });
  }
}
