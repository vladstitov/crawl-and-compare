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
- `static/manifest.json`: Extension manifest

## Development tip

Run `npm run dev`, then reload the unpacked extension in Chrome after changes.

## Server bridge

This extension now uses a WebSocket command bridge at `ws://localhost:8080` and uploads scraped HTML to `http://localhost:3000/api/upload-html`.

1. Start the server project in a separate terminal from `server/`:
   - `npm install`
   - `npm run dev`
2. Build this extension and load `dist/` in Chrome.
3. The background service worker connects to `ws://localhost:8080` automatically.
4. The server can push `NAVIGATE`, `SCRAPE_PAGE`, and `CLICK_ELEMENT` commands over that socket.
5. When the extension scrapes the current page, it posts `{ url, html }` to `POST /api/upload-html`.
