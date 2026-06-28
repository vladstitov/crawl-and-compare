# Communication Flow — Server ↔ Extension

This document traces the exact message path between `BrowserRepo` (server) and
`background.ts` / `content.ts` (extension) for every supported operation.

## Channel map

```
Server (BrowserRepo)
  │
  │  WebSocket  ws://localhost:8080
  ├──────────────────────────────────► background.ts (service worker)
  │◄──────────────────────────────────
  │
  │  HTTP POST  /api/upload-html
  │◄────────────────────────────────── background.ts (fetch from service worker)
```

> The content script **never** makes direct network calls to localhost.
> It only returns scraped data to the background via `sendResponse`,
> and the background owns all localhost network access.

## 1. NAVIGATE

```
Server                          Background script
  │                                   │
  │── WS: { _id, command:'NAVIGATE',  │
  │         url, waitForLoad }  ─────►│
  │                                   │── chrome.tabs.update(tabId, { url })
  │                                   │── (optional) waitForTabLoad()
  │◄─ WS: { ok:true, _id, command,    │
  │         data:{ tabId, url } } ────│
```

## 2. SCRAPE_PAGE

```
Server               Background script            Content script
  │                        │                           │
  │── WS: { _id,           │                           │
  │  command:'SCRAPE_PAGE'}►│                          │
  │                        │── chrome.tabs.sendMessage►│
  │                        │                           │── builds { _id, url, title, html }
  │                        │◄── sendResponse(payload) ─│
  │                        │
  │                        │── validates payload
  │                        │── fetch POST /api/upload-html ──────────────────────────────►│ Server
  │◄──────────────────────────────────────────────────────────── HTTP 200 { status:'PASSED' }
  │  (AnalizePage + DB update status='downloaded')
  │                        │
  │◄─ WS: { ok:true, _id,  │
  │  command:'SCRAPE_PAGE', │
  │  data:{ url, title } } ─│
```

## 3. CLICK_ELEMENT

```
Server                    Background script         Content script
  │                             │                        │
  │── WS: { _id,                │                        │
  │  command:'CLICK_ELEMENT',   │                        │
  │  selector, waitForLoad } ──►│                        │
  │                             │── chrome.tabs.sendMessage ──────────────►│
  │                             │                        │── querySelector(selector).click()
  │                             │◄───────────────────────── { success, detail }
  │                             │── (optional) waitForTabLoad()
  │◄─ WS: { ok, _id, command,   │
  │         data } ─────────────│
```

## 4. HEARTBEAT (extension → server, periodic)

```
Background script                   Server
  │                                    │
  │── WS: { type:'HEARTBEAT',          │
  │         timestamp } ──────────────►│
  │                                    │── stores lastHeartbeatAt = timestamp
```

Sent every 15 seconds. No server reply.

## 5. EventLog (extension → server, every command)

Before processing any command the background script sends an event log payload:

```ts
{ from: 'background', message: '<COMMAND_NAME>', timestamp: number }
```

The content script mirrors this for commands it receives:

```ts
{ from: 'content_script', message: '<COMMAND_NAME>', timestamp: number }
```

Both are sent over the WebSocket. The server currently logs them to console.

## Shared contract types (shared/interfaces.ts)

| Type                  | Used by |
|-----------------------|---------|
| `NavigateCommand`     | Server sends, background receives |
| `ScrapePageCommand`   | Server sends, background + content handle; background POSTs to server |
| `ClickElementCommand` | Server sends, background + content handle |
| `ExtensionSocketResponse` | Background sends back to server |
| `EventLog`            | Both scripts send to server |
| `BridgeResponse`      | Server returns to its own API callers |

## Error paths

| Failure point | What happens |
|---------------|--------------|
| Extension socket not open | `BrowserRepo` returns `{ ok: false }` immediately, no WS message sent. |
| Background receives unknown command | Sends `{ ok: false, error: 'Server sent an invalid browser command.' }` back to server. |
| Background command throws | Sends `{ ok: false, _id, command, error: message }` back to server. |
| Content script selector not found | Replies `{ success: false, detail: 'Selector not found' }`. |
| Background HTML upload fetch fails | Background catches and sends `ok: false` ack to server. |
| `waitForDownloadedStatus` times out | `scrapeHtmlAndSave` sets `job.status = 'timeout'` in DB. |
