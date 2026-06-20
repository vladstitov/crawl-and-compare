import type { ContentScriptCommand } from '../../shared/interfaces';

chrome.runtime.onMessage.addListener((message: ContentScriptCommand , _sender, sendResponse) => {

  console.log('Content script received directive:', message);

  switch (message?.command) {
    case 'SCRAPE_PAGE': {
      const payload = {
        url: window.location.href,
        html: document.documentElement.outerHTML
      };

      fetch('http://localhost:3000/api/upload-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(() => sendResponse({ success: true, detail: 'HTML pushed to HTTP API' }))
        .catch((error) =>
          sendResponse({
            success: false,
            detail: error instanceof Error ? error.message : 'HTML upload failed.'
          })
        );

      return true;
    }

    case 'PING_FROM_BACKGROUND': {
      console.log('Received message from background:', message);
      sendResponse({ ok: true, pageTitle: document.title });
      return true;
    }

    case 'CLICK_ELEMENT': {
      const element = document.querySelector(message.selector);

      if (element) {
        (element as HTMLElement).click();
        sendResponse({ success: true, detail: 'Clicked successfully' });
      } else {
        sendResponse({ success: false, detail: 'Selector not found' });
      }

      return true;
    }

    default:
      break;
  }
});

export {};
