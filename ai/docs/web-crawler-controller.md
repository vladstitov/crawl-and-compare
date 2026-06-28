# WebCrawlerController — Crawl Orchestration

File: `server/src/controllers/web-crawler.cotroller.ts`

## Purpose

`WebCrawlerController` coordinates the full crawl lifecycle for a single job at a time.
It queries the database for the next pending job, navigates the browser to the target URL,
and triggers an HTML scrape — with a strict 10-second timeout on the scrape step.

## Job selection

`Start()` picks the **first** document matching:

```ts
{ workflow: { $ne: 'complete' }, url: { $exists: true, $ne: null } }
```

A job is skipped (with `ok: true`) if `htmlPage` is already populated.

## Start() flow

```
Start()
  │
  ├── Guard: return early if isCrawling === true
  │
  ├── Query DB for first job (workflow != 'complete', url exists)
  │   └── No job found → return { ok: false, 'No pending jobs with a URL found.' }
  │
  ├── job.htmlPage already set?
  │   └── Yes → return { ok: true, 'Job already has HTML downloaded.' }
  │
  ├── navigateByJob(_id, url)
  │   ├── Sends NAVIGATE command via BrowserRepo.sendNavigateCommand
  │   ├── Waits for extension WebSocket ack (default 30s)
  │   ├── On success → sets job.status = 'running' in DB
  │   └── On failure → sets job.status = 'failed' in DB, returns ok: false
  │
  └── BrowserRepo.scrapeHtmlAndSave(_id, timeoutMs: 10000)
      ├── Sends SCRAPE_PAGE command via WebSocket
      ├── Waits for extension WebSocket ack
      ├── Polls DB until job.status === 'downloaded'
      ├── On success → returns { ok: true }
      ├── On timeout (>10s) → sets job.status = 'timeout' in DB, returns ok: false
      └── On extension error → sets job.status = 'failed' in DB, returns ok: false
```

## Job status lifecycle

| Status      | Set when |
|-------------|----------|
| `running`   | NAVIGATE ack received from extension. |
| `failed`    | Any command fails or extension returns `ok: false`. |
| `timeout`   | `waitForDownloadedStatus` exceeds 10 seconds. |
| `downloaded`| `/api/upload-html` handler saves analysis results. |

## Exported functions

| Function        | Description |
|-----------------|-------------|
| `Start()`       | Picks next job, navigates, scrapes. Returns result object with `ok`, `message`, `_id`. |
| `Stop()`        | Sets `stopSignal = true`, clears crawl state immediately. |
| `currentStatus()` | Returns `{ isCrawling, currentTask, current_id }`. |
| `ProcessPage(pageData)` | Runs `AnalizerRepo.AnalizePage` on provided page data. Utility — not called by `Start()`. |

## Internal state

| Variable      | Type              | Meaning |
|---------------|-------------------|---------|
| `isCrawling`  | `boolean`         | Guard preventing concurrent crawl runs. |
| `stopSignal`  | `boolean`         | When `true`, in-progress steps abort early. |
| `current_id`  | `string \| null`  | DB `_id` of the job currently being processed. |
| `currentTask` | `string \| null`  | `'navigate'` or `'scrape'` — current step name. |
