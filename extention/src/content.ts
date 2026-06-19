chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PING_FROM_BACKGROUND') {
    return;
  }

  console.log('Received message from background:', message);
  sendResponse({ ok: true, pageTitle: document.title });
});
