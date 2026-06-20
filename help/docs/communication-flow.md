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
  │◄────────────────────────────────── content.ts (via fetch)
```

## 1. NAVIGATE

```
Server                          Background script
  │                                   │
  │── WS: { id, command:'NAVIGATE',   │
  │         url, waitForLoad }  ─────►│
  │                                   │── chrome.tabs.update(tabId, { url })
  │                                   │── (optional) waitForTabLoad()
  │◄─ WS: { source:'extension',       │
  │         ok:true, id, command,     │
  │         data:{ tabId, url } } ────│
```

## 2. SCRAPE_PAGE

```
Server               Background script            Content script
  │                        │                           │
  │── WS: { id,            │                           │
  │  command:'SCRAPE_PAGE'}►│                          │
  │                        │── chrome.tabs.sendMessage►│
  │                        │                           │── fetch POST /api/upload-html
  │◄───────────────────────────────────────────────────── { url, html }
  │  (analyzeAndProceed)   │                           │
  │                        │◄── { success, detail } ───│
  │◄─ WS: { ok:true, id,   │
  │         command,data } ─│
```

## 3. CLICK_ELEMENT

```
Server                    Background script         Content script
  │                             │                        │
  │── WS: { id,                 │                        │
  │  command:'CLICK_ELEMENT',   │                        │
  │  selector, waitForLoad } ──►│                        │
  │                             │── chrome.tabs.sendMessage ──────────────►│
  │                             │                        │── querySelector(selector).click()
  │                             │◄───────────────────────── { success, detail }
  │                             │── (optional) waitForTabLoad()
  │◄─ WS: { ok, id, command,   │
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
| `ScrapePageCommand`   | Server sends, background + content handle |
| `ClickElementCommand` | Server sends, background + content handle |
| `ExtensionSocketResponse` | Background sends back to server |
| `UploadedHtmlPayload` | Content script POSTs to server |
| `EventLog`            | Both scripts send to server |
| `BridgeResponse`      | Server returns to its own API callers |

## Error paths

| Failure point | What happens |
|---------------|--------------|
| Extension socket not open | `BrowserRepo` returns `{ ok: false }` immediately, no WS message sent. |
| Background receives unknown command | Sends `{ ok: false, error: 'Server sent an invalid browser command.' }` back to server. |
| Background command throws | Sends `{ ok: false, id, command, error: message }` back to server. |
| Content script selector not found | Replies `{ success: false, detail: 'Selector not found' }`. |
| HTML upload fetch fails | Content script replies `{ success: false, detail: error.message }` to background. |
| Ollama/analyzer throws | `AnalizeWithAiRepo` catches and returns local fallback result. |
