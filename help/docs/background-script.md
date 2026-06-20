# background.ts — Extension Service Worker

File: `extention/src/background.ts`

## Purpose

The background script is the persistent service worker of the Chrome extension.
It owns the WebSocket connection to the server, receives browser commands, dispatches
them to the active tab via the content script, and sends results back to the server.

## Connection lifecycle

1. On startup the script calls `connectBridge()`.
2. A WebSocket is opened to `ws://localhost:8080`.
3. While connected a heartbeat ping `{ type: 'HEARTBEAT', timestamp }` is sent
   every 15 seconds so the server can detect stale connections.
4. On close or error the script waits 1 500 ms then reconnects automatically.
5. Connection state (`disconnected | connecting | connected`) is broadcast to any
   open extension popup via `chrome.runtime.sendMessage`.

## Incoming commands from server

Commands arrive as JSON strings over the WebSocket.
All commands share the shape `{ id: string, command: string, ...options }`.

| Command        | What the background script does |
|----------------|--------------------------------|
| `NAVIGATE`     | Calls `chrome.tabs.update` on the active tab with the given URL. Optionally waits for `tab.status === 'complete'` before replying. |
| `SCRAPE_PAGE`  | Forwards the command to the content script via `chrome.tabs.sendMessage`. The content script uploads the page HTML and replies with the result. |
| `CLICK_ELEMENT`| Forwards the command to the content script with a CSS selector. Optionally waits for page load after the click. |

After every command the background script sends an `EventLog` payload back to the
server:

```ts
{ from: 'background', message: '<COMMAND_NAME>', timestamp: number }
```

## Command acknowledgement shape

After handling a command the background script calls `callBackToSocket` which sends:

```ts
{
  source: 'extension',
  at: '<ISO timestamp>',
  ok: boolean,
  id: string,
  command: 'NAVIGATE' | 'SCRAPE_PAGE' | 'CLICK_ELEMENT',
  data?: unknown,
  error?: string
}
```

If a command throws, `ok: false` and the error message are sent in the same shape.

## Key internal functions

| Function              | Responsibility |
|-----------------------|----------------|
| `connectBridge()`     | Opens WebSocket, attaches all socket event listeners. |
| `scheduleReconnect()` | Debounced reconnect timer (1 500 ms). |
| `startHeartbeat()`    | Starts the 15-second ping interval. |
| `stopHeartbeat()`     | Clears the ping interval. |
| `getTargetTabId()`    | Queries for the currently active tab. |
| `waitForTabLoad()`    | Promise that resolves when the tab fires `status === complete`. |
| `sendContentCommand()`| Wrapper for `chrome.tabs.sendMessage`. |
| `sendSocketPayload()` | Serialises and sends a JSON payload over the WebSocket. |
| `sendEventLog()`      | Sends an `EventLog` to the server without throwing on failure. |

## Runtime messages sent to popup

| type             | Payload |
|------------------|---------|
| `BRIDGE_STATUS`  | `{ status, lastError }` — connection state changes. |
| `BRIDGE_MESSAGE` | `{ payload }` — command results or raw errors. |
| `EVENT_LOG`      | `{ payload: EventLog }` — re-forwarded from content script. |
