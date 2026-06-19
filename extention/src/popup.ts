const statusElement = document.querySelector<HTMLDivElement>('#status');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh');
const sendButton = document.querySelector<HTMLButtonElement>('#send');
const messageInput = document.querySelector<HTMLInputElement>('#messageInput');
const logElement = document.querySelector<HTMLDivElement>('#log');

function appendLog(line: string): void {
  if (!logElement) return;

  if (logElement.textContent === 'No bridge messages yet.') {
    logElement.textContent = '';
  }

  const entry = document.createElement('div');
  entry.textContent = line;
  logElement.prepend(entry);
}

async function renderActiveTabInfo() {
  if (!statusElement) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const title = tab?.title ?? 'Unknown page';
  const url = tab?.url ?? 'No URL';

  statusElement.textContent = `Active tab: ${title}\n${url}`;

  const bridgeStatus = await chrome.runtime.sendMessage({ type: 'BRIDGE_GET_STATUS' });
  statusElement.textContent += `\nBridge: ${bridgeStatus?.status ?? 'unknown'}`;
  if (bridgeStatus?.lastError) {
    statusElement.textContent += `\nError: ${bridgeStatus.lastError}`;
  }
}

refreshButton?.addEventListener('click', () => {
  void renderActiveTabInfo();
});

sendButton?.addEventListener('click', async () => {
  const text = messageInput?.value?.trim();
  if (!text) return;

  const response = await chrome.runtime.sendMessage({
    type: 'BRIDGE_SEND',
    payload: {
      text,
      sentAt: new Date().toISOString()
    }
  });

  if (response?.ok) {
    appendLog(`[sent] ${text}`);
    if (messageInput) messageInput.value = '';
    return;
  }

  appendLog(`[error] ${response?.error ?? 'Unknown error'}`);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'BRIDGE_MESSAGE') {
    appendLog(`[recv] ${message.payload}`);
    return;
  }

  if (message?.type === 'BRIDGE_STATUS') {
    appendLog(`[bridge] ${message.status}${message.lastError ? ` - ${message.lastError}` : ''}`);
    void renderActiveTabInfo();
  }
});

void renderActiveTabInfo();
