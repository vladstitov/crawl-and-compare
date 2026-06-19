const BRIDGE_URL = 'ws://localhost:3000/bridge';

type BridgeStatus = 'disconnected' | 'connecting' | 'connected';

let socket: WebSocket | null = null;
let bridgeStatus: BridgeStatus = 'disconnected';
let lastError = '';

function setStatus(next: BridgeStatus, error = ''): void {
  bridgeStatus = next;
  lastError = error;
}

function sendRuntimeMessage(message: unknown): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup may be closed; ignore unhandled rejection.
  });
}

function connectBridge(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus('connecting');
  socket = new WebSocket(BRIDGE_URL);

  socket.addEventListener('open', () => {
    setStatus('connected');
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
    socket?.send(
      JSON.stringify({
        source: 'extension',
        event: 'connected',
        at: new Date().toISOString()
      })
    );
  });

  socket.addEventListener('message', (event) => {
    sendRuntimeMessage({
      type: 'BRIDGE_MESSAGE',
      payload: event.data
    });
  });

  socket.addEventListener('close', () => {
    setStatus('disconnected');
    sendRuntimeMessage({ type: 'BRIDGE_STATUS', status: bridgeStatus, lastError });
    setTimeout(connectBridge, 1500);
  });

  socket.addEventListener('error', () => {
    setStatus('disconnected', 'Could not connect to ws://localhost:3000/bridge');
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

  if (message?.type === 'BRIDGE_SEND') {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      sendResponse({ ok: false, error: 'Bridge is not connected.' });
      return;
    }

    socket.send(
      JSON.stringify({
        source: 'popup',
        at: new Date().toISOString(),
        payload: message.payload ?? null
      })
    );

    sendResponse({ ok: true });
  }
});

connectBridge();
