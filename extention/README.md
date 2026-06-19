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

This extension now uses HTTP against `http://localhost:3000/bridge` from the background service worker.

1. Start the server project in a separate terminal from `server/`:
   - `npm install`
   - `npm run dev`
2. Build this extension and load `dist/` in Chrome.
3. Send browser commands from the server with `POST /bridge/command`.
4. The extension long-polls `GET /bridge/command/next` and posts results back to `POST /bridge/result`.

Example command:

```bash
curl -X POST http://localhost:3000/bridge/command \
  -H "Content-Type: application/json" \
  -d '{"action":"grabHtmlBody"}'
```
