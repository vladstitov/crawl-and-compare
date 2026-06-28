# Crawl And Compare - Application Tasks

This document describes what the application should do, end-to-end.

## Product Goal

Build a workflow that can:
- control a browser through a Chrome extension,
- crawl target pages,
- analyze page HTML (rule-based and AI-based),
- and save data in database.
- decide next navigation actions,


## Current System Components

- client/: Angular UI application to browse database.
- server/: Express API + WebSocket command bridge.
- extention/: Chrome extension (Manifest V3) that executes commands and uploads HTML.
- shared/: shared TypeScript command and payload contracts.
- database layer to save results.

## Core Functional Tasks

1. Browser command bridge
- Keep a stable WebSocket connection between server and extension.
- Support command types: NAVIGATE, SCRAPE_PAGE, CLICK_ELEMENT.
- Return command acknowledgements and errors.
- Track extension connection health and heartbeats.

2. Page scraping and upload
- Trigger scrape command from server.
- Collect current page HTML in extension.
- POST payload { url, html } to server /api/upload-html.
- Parse HTML to validate existing tags.
- Validate payload shape and reject malformed requests.
- Save raw and parsed HTML in database.



3. Rule-based page analysis
- Analyze page URL + HTML in AnalizerRepo.AnalizePage.
- Detect wrong page loaded.
- Return normalized analysis result:
  - url
  - htmlSizeInBytes
 

4. AI-based page analysis
- Send URL + HTML prompt to Ollama API.
- Parse AI JSON response into AnalizePageResult contract.
- Fall back to rule-based defaults when AI response is invalid.
- Make model and endpoint configurable with env vars:
  - OLLAMA_URL
  - OLLAMA_MODEL

5. Crawl decision logic
- Decide next browser action from nextAction.
- If nextAction is OPEN_ABOUT_SECTION, send CLICK_ELEMENT command for About button.
- If nextAction is NONE, stop navigation and mark page as ready.

6. API and server endpoints
- Keep / health endpoint for server status.
- Keep /go-to-url endpoint for manual navigation trigger.
- Keep /api/upload-html endpoint for extension uploads.
- Add endpoint(s) for triggering AI analysis from UI.

7. Frontend workflow
- Add controls to:
  - connect/check extension bridge health,
  - submit target URL,
  - trigger crawl/analyze,
  - display analysis output and action history.
- Show request/response states and errors clearly.

8. Persistence and history
- Store crawl jobs and analysis results in database.
- Save timestamps, URL, action log, and final status.
- Add query endpoint(s) for recent jobs.

9. Reliability and safety
- Add retries/timeouts for network calls.
- Guard against large HTML payload issues.
- Ensure server does not crash on invalid extension messages.
- Log key events with consistent structure.

10. Testing
- Unit tests:
  - analysis repos,
  - command payload validation,
  - decision logic.
- Integration tests:
  - extension upload -> server analyze flow,
  - Ollama response parsing and fallback behavior.

## Suggested Implementation Order

1. Stabilize bridge health + payload validation.
2. Wire AI analyzer into active crawl flow.
3. Persist crawl runs and analysis results.
4. Expose API endpoints for history and results.
5. Build UI controls and result views.
6. Add tests and harden error handling.

## Definition Of Done

- A user can submit a URL and see crawl progress.
- Extension executes navigation/scrape commands from server.
- Server receives HTML and produces analysis result.
- AI analysis works through Ollama with safe fallback.
- Result and action log are visible in client UI.
- Core flows are covered by tests and pass in CI.
