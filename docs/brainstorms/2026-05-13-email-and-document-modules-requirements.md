# Requirements: Email Module & Document Module

**Date:** 2026-05-13  
**Status:** Ready for planning  
**Modules:** `ComsModule` (email), `DocsModule`  
**Apps in scope:** `@hsm/api`, `@hsm/worker`, `@hsm/database`, `@hsm/common`

---

## Problem & Goal

The templates module is live. Now the two most immediate consumers need to be production-ready:

1. **Email** — send rendered template emails (with or without S3-stored attachments) to one or many recipients, log every send for audit and resend, and support per-batch and per-recipient resend.
2. **Documents** — store documents of any format to S3, generate PDFs from HTML templates via Puppeteer, and make documents queryable by the entity they belong to.

The two modules are built together because email attachments are referenced by document ID — the worker resolves those IDs to S3 streams at send time.

---

## Scope

### In scope

- Complete `ComsModule` email CRUD + send + resend
- Complete `DocsModule` upload, generate, get, list, delete
- Email log tables (`email_batch` + `email_recipient`)
- PDF generation via Puppeteer on the worker
- Document entity-link at creation time + list-by-entity query
- Template data validation pipe (`EmailTemplateDataPipe`) activated
- `.http` files and Swagger docs for every new endpoint
- Unit tests for every new service method

### Out of scope

- SMS module (separate work item)
- Email provider webhooks / bounce callbacks
- Document content editing after upload
- Non-PDF document generation (Excel generation already exists)

---

## Actors

- **Authenticated API callers** (internal services, admin users) — trigger sends, upload/generate docs, query logs
- **BullMQ worker** — executes the actual SMTP send and Puppeteer PDF rendering; retries on failure

---

## Functional Requirements

### ComsModule — Email

#### Send email (`POST /v1/coms/send/email`)

- Accepts `emailTemplate` (ID or name), `data` (object), `toEmails[]`, optional `fromEmail`/`fromName`, optional `documentIds[]`
- **Before queuing:** validate `data` against the template's `schema` field using `EmailTemplateDataPipe`. Return `400` if validation fails.
- Creates one `email_batch` row (stores template ref, data, documentIds, from, jobId, createdBy)
- Creates one `email_recipient` row per entry in `toEmails`, all with status `PENDING`
- Enqueues `send-email` job to `coms` queue and returns `{ batchId, jobId }`
- API response is immediate; delivery happens on the worker

#### Worker — send-email job

- Resolves `documentIds` to S3 file streams via the docs module
- Calls `templateService.parseEmail(templateId, data)` to get `subject` + `html`
- Sends one SMTP call with all `toEmails` in the `To:` field plus resolved attachments
- On success: updates all `email_recipient` rows for the batch to `SENT` + sets `sentAt`
- On failure: updates affected rows to `FAILED` + sets `errorMessage`; BullMQ retries the job until success

#### Resend — batch (`POST /v1/coms/emails/batches/:batchId/resend`)

- Loads the `email_batch` row; re-queues `send-email` with the original payload
- Returns `{ jobId }` immediately

#### Resend — recipient (`POST /v1/coms/emails/recipients/:recipientId/resend`)

- Loads the `email_recipient` row and its parent `email_batch`
- Re-queues `send-email` with the original batch payload but `toEmails` overridden to `[recipient.toEmail]`
- Returns `{ jobId }` immediately

#### Email log queries

| Endpoint | Description |
|---|---|
| `GET /v1/coms/emails/batches` | List batches (pagination, filter by templateId, status, date range, createdBy) |
| `GET /v1/coms/emails/batches/:id` | Get one batch with its recipient rows |
| `GET /v1/coms/emails/recipients` | List recipients (filter by batchId, toEmail, status) |
| `GET /v1/coms/emails/recipients/:id` | Get one recipient row |

---

### DocsModule — Documents

#### Upload (`POST /v1/docs/upload`) — existing, may need changes

- Accepts multipart files + metadata payload (bucket, folder, optional `entityId`, `entityType`)
- Saves files to S3, creates `DocumentsEntity` + `DocumentsVersionEntity` + `DocumentStorageObjectEntity`
- If `entityId`/`entityType` present, creates a `DocumentLinkEntity` row
- Returns document ID(s) — callers use these IDs in `POST /coms/send/email`

#### Generate PDF (`POST /v1/docs/generate`) — existing skeleton, needs implementation

- Accepts `templateIdentifier` (ID or name), `data`, `title`, optional `description`, optional `entityId`/`entityType`
- Validates `data` against the template's `schema`
- Creates `DocumentsEntity` (status `PENDING`) + enqueues `generate-document` job
- Returns `{ documentId, jobId }`

#### Worker — generate-document job

- Uses Puppeteer to render the template's `content` (HTML) with injected `data` → PDF buffer
- Uploads PDF buffer to S3 bucket `documents` under folder `generated/{documentId}`
- Creates `DocumentsVersionEntity` (version=1, mimeType=`application/pdf`) + `DocumentStorageObjectEntity`
- Updates `DocumentsEntity.status` → `READY`
- Creates `DocumentsGeneratedEntity` (stores templateName + data for audit)
- If `entityId`/`entityType` were stored on the entity, creates `DocumentLinkEntity`

#### Get document (`GET /v1/docs/:id`) — existing

- Returns `DocumentsEntity` with versions + storage metadata
- Scoped to `createdBy` (authenticated user's ID)

#### Get document URL (`GET /v1/docs/:id/url`) — existing

- Returns a presigned S3 URL for the latest version
- Scoped to `createdBy`

#### List documents (`GET /v1/docs`) — new

- Returns paginated list of `DocumentsEntity` for the authenticated user
- Query params: `entityId`, `entityType`, `type` (GENERATED / UPLOADED), `status`, `page`, `limit`
- When `entityId` + `entityType` are present, joins through `DocumentLinkEntity`

#### Delete document (`DELETE /v1/docs/:id`) — existing

- Soft-deletes the `DocumentsEntity` and removes the S3 file(s)
- Scoped to `createdBy`

---

## Data Model

### New tables (PostgreSQL)

#### `coms.email_batch`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `template_id` | uuid | FK → `templates.templates.id` |
| `from_email` | varchar | nullable — falls back to template default |
| `from_name` | varchar | nullable |
| `data` | jsonb | original data payload |
| `document_ids` | text[] | nullable — IDs passed as attachments |
| `job_id` | varchar | BullMQ job ID |
| `created_by` | uuid | nullable |
| `created_at` | timestamptz | |

#### `coms.email_recipient`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `batch_id` | uuid | FK → `coms.email_batch.id` |
| `to_email` | varchar | |
| `status` | enum | `PENDING`, `SENT`, `FAILED` |
| `sent_at` | timestamptz | nullable |
| `error_message` | text | nullable |

### Existing tables (changes)

- `docs.documents`: add `entity_id` (varchar, nullable) + `entity_type` (varchar, nullable) columns — denormalized alongside `DocumentLinkEntity` for quick filtering on `GET /docs`
- `docs.document-link`: no structural changes; populated at upload/generate time when caller provides entityId/entityType

---

## Validation Rules

- `toEmails`: non-empty array, each entry a valid email address
- `emailTemplate`: non-empty string (ID or name — service tries UUID lookup first, then name)
- `data`: must pass AJV validation against `templates.schema` — return `400 Bad Request` with field-level errors if it fails
- `documentIds`: optional array of UUIDs; worker throws if any ID resolves to a document with status != `READY`
- `fromEmail`: optional valid email; if omitted, falls back to `TemplateComEmailEntity.fromEmail`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Template not found | `404 Not Found` at API layer (before queuing) |
| `data` fails schema validation | `400 Bad Request` with validation details |
| Document ID not found or not READY | Worker throws — BullMQ retries; alert in worker logs |
| SMTP failure | Worker throws — BullMQ retries; `email_recipient` rows stay FAILED |
| Puppeteer crash | Worker throws — BullMQ retries |
| No S3 file found for document | Worker throws — BullMQ retries |

---

## Architecture Boundaries

```
API (fast path)                         Worker (async, retriable)
──────────────────────────────          ──────────────────────────────
POST /coms/send/email                   coms queue → EmailService
  → validate data vs template schema      → resolve documentIds → S3 streams
  → create email_batch + recipients       → parseEmail → subject + html
  → enqueue 'send-email'                  → nodemailer.sendMail
  → return { batchId, jobId }             → update recipient status

POST /docs/generate                     document queue → DocsProcessorService
  → validate data vs template schema      → Puppeteer.launch → PDF buffer
  → create DocumentsEntity (PENDING)      → S3 upload
  → enqueue 'generate-document'           → create version + storage rows
  → return { documentId, jobId }          → update document status → READY

POST /docs/upload                       (synchronous — stays on API)
  → S3.uploadFiles
  → create Documents + Version + Storage
  → optional: create DocumentLink
```

---

## Success Criteria

1. `POST /coms/send/email` returns in < 200 ms; delivery confirmed in worker logs
2. Failed send jobs are retried by BullMQ until success; recipient rows reflect current status
3. Resend (batch and per-recipient) re-queues without requiring the caller to re-supply data
4. `POST /docs/generate` enqueues within 200 ms; worker produces a valid PDF and marks document READY
5. `GET /docs?entityId=X&entityType=Y` returns only documents linked to that entity
6. All new endpoints have Swagger docs, DTOs with class-validator, and at least one unit test per service method
7. Template data validation returns field-level errors before any job is queued

---

## Open Questions

- Should `GET /docs/:id/url` and `GET /docs` be available to users who did NOT create the document (shared access via `entityId` lookup)? Or always scoped to `createdBy`?
- BullMQ retry policy for email/PDF jobs: max attempts and backoff strategy TBD at planning time.
- Puppeteer: should a shared browser instance be kept warm across jobs, or launch/close per job? (Performance vs memory trade-off — decide at planning time.)
