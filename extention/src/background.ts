const API_BASE_URL = 'http://localhost:3000';
const BRIDGE_WS_URL = 'ws://localhost:8080';

type BridgeStatus = 'disconnected' | 'connecting' | 'connected';

type BrowserSocketCommandName = 'NAVIGATE' | 'SCRAPE_PAGE' | 'CLICK_ELEMENT';

type BrowserCommandAction = 'grabHtmlBody' | 'clickElement' | 'getElementContent';

type BrowserSocketCommand = {
  command: BrowserSocketCommandName;
  url?: string;
  selector?: string;
  waitForLoad?: boolean;
};

type BrowserCommandRequest = {
  action: BrowserCommandAction;
  selector?: string;
};

type BrowserUploadPayload = {
  url: string;
  html: string;
};

type ExtensionSocketResponse = {
  ok: boolean;
  command?: BrowserSocketCommandName;
  data?: unknown;
  error?: string;
};

let bridgeStatus: BridgeStatus = 'disconnected';
let lastError = '';
let bridgeSocket: WebSocket | null = null;
let reconnectTimer: number | null = null;

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

function isBrowserSocketCommand(message: unknown): message is BrowserSocketCommand {
  return (
    isRecord(message) &&
    typeof message.command === 'string' &&
    ['NAVIGATE', 'SCRAPE_PAGE', 'CLICK_ELEMENT'].includes(message.command)
  );
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function postJson(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

async function getTargetTabId(): Promise<number> {
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

async function sendDomCommand(
  tabId: number,
  requestId: string,
  command: BrowserCommandRequest
): Promise<ExtensionSocketResponse & { requestId: string; action: BrowserCommandAction }> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'BROWSER_DOM_COMMAND',
    requestId,
    command
  });

  if (isRecord(response) && typeof response.requestId === 'string') {
    return response as ExtensionSocketResponse & { requestId: string; action: BrowserCommandAction };
  }

  throw new Error('Content script returned an invalid response.');
}

function sendSocketPayload(payload: unknown): void {
  if (!bridgeSocket || bridgeSocket.readyState !== WebSocket.OPEN) {
    throw new Error('No WebSocket connection to the server.');
  }

  bridgeSocket.send(JSON.stringify(payload));
}

async function uploadHtml(payload: BrowserUploadPayload): Promise<void> {
  await postJson('/api/upload-html', payload);
}

async function scrapeActiveTab(tabId: number): Promise<ExtensionSocketResponse> {
  const result = await sendDomCommand(tabId, createRequestId(), { action: 'grabHtmlBody' });

  if (!result.ok) {
    throw new Error(result.error ?? 'Failed to capture HTML.');
  }

  if (!isRecord(result.data) || typeof result.data.url !== 'string' || typeof result.data.html !== 'string') {
    throw new Error('Content script returned an invalid HTML payload.');
  }

  await uploadHtml({
    url: result.data.url,
    html: result.data.html
  });

  return {
    ok: true,
    command: 'SCRAPE_PAGE',
    data: {
      url: result.data.url,
      title: typeof result.data.title === 'string' ? result.data.title : ''
    }
  };
}

async function executeBrowserCommand(command: BrowserSocketCommand): Promise<ExtensionSocketResponse> {
  try {
    if (command.command === 'NAVIGATE') {
      if (!command.url) {
        throw new Error('The NAVIGATE command requires a url.');
      }

      const targetTabId = await getTargetTabId();
      const loadWait = command.waitForLoad !== false ? waitForTabLoad(targetTabId) : undefined;
      await chrome.tabs.update(targetTabId, { url: command.url });

      if (loadWait) {
        await loadWait;
      }

      return {
        ok: true,
        command: command.command,
        data: {
          tabId: targetTabId,
          url: command.url
        }
      };
    }

    const targetTabId = await getTargetTabId();

    if (command.command === 'SCRAPE_PAGE') {
      return await scrapeActiveTab(targetTabId);
    }

    if (!command.selector) {
      throw new Error('The CLICK_ELEMENT command requires a selector.');
    }

    const contentResult = await sendDomCommand(targetTabId, createRequestId(), {
      action: 'clickElement',
      selector: command.selector
    });

    if (!contentResult.ok) {
      throw new Error(contentResult.error ?? 'The click command failed.');
    }

    if (command.waitForLoad) {
      await waitForTabLoad(targetTabId);
    }

    return {
      ok: true,
      command: command.command,
      data: contentResult.data
    };
  } catch (error) {
    return {
      ok: false,
      command: command.command,
      error: error instanceof Error ? error.message : 'Command failed.'
    };
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer !== null) {
    return;
  }

  reconnectTimer = self.setTimeout(() => {
    reconnectTimer = null;
    connectBridge();
  }, 1500);
}

function connectBridge(): void {
  if (bridgeSocket && (bridgeSocket.readyState === WebSocket.OPEN || bridgeSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus('connecting');
  sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });

  const socket = new WebSocket(BRIDGE_WS_URL);
  bridgeSocket = socket;

  socket.addEventListener('open', () => {
    setStatus('connected');
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
  });

  socket.addEventListener('message', (event) => {
    try {
      const parsed = JSON.parse(typeof event.data === 'string' ? event.data : '');
      if (!isBrowserSocketCommand(parsed)) {
        throw new Error('Server sent an invalid browser command.');
      }

      void executeBrowserCommand(parsed)
        .then((result) => {
          sendSocketPayload({
            source: 'extension',
            at: new Date().toISOString(),
            ...result
          });
          sendRuntimeMessage({ type: 'BRIDGE_MESSAGE', payload: result });
        })
        .catch((error) => {
          const failure = {
            ok: false,
            command: parsed.command,
            error: error instanceof Error ? error.message : 'Command failed.'
          } satisfies ExtensionSocketResponse;

          sendSocketPayload({
            source: 'extension',
            at: new Date().toISOString(),
            ...failure
          });
          sendRuntimeMessage({ type: 'BRIDGE_MESSAGE', payload: failure });
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid WebSocket message.';
      sendRuntimeMessage({ type: 'BRIDGE_MESSAGE', payload: message });
    }
  });

  socket.addEventListener('close', () => {
    if (bridgeSocket === socket) {
      bridgeSocket = null;
    }

    setStatus('disconnected', 'WebSocket disconnected.');
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    setStatus('disconnected', 'WebSocket connection failed.');
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
  });
}

function postPopupEvent(payload: unknown): ExtensionSocketResponse {
  try {
    sendSocketPayload({
      source: 'popup',
      at: new Date().toISOString(),
      payload
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to send popup event.'
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  connectBridge();
});

chrome.runtime.onStartup.addListener(() => {
  connectBridge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'BRIDGE_GET_STATUS') {
    sendResponse({ status: bridgeStatus, lastError });
    return;
  }

  if (message?.type === 'BRIDGE_SEND') {
    sendResponse(postPopupEvent(message.payload ?? null));
    return;
  }
});

connectBridge();

export {};
