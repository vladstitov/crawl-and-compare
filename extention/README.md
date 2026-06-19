# Chrome Extension Starter

This folder contains a minimal Chrome Extension (Manifest V3) setup using TypeScript + esbuild.

## Scripts

- `npm run build`: Build extension files to `dist/`
- `npm run dev`: Build in watch mode for development
- `npm run clean`: Remove `dist/`

## Getting started

1. Install dependencies:
   - `npm install`
2. Build once:
   - `npm run build`
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the `dist/` folder

## Project structure

- `src/background.ts`: Service worker
- `src/content.ts`: Content script
- `src/popup.ts`: Popup UI logic
- `static/manifest.json`: Extension manifest
- `static/popup.html`: Popup UI

## Development tip

Run `npm run dev`, then reload the unpacked extension in Chrome after changes.

## Server bridge

This extension now opens a WebSocket bridge to `ws://localhost:3000/bridge` from the background service worker.

1. Start the server project in a separate terminal from `server/`:
    - `npm install`
    - `npm run dev`
2. Build this extension and load `dist/` in Chrome.
3. Open the extension popup and use **Send To Bridge** to publish a message.

You can also broadcast from the server with HTTP:

```bash
curl -X POST http://localhost:3000/bridge/publish \
   -H "Content-Type: application/json" \
   -d '{"text":"hello from server"}'
```
