# BrowserRepo — Server-Side Browser Bridge

File: `server/src/repos/browser.repo.ts`

## Purpose

`BrowserRepo` is the server-side counterpart of the extension background script.
It owns the `WebSocketServer` that the extension connects to, exposes helper
functions for sending browser commands, and receives page uploads from the
extension content script over HTTP.

## Startup

`BrowserRepo.StartBridgeServer(app, PORT)` must be called once at server startup.
It registers two transport channels:

| Channel                    | Transport   | Direction         |
|----------------------------|-------------|-------------------|
| `ws://localhost:8080`      | WebSocket   | Server → Extension (commands) |
| `POST /api/upload-html`    | HTTP POST   | Extension → Server (HTML payloads) |

## Exported functions

| Function                      | What it does |
|-------------------------------|--------------|
| `health()`                    | Returns `{ ok, message }` with connection state. |
| `goToUrl(url)`                | Sends a `NAVIGATE` command to the extension. |
| `grabHtmlBody()`              | Sends a `SCRAPE_PAGE` command to the extension. |
| `clickElement(selector)`      | Sends a `CLICK_ELEMENT` command with a CSS selector. |
| `getElementContent(selector)` | Placeholder — not yet implemented. |
| `StartBridgeServer(app, PORT)`| Registers HTTP endpoint and starts WebSocket server. |

All command functions return `BridgeResponse`:

```ts
{ ok: boolean, message: string, data?: unknown }
```

If no extension socket is open the call returns `ok: false` immediately.

## WebSocket message handling (extension → server)

The server receives two kinds of inbound messages from the extension:

| Message type  | Shape | Handling |
|---------------|-------|---------- |
| `HEARTBEAT`   | `{ type: 'HEARTBEAT', timestamp: number }` | Stored in `lastHeartbeatAt`. |
| Command result| `{ source: 'extension', ok, id, command, data?, error? }` | Logged to console. |

Unknown or non-JSON messages are caught and logged without crashing the server.

## HTTP upload handling

`POST /api/upload-html` receives `{ url: string, html: string }` from the content
script after a `SCRAPE_PAGE` command.

On receipt the server calls `analyzeAndProceed(url, html)` which:

1. Passes the page through `AnalizerRepo.AnalizePage(url, html)`.
2. If `isLinkedInProfile` is `true` — logs "Ready for analysis" and stops.
3. If `isLinkedInProfile` is `false` — sends a `CLICK_ELEMENT` command for the
   About button selector `button[aria-label*='About']`.

## Internal state

| Variable         | Type          | Meaning |
|------------------|---------------|---------|
| `extensionSocket`| `WebSocket \| null` | The single active extension connection. |
| `webSocketServer`| `WebSocketServer \| null` | The WS server instance (created once). |
| `lastHeartbeatAt`| `number \| null` | Timestamp of the last heartbeat received. |

## Socket lifecycle events (server-side)

| Event        | Behaviour |
|--------------|-----------|
| `connection` | Stores the new socket in `extensionSocket`. |
| `close`      | Clears `extensionSocket` only if it matches the closed socket; logs code and reason. |
| `error`      | Logs the error message. |
