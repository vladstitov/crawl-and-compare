import type { ContentScriptCommand, EventLog, ScrapePageCommand } from '../../shared/interfaces';

chrome.runtime.onMessage.addListener((message: ContentScriptCommand , _sender, sendResponse) => {
  if (message?.command) {
    const eventLog: EventLog = {
      from: 'content_script',
      message: message.command,
      timestamp: Date.now()
    };

    chrome.runtime.sendMessage({ type: 'EVENT_LOG', payload: eventLog }).catch(() => {
      // Background may be reloading; do not block the command path.
    });
  }

  console.log('Content script received directive:', message);

  switch (message?.command) {
    case 'SCRAPE_PAGE': {
      const payload: ScrapePageCommand = {
        _id: message._id,
        command: 'SCRAPE_PAGE',
        url: window.location.href,
        title: document.title,
        html: document.documentElement.outerHTML
      };

      // Return raw scrape data to background; background owns localhost network access.
      sendResponse(payload);

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
