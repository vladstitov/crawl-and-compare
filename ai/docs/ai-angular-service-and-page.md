# AI Descriptor: Angular Service and Jobs Page

## Scope
This document describes the Angular frontend pieces created for server integration and job control UI.

## Goals
- Centralize all backend HTTP calls in one Angular service.
- Provide one Material-based page to manage jobs and crawler actions.
- Keep UI state simple and explicit for safe AI-assisted modifications.

## Frontend Files
- `client/src/app/services/server-api.service.ts`
- `client/src/app/app.ts`
- `client/src/app/app.html`
- `client/src/app/app.scss`
- `client/src/app/create-job-dialog.component.ts`
- `client/src/app/app.config.ts`

## Service Descriptor

### File
`client/src/app/services/server-api.service.ts`

### Responsibility
Single integration layer for all server APIs used by the dashboard.

### Base URL
- `http://localhost:3000`

### Public API Methods
- `createTask(payload: CreateTaskRequest)`
  - HTTP: `GET /create-task` (custom backend behavior, request body included)
  - Response: `{ message, task }`
- `goToUrl(url: string)`
  - HTTP: `GET /go-to-url?url=...`
- `crawlStart()`
  - HTTP: `GET /crawl-start`
- `crawlStop()`
  - HTTP: `GET /crawl-stop`
- `crawlStatus()`
  - HTTP: `GET /crawl-status`
- `getJobs()`
  - HTTP: `GET /jobs`
- `getJob(id: string)`
  - HTTP: `GET /job?id=...`
- `updateJob(id: string, updates: Partial<JobDocument>)`
  - HTTP: `PUT /jobs?id=...`
  - `_id` is removed before sending to prevent id overwrite.
- `deleteJob(id: string)`
  - HTTP: `DELETE /jobs?id=...`

### Shared Types
- `JobTag`
- `JobDocument`
- `CreateTaskRequest`
- `ApiResultResponse<T>`
- `CreateTaskResponse`

## Page Descriptor

### Main Page File
`client/src/app/app.ts`

### Template and Styling
- Template: `client/src/app/app.html`
- Styles: `client/src/app/app.scss`

### Dialog Component
`client/src/app/create-job-dialog.component.ts`

### UI Structure
- Top Material toolbar with action buttons:
  - Create New Record
  - Start Process
  - Stop Process
  - Get Process Status
  - Refresh Jobs
- Two-column workspace:
  - Left: jobs list
  - Right: selected job details and process status payload

### State Model in App Component
- `jobs: JobDocument[]`
- `selectedJob: JobDocument | null`
- `isLoading: boolean`
- `isSaving: boolean`
- `statusMessage: string`
- `processStatus: unknown`

### Behavior Summary
- On init, page loads all jobs.
- Clicking list item sets selected record shown in details panel.
- Create button opens Material dialog, validates input, creates record, then reloads jobs.
- Start/Stop/Status buttons call crawler APIs and show feedback.
- Status and API errors are surfaced through `statusMessage`.

## Angular Material Activation

### Material Usage
Used Material modules include:
- Toolbar
- Buttons
- Cards
- Progress bar
- Chips
- Divider
- Dialog
- Form field
- Input

### Provider Setup
In `client/src/app/app.config.ts`:
- `provideHttpClient()`
- `provideAnimationsAsync()`

## AI Edit Rules (Recommended)
- Keep server endpoint paths in the service only.
- Do not call `HttpClient` directly from templates/components other than service layer.
- Preserve response wrappers (`ok`, `result`, `message`) unless backend contract changes.
- Keep create dialog form validation for required fields (`name`, `url`, `workflow`).
- Preserve selected-job refresh logic after reload (selection by `_id`).

## Known Constraints
- Backend uses `GET /create-task` with request body (non-standard REST). Keep this unless backend is changed.
- `processStatus` is currently typed as `unknown` because backend payload is dynamic.

## Suggested Next Improvements
- Add typed interfaces for process status payload.
- Add update and delete actions in the UI.
- Add route-level separation (dedicated feature page) if app grows.
- Move base URL to environment configuration.
