# Server Descriptor

## Purpose
The server is the HTTP entry point for crawl orchestration and job management. It exposes APIs to create tasks, control crawling, and manage job records in the jobs database.

## Responsibilities
- Expose REST-like endpoints for job CRUD operations.
- Trigger browser navigation and scraping workflows.
- Return crawler runtime status.
- Serve static files from the `public` directory.
- Start the browser bridge and Express listener.

## Endpoints

### GET /create-task
Creates a task record in the jobs collection.

Request body:
- `name`: string
- `url`: string
- `workflow`: string
- `hasTags`: array of `{ tag: string, text: string }`

Response:
- `message`: success message
- `task`: inserted job document

### GET /go-to-url
Asks the browser bridge to navigate to a URL.

Query params:
- `url`: string (required)
- `id`: string (required) — must be an existing job `_id` in the database

Response:
- `ok`: boolean
- `result`: browser action result

### GET /crawl-start
Starts crawler flow through `WebCrawlerController.Start()`.

Response:
- `ok`: boolean
- `result`: controller result

### GET /crawl-stop
Stops crawler flow through `WebCrawlerController.Stop()`.

Response:
- `ok`: boolean
- `result`: controller status/result

### GET /crawl-status
Returns current crawler runtime status.

Response:
- `ok`: boolean
- `result`: crawler status payload

### GET /jobs
Returns all jobs.

Response:
- `ok`: boolean
- `result`: array of job documents

### GET /job
Returns a single job by id.

Query params:
- `id`: string

Response:
- `ok`: boolean
- `result`: job document

### PUT /jobs
Updates a job by id.

Query params:
- `id`: string

Request body:
- Partial job fields to update.
- `_id` is ignored and cannot be updated.

Response:
- `ok`: boolean
- `result`: number of updated documents

### DELETE /jobs
Deletes a job by id.

Query params:
- `id`: string

Response:
- `ok`: boolean
- `result`: number of deleted documents

## Notes
- Most endpoints use JSON responses with `ok` and `result` fields.
- Error responses return `ok: false` with a `message` field.
