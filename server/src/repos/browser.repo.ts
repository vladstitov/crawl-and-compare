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
  EventLog,
  ExtensionSocketResponse
} from '../../../shared/interfaces';

export namespace BrowserRepo {
  let extensionSocket: WebSocket | null = null;
  let webSocketServer: WebSocketServer | null = null;
  let lastHeartbeatAt: number | null = null;
  const commandResponses = new Map<string, ExtensionSocketResponse>();

  interface HeartbeatMessage {
    type: 'HEARTBEAT';
    timestamp: number;
  }

  function isEventLog(value: unknown): value is EventLog {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Partial<EventLog>;

    return payload.from === 'background' || payload.from === 'content_script';
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

  function makeResponseKey(_id: string, command: BrowserCommandName): string {
    return `${_id}:${command}`;
  }

  function isCommandName(value: unknown): value is BrowserCommandName {
    return value === 'NAVIGATE' || value === 'SCRAPE_PAGE' || value === 'CLICK_ELEMENT';
  }

  async function setJobFailed(_id: string, statusMassage: string): Promise<void> {
    await jobsCollection.updateAsync(
      { _id },
      {
        $set: {
          status: 'failed',
          statusMassage,
          updatedAt: new Date()
        }
      }
    );
  }

  async function waitForDownloadedStatus(_id: string, timeoutMs = 120000, pollMs = 1000): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const doc = await jobsCollection.findOneAsync({ _id });

      if (doc?.status === 'downloaded') {
        return;
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), pollMs);
      });
    }

    throw new Error(`Timed out waiting for command ${_id} to reach status downloaded.`);
  }

  export async function waitForCommandResponse(
    _id: string,
    command: BrowserCommandName,
    timeoutMs = 30000,
    pollMs = 100
  ): Promise<ExtensionSocketResponse | null> {
    const key = makeResponseKey(_id, command);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = commandResponses.get(key);
      if (response) {
        commandResponses.delete(key);
        return response;
      }

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), pollMs);
      });
    }

    return null;
  }

  export function sendNavigateCommand(command: NavigateCommand): BridgeResponse {
    return sendCommand(command);
  }

  export function sendScrapeCommand(command: ScrapePageCommand): BridgeResponse {
    return sendCommand(command);
  }

  export async function scrapeHtmlAndSave(_id: string, timeoutMs = 120000): Promise<BridgeResponse> {
    const job = await jobsCollection.findOneAsync({ _id });
    const currentUrl = typeof job?.url === 'string' ? job.url : 'unknown';

    const scrapeResponse = sendScrapeCommand({
      _id,
      command: 'SCRAPE_PAGE'
    });

    if (!scrapeResponse.ok) {
      await setJobFailed(_id, `current url ${currentUrl}. SCRAPE_PAGE command was not sent: ${scrapeResponse.message}`);
      return { ok: false, message: scrapeResponse.message };
    }

    const scrapeAck = await waitForCommandResponse(_id, 'SCRAPE_PAGE');
    if (!scrapeAck) {
      await setJobFailed(_id, `current url ${currentUrl}. SCRAPE_PAGE acknowledgement was not received from extension.`);
      return { ok: false, message: 'No SCRAPE_PAGE acknowledgement received from extension.' };
    }

    if (!scrapeAck.ok) {
      await setJobFailed(
        _id,
        `current url ${currentUrl}. SCRAPE_PAGE failed in extension: ${scrapeAck.error ?? 'Unknown error'}.`
      );
      return { ok: false, message: scrapeAck.error ?? 'SCRAPE_PAGE failed in extension.' };
    }

    try {
      await waitForDownloadedStatus(_id, timeoutMs);
      return { ok: true, message: 'Scrape completed and persisted in database.' };
    } catch {
      await jobsCollection.updateAsync(
        { _id },
        {
          $set: {
            status: 'timeout',
            statusMassage: `current url ${currentUrl}. send command SCRAPE_PAGE pageHtml not populated after ${Math.floor(timeoutMs / 1000)} sec`,
            updatedAt: new Date()
          }
        }
      );
      return { ok: false, message: `Timed out after ${timeoutMs}ms waiting for page data to be saved.` };
    }
  }

  export function goToUrl(_id: string, url: string): BridgeResponse {
    return sendCommand({
      _id,
      command: 'NAVIGATE',
      url,
      waitForLoad: true
    });
  }

  export function grabHtmlBody(_id: string): BridgeResponse {
    return sendCommand({
      _id,
      command: 'SCRAPE_PAGE'
    });
  }

  export function clickElement(_id: string, selector: string): BridgeResponse {
    return sendCommand({
      _id,
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
              statusMassage: `current url ${analysis.url ?? 'unknown'}. SCRAPE_PAGE succeeded and pageHtml populated.`,
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
            const payload = JSON.parse(message.toString()) as Record<string, unknown>;

            if (isHeartbeatMessage(payload)) {
              lastHeartbeatAt = payload.timestamp;
              return;
            }

            if (isEventLog(payload)) {
              console.log('Extension response:', payload);
              return;
            }

            const _id = typeof payload._id === 'string' ? payload._id : undefined;
            const command = isCommandName(payload.command) ? payload.command : undefined;
            const ok = typeof payload.ok === 'boolean' ? payload.ok : undefined;

            if (_id && command && typeof ok === 'boolean') {
              commandResponses.set(
                makeResponseKey(_id, command),
                {
                  ok,
                  _id,
                  command,
                  data: payload.data,
                  error: typeof payload.error === 'string' ? payload.error : undefined
                }
              );
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
