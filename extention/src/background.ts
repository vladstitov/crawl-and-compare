import type {
  ClickElementCommand,
  ContentScriptCommand,
  EventLog,
  ExtensionCommand,
  ExtensionSocketResponse,
  NavigateCommand,
  ScrapePageCommand
} from '../../shared/interfaces';

const API_BASE_URL = 'http://localhost:3000';
const BRIDGE_WS_URL = 'ws://localhost:8080';
const HEARTBEAT_INTERVAL_MS = 15000;

type BridgeStatus = 'disconnected' | 'connecting' | 'connected';

export interface PageStatus {
  url: string;
  status: 'pending' | 'loading' | 'completed' | 'failed' | 'network-progress';
}




let bridgeStatus: BridgeStatus = 'disconnected';
let lastError = '';
let bridgeSocket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;

function setStatus(next: BridgeStatus, error = ''): void {
  bridgeStatus = next;
  lastError = error;
}

function sendRuntimeMessage(message: unknown): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may be closed; ignore unhandled rejection.
  });
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

async function sendContentCommand(tabId: number, command: ContentScriptCommand): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, command);
}

function sendSocketPayload(payload: any): void {
  if (!bridgeSocket || bridgeSocket.readyState !== WebSocket.OPEN) {
    throw new Error('No WebSocket connection to the server.');
  }

  bridgeSocket.send(JSON.stringify(payload));
}

function sendEventLog(log: EventLog): void {
  try {
    sendSocketPayload(log);
  } catch {
    // Event logging should never interrupt command handling.
  }
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(): void {
  stopHeartbeat();

  heartbeatTimer = self.setInterval(() => {
    try {
      sendSocketPayload({
        type: 'HEARTBEAT',
        timestamp: Date.now()
      });
    } catch {
      // Ignore failed heartbeats; reconnect flow handles broken sockets.
    }
  }, HEARTBEAT_INTERVAL_MS);
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
    startHeartbeat();
  });

  socket.addEventListener('message', async (event: MessageEvent<string>) => {
    const callBackToSocket = (result: ExtensionSocketResponse): void => {
      sendSocketPayload({
        source: 'extension',
        at: new Date().toISOString(),
        ...result
      });
      sendRuntimeMessage({ type: 'BRIDGE_MESSAGE', payload: result });
    };

    let parsed: Record<string, unknown> | undefined;

    try {
      parsed = JSON.parse(typeof event.data === 'string' ? event.data : '') as Record<string, unknown>;

      if (typeof parsed.command === 'string') {
        if (parsed.command === 'NAVIGATE' || parsed.command === 'SCRAPE_PAGE' || parsed.command === 'CLICK_ELEMENT') {
          sendEventLog({
            from: 'background',
            message: parsed.command,
            timestamp: Date.now()
          });
        }
      }

      switch (parsed.command) {
        case 'NAVIGATE': {
          if (typeof parsed.id !== 'string') {
            throw new Error('The NAVIGATE command requires an id.');
          }

          if (typeof parsed.url !== 'string') {
            throw new Error('The NAVIGATE command requires a url.');
          }

          const targetTabId = await getTargetTabId();
          const waitForLoad = typeof parsed.waitForLoad === 'boolean' ? parsed.waitForLoad : true;
          const loadWait = waitForLoad ? waitForTabLoad(targetTabId) : undefined;

          await chrome.tabs.update(targetTabId, { url: parsed.url });
          if (loadWait) {
            await loadWait;
          }

          callBackToSocket({
            ok: true,
            id: parsed.id,
            command: 'NAVIGATE',
            data: {
              tabId: targetTabId,
              url: parsed.url
            }
          });
          break;
        }

        case 'SCRAPE_PAGE': {
          const targetTabId = await getTargetTabId();
          if (typeof parsed.id !== 'string') {
            throw new Error('The SCRAPE_PAGE command requires an id.');
          }

          const contentResult = await sendContentCommand(targetTabId, {
            id: parsed.id,
            command: 'SCRAPE_PAGE'
          });

          callBackToSocket({
            ok: true,
            id: parsed.id,
            command: 'SCRAPE_PAGE',
            data: contentResult
          });
          break;
        }

        case 'CLICK_ELEMENT': {
          if (typeof parsed.id !== 'string') {
            throw new Error('The CLICK_ELEMENT command requires an id.');
          }

          if (typeof parsed.selector !== 'string' || !parsed.selector) {
            throw new Error('The CLICK_ELEMENT command requires a selector.');
          }

          const targetTabId = await getTargetTabId();
          const contentResult = await sendContentCommand(targetTabId, {
            id: parsed.id,
            command: 'CLICK_ELEMENT',
            selector: parsed.selector
          });

          const waitForLoad = typeof parsed.waitForLoad === 'boolean' ? parsed.waitForLoad : false;
          if (waitForLoad) {
            await waitForTabLoad(targetTabId);
          }

          callBackToSocket({
            ok: true,
            id: parsed.id,
            command: 'CLICK_ELEMENT',
            data: contentResult
          });
          break;
        }

        default:
          throw new Error('Server sent an invalid browser command.');
      }
    } catch (error) {
      const command = typeof parsed?.command === 'string' ? (parsed.command as ExtensionCommand['command']) : undefined;
      const id = typeof parsed?.id === 'string' ? parsed.id : undefined;

      if (command === 'NAVIGATE' || command === 'SCRAPE_PAGE' || command === 'CLICK_ELEMENT') {
        callBackToSocket({
          ok: false,
          id,
          command,
          error: error instanceof Error ? error.message : 'Command failed.'
        });
      }

      const message = error instanceof Error ? error.message : 'Invalid WebSocket message.';
      sendRuntimeMessage({ type: 'BRIDGE_MESSAGE', payload: message });
    }
  });

  socket.addEventListener('close', (event) => {
    stopHeartbeat();

    if (bridgeSocket === socket) {
      bridgeSocket = null;
    }

    const reason = event.reason ? ` (${event.reason})` : '';
    const message = `WebSocket disconnected (code ${event.code}).${reason}`;
    setStatus('disconnected', message);
    console.log(message);
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
    scheduleReconnect();
  });

  socket.addEventListener('error', (event) => {
    stopHeartbeat();
    setStatus('disconnected', 'WebSocket connection failed.');
    console.error('Bridge socket error:', event);
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
  });
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

  if (message?.type === 'EVENT_LOG') {
    const payload = message.payload as EventLog | undefined;

    if (
      payload &&  (payload.from === 'background' || payload.from === 'content_script') 
    ) {
      sendEventLog(payload);
    }
  }
});

connectBridge();

export {};
