const BRIDGE_BASE_URL = 'http://localhost:3000';

type BridgeStatus = 'disconnected' | 'connecting' | 'connected';

type BrowserCommandAction = 'goToUrl' | 'grabHtmlBody' | 'clickElement' | 'getElementContent';

type BrowserCommandRequest = {
  action: BrowserCommandAction;
  url?: string;
  selector?: string;
  tabId?: number;
  waitForLoad?: boolean;
};

type BrowserCommandEnvelope = {
  type: 'browser:command';
  requestId: string;
  command: BrowserCommandRequest;
};

type BrowserCommandResult = {
  type: 'browser:result';
  requestId: string;
  action: BrowserCommandAction;
  ok: boolean;
  data?: unknown;
  error?: string;
};

let bridgeStatus: BridgeStatus = 'disconnected';
let lastError = '';
let pollingStarted = false;

function setStatus(next: BridgeStatus, error = ''): void {
  bridgeStatus = next;
  lastError = error;
}

function sendRuntimeMessage(message: unknown): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may be closed; ignore unhandled rejection.
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBrowserCommandEnvelope(message: unknown): message is BrowserCommandEnvelope {
  return (
    isRecord(message) &&
    message.type === 'browser:command' &&
    typeof message.requestId === 'string' &&
    isRecord(message.command) &&
    typeof message.command.action === 'string'
  );
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function postJson(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${BRIDGE_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed with ${response.status}`);
  }
}

async function getNextCommand(waitMs = 30000): Promise<BrowserCommandEnvelope | null> {
  const response = await fetch(`${BRIDGE_BASE_URL}/bridge/command/next?waitMs=${waitMs}`);

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GET /bridge/command/next failed with ${response.status}`);
  }

  const message = (await response.json()) as unknown;
  if (isBrowserCommandEnvelope(message)) {
    return message;
  }

  throw new Error('Server returned an invalid browser command envelope.');
}

async function getTargetTabId(requestedTabId?: number): Promise<number> {
  if (typeof requestedTabId === 'number') {
    return requestedTabId;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id === 'number') {
    return tab.id;
  }

  throw new Error('No active tab was available.');
}

function waitForTabLoad(tabId: number, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for tab ${tabId} to finish loading.`));
    }, timeoutMs);

    const listener = (updatedTabId: number, changeInfo: { status?: string }) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        cleanup();
        resolve();
      }
    };

    function cleanup(): void {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendDomCommand(tabId: number, requestId: string, command: BrowserCommandRequest): Promise<BrowserCommandResult> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'BROWSER_DOM_COMMAND',
    requestId,
    command
  });

  if (isRecord(response) && typeof response.requestId === 'string') {
    return response as BrowserCommandResult;
  }

  throw new Error('Content script returned an invalid response.');
}

async function executeBrowserCommand(envelope: BrowserCommandEnvelope): Promise<BrowserCommandResult> {
  const { command, requestId } = envelope;

  try {
    if (command.action === 'goToUrl') {
      if (!command.url) {
        throw new Error('The goToUrl command requires a url.');
      }

      const targetTabId = await getTargetTabId(command.tabId);
      const loadWait = command.waitForLoad !== false ? waitForTabLoad(targetTabId) : undefined;
      await chrome.tabs.update(targetTabId, { url: command.url });

      if (loadWait) {
        await loadWait;
      }

      return {
        type: 'browser:result',
        requestId,
        action: command.action,
        ok: true,
        data: {
          tabId: targetTabId,
          url: command.url
        }
      };
    }

    const targetTabId = await getTargetTabId(command.tabId);
    const contentResult = await sendDomCommand(targetTabId, requestId, command);

    return {
      type: 'browser:result',
      requestId,
      action: contentResult.action,
      ok: contentResult.ok,
      data: contentResult.data,
      error: contentResult.error
    };
  } catch (error) {
    return {
      type: 'browser:result',
      requestId,
      action: command.action,
      ok: false,
      error: error instanceof Error ? error.message : 'Command failed.'
    };
  }
}

async function reportGenericEvent(payload: unknown): Promise<void> {
  await postJson('/bridge/event', {
    source: 'extension',
    at: new Date().toISOString(),
    payload
  });
}

async function pollBridgeCommands(): Promise<void> {
  if (pollingStarted) {
    return;
  }

  pollingStarted = true;
  setStatus('connecting');
  sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });

  while (true) {
    try {
      const command = await getNextCommand();

      setStatus('connected');
      sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });

      if (!command) {
        continue;
      }

      const result = await executeBrowserCommand(command);

      await postJson('/bridge/result', result);
      sendRuntimeMessage({
        type: 'BRIDGE_MESSAGE',
        payload: result
      });
    } catch (error) {
      setStatus('disconnected', error instanceof Error ? error.message : 'Bridge polling failed.');
      sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void pollBridgeCommands();
});

chrome.runtime.onStartup.addListener(() => {
  void pollBridgeCommands();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'BRIDGE_GET_STATUS') {
    sendResponse({ status: bridgeStatus, lastError });
    return;
  }

  if (message?.type === 'BRIDGE_SEND') {
    void reportGenericEvent({
      source: 'popup',
      at: new Date().toISOString(),
      payload: message.payload ?? null
    })
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Bridge event failed.'
        });
      });

    return true;
  }
});

void pollBridgeCommands();

export {};
