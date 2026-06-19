import { Express, Request, Response } from 'express';

export namespace BrowserRepo {
  export type BrowserCommandAction =
    | 'goToUrl'
    | 'grabHtmlBody'
    | 'clickElement'
    | 'getElementContent';

  export type BrowserCommandRequest = {
    action: BrowserCommandAction;
    url?: string;
    selector?: string;
    tabId?: number;
    waitForLoad?: boolean;
  };

  export type BridgePayload = {
    [key: string]: unknown;
  };

  export type BridgeCommandEnvelope = {
    type: 'browser:command';
    requestId: string;
    command: BrowserCommandRequest;
  };

  export type BridgeCommandResult = {
    type: 'browser:result';
    requestId: string;
    action: BrowserCommandAction;
    ok: boolean;
    data?: unknown;
    error?: string;
  };

  export type BridgeEventEnvelope = {
    type: 'bridge:event';
    at: string;
    payload: unknown;
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

  function createRequestId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  export function StartBridgeServer(app: Express, port: number): void {
    const pendingCommands: BridgeCommandEnvelope[] = [];
    const commandWaiters: Array<{
      resolve: (value: BridgeCommandEnvelope | null) => void;
      timer: ReturnType<typeof setTimeout>;
    }> = [];
    const pendingResults = new Map<
      string,
      {
        resolve: (value: BridgeCommandResult) => void;
        reject: (reason?: unknown) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >();

    function enqueueCommand(command: BrowserCommandRequest): BridgeCommandEnvelope {
      const envelope: BridgeCommandEnvelope = {
        type: 'browser:command',
        requestId: createRequestId(),
        command
      };

      const waitingCommand = commandWaiters.shift();
      if (waitingCommand) {
        clearTimeout(waitingCommand.timer);
        waitingCommand.resolve(envelope);
        return envelope;
      }

      pendingCommands.push(envelope);
      return envelope;
    }

    function waitForNextCommand(waitMs: number): Promise<BridgeCommandEnvelope | null> {
      const queuedCommand = pendingCommands.shift();
      if (queuedCommand) {
        return Promise.resolve(queuedCommand);
      }

      return new Promise<BridgeCommandEnvelope | null>((resolve) => {
        const timer = setTimeout(() => {
          const index = commandWaiters.findIndex((waiter) => waiter.timer === timer);
          if (index >= 0) {
            commandWaiters.splice(index, 1);
          }

          resolve(null);
        }, waitMs);

        commandWaiters.push({ resolve, timer });
      });
    }

    function waitForResult(requestId: string, timeoutMs = 30000): Promise<BridgeCommandResult> {
      return new Promise<BridgeCommandResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingResults.delete(requestId);
          reject(new Error(`Timed out waiting for ${requestId} to finish.`));
        }, timeoutMs);

        pendingResults.set(requestId, { resolve, reject, timer });
      });
    }

    function resolveResult(result: BridgeCommandResult): void {
      const pending = pendingResults.get(result.requestId);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timer);
      pendingResults.delete(result.requestId);
      pending.resolve(result);
    }

    app.post('/bridge/command', async (req: Request, res: Response) => {
      const command = req.body as BrowserCommandRequest;

      if (!command?.action) {
        res.status(400).json({ ok: false, message: 'Missing command action.' });
        return;
      }

      const envelope = enqueueCommand(command);
      const resultPromise = waitForResult(envelope.requestId);

      try {
        const result = await resultPromise;
        res.json(result);
      } catch (error) {
        res.status(504).json({
          ok: false,
          message: error instanceof Error ? error.message : 'Command timed out.'
        });
      }
    });

    app.get('/bridge/command/next', (req: Request, res: Response) => {
      const waitMs = Number(req.query.waitMs ?? 30000);

      waitForNextCommand(Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 30000)
        .then((command) => {
          if (!command) {
            res.status(204).end();
            return;
          }

          res.json(command);
        })
        .catch((error) => {
          res.status(500).json({
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to fetch next command.'
          });
        });
    });

    app.post('/bridge/result', (req: Request, res: Response) => {
      const result = req.body as BridgeCommandResult;

      if (!result?.requestId || !result.action) {
        res.status(400).json({ ok: false, message: 'Missing command result fields.' });
        return;
      }

      resolveResult(result);
      res.json({ ok: true });
    });

    app.post('/bridge/event', (req: Request, res: Response) => {
      const event = {
        type: 'bridge:event',
        at: new Date().toISOString(),
        payload: req.body
      } satisfies BridgeEventEnvelope;

      console.log('Received bridge event:', event);
      res.json({ ok: true });
    });

    app.post('/bridge/publish', (req: Request, res: Response) => {
      const event = {
        type: 'bridge:event',
        at: new Date().toISOString(),
        payload: req.body
      } satisfies BridgeEventEnvelope;

      console.log('Received bridge publish:', event);
      res.json({ ok: true });
    });

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`Bridge HTTP endpoints are running on http://localhost:${port}/bridge`);
    });
  }
}
