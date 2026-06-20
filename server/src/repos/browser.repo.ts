import { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { AnalizerRepo } from './analizer.repo';
import { jobsCollection } from '../core/database';
import type {
  BrowserCommandName,
  BridgeResponse,
  NavigateCommand,
  ScrapePageCommand,
  ClickElementCommand,
  EventLog
} from '../../../shared/interfaces';

export namespace BrowserRepo {
  let extensionSocket: WebSocket | null = null;
  let webSocketServer: WebSocketServer | null = null;
  let lastHeartbeatAt: number | null = null;

  interface HeartbeatMessage {
    type: 'HEARTBEAT';
    timestamp: number;
  }

  function isEventLog(value: EventLog): value is EventLog {
    if (!value || typeof value !== 'object') {
      return false;
    }


    return (
      (value.from === 'background' || value.from === 'content_script')

    );
  }

  function isHeartbeatMessage(value: unknown): value is HeartbeatMessage {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Record<string, unknown>;
    return payload.type === 'HEARTBEAT' && typeof payload.timestamp === 'number';
  }

  export function health(): BridgeResponse {
    return {
      ok: true,
      message: extensionSocket?.readyState === WebSocket.OPEN ? 'Extension connected.' : 'Waiting for extension connection.'
    };
  }

  function sendCommand(command: NavigateCommand | ScrapePageCommand | ClickElementCommand): BridgeResponse {
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

  export function sendNavigateCommand(command: NavigateCommand): BridgeResponse {
    return sendCommand(command);
  }

  export function sendScrapeCommand(command: ScrapePageCommand): BridgeResponse {
    return sendCommand(command);
  }

  export function goToUrl(url: string): BridgeResponse {
    return sendCommand({
      _id: crypto.randomUUID(),
      command: 'NAVIGATE',
      url,
      waitForLoad: true
    });
  }

  export function grabHtmlBody(): BridgeResponse {
    return sendCommand({
      _id: crypto.randomUUID(),
      command: 'SCRAPE_PAGE'
    });
  }

  export function clickElement(selector: string): BridgeResponse {
    return sendCommand({
      _id: crypto.randomUUID(),
      command: 'CLICK_ELEMENT',
      selector
    });
  }

  export function getElementContent(selector: string): BridgeResponse {
    return {
      ok: false,
      message: `Unsupported simplified command: getElementContent for selector ${selector}.`
    };
  }

  export function StartBridgeServer(app: Express, PORT: number): void {
    app.post('/api/upload-html', async (req: Request, res: Response) => {
      const data: ScrapePageCommand = req.body;

      const analysis = await AnalizerRepo.AnalizePage(data);

      if (analysis._id) {
        await jobsCollection.updateAsync(
          { _id: analysis._id },
          {
            $set: {
              ...analysis,
              status: 'downloaded',
              updatedAt: new Date()
            }
          }
        );
      }

      res.json({ status: 'PASSED', _id: data._id });
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
            const payload: any = JSON.parse(message.toString()) as Record<string, unknown>;

            if (isHeartbeatMessage(payload)) {
              lastHeartbeatAt = payload.timestamp;
              return;
            }



            console.log('Extension response:', payload);
          } catch {
            console.log('Extension sent a non-JSON message:', message.toString());
          }
        });

        socket.on('close', (code, reasonBuffer) => {
          if (extensionSocket === socket) {
            extensionSocket = null;
          }

          const reason = reasonBuffer?.toString() || '';
          console.log(`Extension WebSocket disconnected (code ${code})${reason ? `: ${reason}` : '.'}`);
        });

        socket.on('error', (error) => {
          console.error('Extension WebSocket error:', error.message);
        });
      });

      webSocketServer.on('error', (error) => {
        console.error('WebSocket bridge server error:', error.message);
      });
    }
  }
}
