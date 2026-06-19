type BrowserCommandAction = 'grabHtmlBody' | 'clickElement' | 'getElementContent';

type BrowserDomCommandRequest = {
  action: BrowserCommandAction;
  selector?: string;
};

type BrowserDomCommandEnvelope = {
  type: 'BROWSER_DOM_COMMAND';
  requestId: string;
  command: BrowserDomCommandRequest;
};

type BrowserDomCommandResult = {
  type: 'browser:result';
  requestId: string;
  action: BrowserCommandAction;
  ok: boolean;
  data?: unknown;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDomCommand(message: unknown): message is BrowserDomCommandEnvelope {
  return (
    isRecord(message) &&
    message.type === 'BROWSER_DOM_COMMAND' &&
    typeof message.requestId === 'string' &&
    isRecord(message.command) &&
    typeof message.command.action === 'string'
  );
}

function getElement(selector: string): Element {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`No element matched selector: ${selector}`);
  }

  return element;
}

function executeDomCommand(message: BrowserDomCommandEnvelope): BrowserDomCommandResult {
  try {
    if (message.command.action === 'grabHtmlBody') {
      return {
        type: 'browser:result',
        requestId: message.requestId,
        action: message.command.action,
        ok: true,
        data: {
          html: document.body?.outerHTML ?? '',
          title: document.title,
          url: location.href
        }
      };
    }

    if (!message.command.selector) {
      throw new Error(`The ${message.command.action} command requires a selector.`);
    }

    const element = getElement(message.command.selector);

    if (message.command.action === 'clickElement') {
      (element as HTMLElement).click();

      return {
        type: 'browser:result',
        requestId: message.requestId,
        action: message.command.action,
        ok: true,
        data: {
          selector: message.command.selector,
          clicked: true
        }
      };
    }

    return {
      type: 'browser:result',
      requestId: message.requestId,
      action: message.command.action,
      ok: true,
      data: {
        selector: message.command.selector,
        text: element.textContent ?? '',
        html: element.innerHTML
      }
    };
  } catch (error) {
    return {
      type: 'browser:result',
      requestId: message.requestId,
      action: message.command.action,
      ok: false,
      error: error instanceof Error ? error.message : 'Command failed.'
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isDomCommand(message)) {
    const result = executeDomCommand(message);
    sendResponse(result);
    return;
  }

  if (message?.type !== 'PING_FROM_BACKGROUND') {
    return;
  }

  console.log('Received message from background:', message);
  sendResponse({ ok: true, pageTitle: document.title });
});

export {};
