---
title: "feat: Document Generation Module (PDF + XLSX)"
type: feat
status: active
date: 2026-05-04
origin: docs/brainstorms/document-generation-requirements.md
---

# feat: Document Generation Module (PDF + XLSX)

## Summary

Implement end-to-end document generation: the API creates a `DocumentsEntity` record and enqueues a `document` queue job; the worker parses the Handlebars template via `TemplatesService.parse()`, routes to a PDF generator (Puppeteer with lighter Chromium + page pool) or XLSX generator (`exceljs`), uploads the result to S3, and persists the version/storage entities with a final status. The API exposes four CRUD endpoints for triggering and querying generated documents.

---

## Problem Frame

Documents (medical HCU forms, spreadsheets) must be generated from Handlebars templates already used for email/SMS. The existing `GenerationService` uses a full Puppeteer browser with no page pool and no multi-format support. The worker `DocsModule` and API `DocsModule` are both stubs. See origin doc for full context.

---

## Requirements

- R1. Worker generates a PDF `Buffer` from HTML produced by `TemplatesService.parse()` and uploads it to S3
- R2. Worker generates an XLSX `Buffer` from a JSON workbook definition produced by `TemplatesService.parse()` and uploads it to S3
- R3. Worker updates `DocumentsEntity.status` to `COMPLETED` or `FAILED` after each attempt
- R4. Puppeteer uses `puppeteer-core` + `@sparticuz/chromium-min` binary; a `generic-pool` page pool limits concurrent page usage
- R5. API `POST /docs/generate` creates a `DocumentsEntity` (status `PENDING`) and enqueues a job, returning the `documentId`
- R6. API `GET /docs/:id` returns document metadata with the latest version
- R7. API `GET /docs/:id/url` returns a presigned S3 URL for the generated file
- R8. API `DELETE /docs/:id` soft-deletes the document record and removes the S3 object
- R9. Existing `DocsService.getDocumentsStreams()` (used by email attachment flow) is not broken

---

## Scope Boundaries

- Word/DOCX generation is deferred (no timeline)
- `DocumentLinkEntity` wiring to clinical entities (patients, appointments) is deferred to implementation iteration — payload shape must leave room for future `entityId`/`entityType` but the worker will not write link rows in this plan
- Per-job generation metrics and monitoring are out of scope
- Existing `POST /docs/url` and `POST /docs/upload` endpoints are unchanged

### Deferred to Follow-Up Work

- `DocumentLinkEntity` row creation: separate PR once the calling context (patient ID, appointment ID) is wired into the generate request
- Word/DOCX support: revisit when needed; `html-to-docx` is the likely path

---

## Context & Research

### Relevant Code and Patterns

- `apps/backend/worker/src/modules/core/coms/coms.service.ts` — BullMQ processor pattern: `@Processor(QueueEnum.Coms)`, extends `QueueWorkerHost`, `handle(job)` with `switch(job.name)` dispatch; errors re-thrown so BullMQ retries
- `packages/queue/src/queue.worker-host.ts` — base class for all processors; handles lifecycle logging and `workerFailed` re-throw
- `apps/backend/api/src/modules/core/coms/coms.service.ts` — producer pattern: `@InjectQueue(QueueEnum.Coms)`, `queue.add('send-email', payload)`
- `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — existing Puppeteer singleton; replace `puppeteer` import with `puppeteer-core` + `@sparticuz/chromium-min` here
- `apps/backend/worker/src/modules/core/docs/docs.service.ts` — existing stream retrieval; **do not modify** — email attachment flow depends on it
- `packages/common/src/dtos/core-coms.dto.ts` — `SendEmailPayloadDto` shape to mirror for new `GenerateDocumentPayloadDto`
- `packages/common/src/enums/core-docs.enum.ts` — add `DocumentStatusEnum`, `DocumentTypeEnum`, `DocumentSourceEnum` here
- `packages/storage/src/s3/s3.service.ts` — `uploadFiles(S3FileUploadPayloadDto)` returns `{ bucket, files: [{ fileId, filename, key }] }[]`; `fileId` is the UUID to use as `DocumentStorageObjectEntity.id`

### Institutional Learnings

- **TypeORM circular import / entity silent drop** (`docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md`): Always import entities from `@hsm/database/entities` (root path). Deep subpath imports silently empty the entity array. Verify new barrels are re-exported in `entities/modules/core/index.ts`. Run `start:dev` after any module/entity change — build success is not enough.
- **`GenerationModule` does not currently export `GenerationService`** — must add `exports: [GenerationService]` before the processor can inject it.
- **`DocsService` in the worker is used by `EmailService` for attachment streaming** — processor must be a separate class; do not replace `DocsService`.
- **`DocumentStorageObjectEntity.id` is a `@PrimaryColumn('uuid')` set by the caller**, not auto-generated — use the `fileId` from the S3 upload result.
- **`QueueModule` is `@Global()`** — `@InjectQueue(QueueEnum.Document)` works in any module without importing `QueueModule` again.
- **`DatabaseModule` is `@Global()`** — `@InjectRepository(Entity, DatabasesEnum.HsmDbPostgres)` resolves everywhere without `forFeature` in feature modules.

### External References

- `@sparticuz/chromium-min` — minimal Chromium build for containers; drop-in for `puppeteer-core`'s `executablePath`
- `exceljs` — XLSX workbook builder; `Workbook`, `addWorksheet`, `addRow`, `xlsx.writeBuffer()`
- `generic-pool` — `createPool({ create, destroy }, { min, max })`; `acquire()` / `release()`

---

## Key Technical Decisions

- **PDF keeps browser-based rendering**: CSS Grid, flexbox, and `<style>` class blocks in doc templates require a real browser engine. Non-browser tools (html-to-pdfmake, pagedjs-cli) do not support these. (see origin: `docs/brainstorms/document-generation-requirements.md`)
- **`puppeteer-core` + `@sparticuz/chromium-min`**: Same API as current `puppeteer`; lighter Chromium binary (~77 MB vs ~400 MB). Change is isolated to `GenerationService` and `package.json` of the worker.
- **Page pool via `generic-pool`**: The browser singleton already exists (`OnModuleInit`). The pool sits on top, limiting concurrent pages to avoid unbounded memory growth under burst load. Pool lifecycle tied to the browser lifecycle in `GenerationService`.
- **Excel output = Handlebars → JSON workbook definition**: Handlebars renders a JSON string; the worker parses it and passes to `exceljs`. This keeps Handlebars as the single template language without requiring a separate template DSL. The template schema validates the data shape; the rendered JSON must be parseable — a JSON parse error fails the job.
- **Processor is a new `DocsProcessorService`**: `DocsService` handles S3 streaming (used by email attachments) and must stay unchanged. The BullMQ processor concern is additive, not a replacement.
- **API creates `DocumentsEntity` synchronously before enqueueing**: Gives the caller an immediate `documentId` to poll without waiting for the worker. Status starts at `PENDING`.
- **`DocumentStatusEnum` / `DocumentTypeEnum` / `DocumentSourceEnum` added to `@hsm/common/enums`**: Entity columns are currently raw strings; these enums formalize the values without a migration risk since TypeORM will use string enum column type.

---

## Open Questions

### Resolved During Planning

- *Can we replace Puppeteer?* No for PDF — CSS Grid/flexbox/style-blocks require browser rendering. Improvement = lighter binary + page pool. (see origin)
- *Does `GenerationModule` export `GenerationService`?* No, it's private. Must be exported as a prerequisite (U2).
- *Is `DocsService` safe to modify?* No — email attachment flow calls `getDocumentsStreams()`. Processor must be a new class (U4).
- *What is `DocumentStorageObjectEntity.id`?* A `@PrimaryColumn('uuid')` set by caller = S3 `fileId` from upload result.

### Deferred to Implementation

- Exact `generic-pool` configuration (max pages, acquire timeout, eviction interval) — tune under observed load
- Whether to log `DocumentAuditLogEntity` rows on generation events — straightforward addition but needs agreed `action` string values
- JSON parse error handling in Excel path — decide whether to expose template author error message or a generic "template output is not valid JSON" message

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
API Request (POST /docs/generate)
  │
  ├─ DocsService.generateDocument(dto)
  │     ├─ Create DocumentsEntity { status: PENDING, type: GENERATED, source: TEMPLATE }
  │     ├─ docsQueue.add('generate-document', { documentId, templateIdentifier, data, format, outputBucket, outputFolder })
  │     └─ return { documentId }
  │
  └─ (async) Worker: DocsProcessorService.handle(job)
        ├─ Update DocumentsEntity.status = PROCESSING
        ├─ templatesService.parse({ identifier, data }) → { html, templateId }
        │
        ├─ [PDF path] generationService.generatePDF(html) → Buffer
        │     └─ pagePool.acquire() → page
        │           page.setContent(html) → page.pdf() → release page
        │
        ├─ [XLSX path] excelService.generate(JSON.parse(html)) → Buffer
        │     └─ new Workbook() → addWorksheet → addRows → xlsx.writeBuffer()
        │
        ├─ s3Service.uploadFiles({ bucket, files: [{ folderName, fileInfo: { fileName, fileBuffer, contentType } }] })
        │     └─ returns [{ files: [{ fileId, filename, key }] }]
        │
        ├─ Persist DocumentsVersionEntity + DocumentStorageObjectEntity (fileId as PK) + DocumentsGeneratedEntity
        └─ Update DocumentsEntity.status = COMPLETED (or FAILED on any throw)
```

---

## Implementation Units

- U1. **Common layer: enums and job payload DTO**

**Goal:** Add `DocumentStatusEnum`, `DocumentTypeEnum`, `DocumentSourceEnum` to `@hsm/common/enums`, and add `GenerateDocumentJobPayloadDto` to `@hsm/common/dtos`. These are the shared contracts used by both the API and worker.

**Requirements:** R1, R2, R3, R5

**Dependencies:** None

**Files:**
- Modify: `packages/common/src/enums/core-docs.enum.ts`
- Modify: `packages/common/src/enums/index.ts`
- Modify: `packages/common/src/dtos/core-docs.dto.ts`
- Modify: `packages/common/src/dtos/index.ts`

**Approach:**
- Add `DocumentStatusEnum { PENDING, PROCESSING, COMPLETED, FAILED }` to `core-docs.enum.ts`
- Add `DocumentTypeEnum { GENERATED, UPLOADED }` to `core-docs.enum.ts`
- Add `DocumentSourceEnum { TEMPLATE, MANUAL }` to `core-docs.enum.ts`
- Add `GenerateDocumentJobPayloadDto` to `core-docs.dto.ts` with fields: `documentId: string` (UUID, pre-created by API), `templateIdentifier: string`, `data: Record<string, unknown>`, `outputBucket: string`, `outputFolder: string` — **`format` is intentionally omitted**: the worker resolves it from `TemplateDocEntity.format` during processing, so the API does not need to fetch the template or carry format knowledge
- Add `GenerateDocumentRequestDto` (API-facing HTTP body) with fields: `templateIdentifier: string`, `data: Record<string, unknown>`, `title: string`, `description?: string`, `outputBucket?: string`, `outputFolder?: string`
- Export new symbols from their respective barrel `index.ts` files

**Patterns to follow:**
- `packages/common/src/enums/core-docs.enum.ts` — existing enum style
- `packages/common/src/dtos/core-coms.dto.ts` — `SendEmailPayloadDto` shape for job payload

**Test scenarios:**
- Test expectation: none — this unit is pure type/shape declarations with no runtime logic

**Verification:**
- `pnpm --filter @hsm/common build` passes without errors
- New types are importable via `@hsm/common/enums` and `@hsm/common/dtos`

---

- U2. **Worker: lighter Puppeteer + page pool + export GenerationService**

**Goal:** Replace `puppeteer` with `puppeteer-core` + `@sparticuz/chromium-min`, wrap the browser singleton with a `generic-pool` page pool, and export `GenerationService` from `GenerationModule`.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `apps/backend/worker/package.json` (swap `puppeteer` → `puppeteer-core`, add `@sparticuz/chromium-min`, add `generic-pool` + `@types/generic-pool`)
- Modify: `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts`
- Modify: `apps/backend/worker/src/modules/core/docs/generation/generation.module.ts`
- Test: `apps/backend/worker/src/modules/core/docs/generation/generation.service.spec.ts`

**Approach:**
- In `GenerationService.onModuleInit()`: replace `puppeteer.launch(...)` with `puppeteer.launch({ executablePath: await chromium.executablePath(), headless: chromium.headless, args: chromium.args })` where `chromium` is `@sparticuz/chromium-min`
- Create a `generic-pool` pool of `puppeteer.Page` objects inside `GenerationService`: `create` = `browser.newPage()` + `setJavaScriptEnabled(false)`, `destroy` = `page.close()`
- `generatePDF(html)`: acquire a page from pool, set content, render, release page (release in `finally`)
- `onModuleDestroy()`: drain pool then close browser (pool drain before browser close avoids dangling page references)
- In `GenerationModule`: add `exports: [GenerationService]`
- Pool config: min 0, max 4 — tune at implementation time

**Patterns to follow:**
- `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — existing `OnModuleInit`/`OnModuleDestroy` lifecycle pattern

**Test scenarios:**
- Happy path: `generatePDF(validHtml)` returns a non-empty `Buffer`
- Page release: after `generatePDF` resolves (or rejects), the pool has the same number of available pages as before the call (no leak)
- Concurrent calls: two simultaneous `generatePDF` calls both complete without errors (pool acquires two pages)
- Destroy on module destroy: `onModuleDestroy()` closes browser without throwing even if pool has idle pages

**Verification:**
- Worker starts without errors (`start:dev` reaches DB connection phase)
- `GenerationService` is injectable in sibling modules after the export fix
- Chromium process is smaller than before (verify with `ps aux | grep chrom`)

---

- U3. **Worker: Excel generation service**

**Goal:** Add `ExcelGenerationService` that accepts a JSON workbook definition (as a parsed object) and returns an XLSX `Buffer` via `exceljs`.

**Requirements:** R2

**Dependencies:** U2 (in the same module; `GenerationModule` is being edited in U2)

**Files:**
- Create: `apps/backend/worker/src/modules/core/docs/generation/excel-generation.service.ts`
- Modify: `apps/backend/worker/src/modules/core/docs/generation/generation.module.ts` (add provider + export)
- Test: `apps/backend/worker/src/modules/core/docs/generation/excel-generation.service.spec.ts`

**Approach:**
- `ExcelGenerationService` is a plain `@Injectable()` — no lifecycle hooks needed
- Accepts a `WorkbookDefinition` object (typed locally; not shared via `@hsm/common` since it's an implementation detail): `{ sheets: Array<{ name: string; columns: Array<{ header: string; key: string; width?: number }>; rows: Array<Record<string, unknown>> }> }`
- Creates an `exceljs.Workbook`, iterates sheets, adds columns, adds rows, calls `workbook.xlsx.writeBuffer()` → returns `Buffer`
- Column/row mapping is direct: `worksheet.columns = sheet.columns`, `worksheet.addRow(row)` per row
- Add `exceljs` to `apps/backend/worker/package.json`

**Patterns to follow:**
- `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — service structure in same module

**Test scenarios:**
- Happy path: single sheet with 2 columns and 3 rows produces a non-empty Buffer; buffer is a valid XLSX (parse back with exceljs and verify row count)
- Multiple sheets: definition with 2 sheets produces a workbook with 2 worksheets
- Empty rows: sheet with 0 rows produces a workbook with the correct column headers but no data rows
- Missing optional `width`: worksheet is created without error when `width` is undefined on a column

**Verification:**
- Worker starts without DI errors
- Spec file passes

---

- U4. **Worker: document queue processor**

**Goal:** Create `DocsProcessorService` — the `@Processor(QueueEnum.Document)` class that orchestrates template parsing → format routing → S3 upload → entity persistence → status update.

**Requirements:** R1, R2, R3, R9

**Dependencies:** U1 (enums + job DTO), U2 (`GenerationService` exported), U3 (`ExcelGenerationService` exported)

**Files:**
- Create: `apps/backend/worker/src/modules/core/docs/docs-processor.service.ts`
- Modify: `apps/backend/worker/src/modules/core/docs/docs.module.ts` (add `DocsProcessorService` to providers, add `TemplatesModule` import if not present)
- Test: `apps/backend/worker/src/modules/core/docs/docs-processor.service.spec.ts`

**Approach:**
- `DocsProcessorService extends QueueWorkerHost`, decorated `@Processor(QueueEnum.Document)`
- Constructor injects: `TemplatesService`, `GenerationService`, `ExcelGenerationService`, `S3Service`, and four TypeORM repositories (`DocumentsEntity`, `DocumentsVersionEntity`, `DocumentStorageObjectEntity`, `DocumentsGeneratedEntity`) via `@InjectRepository(Entity, DatabasesEnum.HsmDbPostgres)`
- `handle(job: Job)` dispatches on `job.name`:
  - `'generate-document'`: cast `job.data` as `GenerateDocumentJobPayloadDto`, call `processGenerateDocument(data)`
  - `default`: throw `new Error('Unknown document job: ' + job.name)`
- `processGenerateDocument(data)` sequence:
  1. Update `DocumentsEntity.status = DocumentStatusEnum.PROCESSING`
  2. `templatesService.parse({ identifier: data.templateIdentifier, data: data.data })` → `{ html, templateId }`
  3. Fetch `TemplateDocEntity` via `templatesService.findByIdentifier(data.templateIdentifier, { withChildren: true })` to get `format`, `size`, `orientation` — `withChildren: true` loads the `doc` relation on `TemplatesEntity` which is `TemplateDocEntity`; `TemplatesService.findByIdentifier` is confirmed to exist with this signature
  4. Route on `format`:
     - `PDF` → `generationService.generatePDF(html)` → `buffer`, `contentType = 'application/pdf'`, `filename = '<code>-<timestamp>.pdf'`
     - `EXCEL` → `excelService.generate(JSON.parse(html))` → `buffer`, `contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`, `filename = '<code>-<timestamp>.xlsx'`
  5. `s3Service.uploadFiles(...)` → `{ fileId, key }`
  6. Persist entities within a TypeORM transaction: `DocumentsVersionEntity` (version=1, mimeType, filename, size=buffer.length) + `DocumentStorageObjectEntity` (id=fileId, path=key, bucket) + `DocumentsGeneratedEntity` (templateName, data). If this transaction fails, the S3 object already exists but the DB has no record — acceptable for v1 (retry will re-upload)
  7. Update `DocumentsEntity.status = DocumentStatusEnum.COMPLETED` — this is a separate `save` call outside the version/storage transaction; it executes only when step 6 succeeds
- Wrap steps 2-7 in a try/catch; on any thrown error (from any step): call `docsRepository.update(data.documentId, { status: DocumentStatusEnum.FAILED })` then **re-throw** so BullMQ retries (critical per `QueueWorkerHost` contract). Note: the `FAILED` status update is a standalone save and does not affect the version/storage transaction scope
- `findByIdentifier` for XLSX path to get `documentCode` for filename — resolve at implementation time whether to cache this or call twice

**Execution note:** Implement `processGenerateDocument` test-first — the state transitions (PROCESSING → COMPLETED / FAILED) and the entity persistence are the highest-risk behaviors.

**Patterns to follow:**
- `apps/backend/worker/src/modules/core/coms/coms.service.ts` — `@Processor`, `QueueWorkerHost`, `switch(job.name)`, re-throw pattern
- `apps/backend/worker/src/modules/core/coms/email/email.service.ts` — injecting `TemplatesService` and `DocsService`

**Test scenarios:**
- Happy path PDF: job with `format=PDF` and valid template identifier → `DocumentsEntity.status` = `COMPLETED`, `DocumentsVersionEntity` row created with correct `mimeType = 'application/pdf'`, `DocumentStorageObjectEntity` row created with correct `fileId`
- Happy path XLSX: job with `format=EXCEL` and valid template identifier → `DocumentsEntity.status` = `COMPLETED`, `DocumentsVersionEntity` row created with `mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`
- Template not found: `templatesService.parse` throws `TemplateNotFoundError` → `DocumentsEntity.status` = `FAILED`, error re-thrown (BullMQ will retry)
- Schema validation failure: `templatesService.parse` throws `TemplateSchemaValidationError` → `DocumentsEntity.status` = `FAILED`, error re-thrown
- S3 upload failure: `s3Service.uploadFiles` throws → `DocumentsEntity.status` = `FAILED`, error re-thrown
- Invalid XLSX template output: `JSON.parse(html)` throws `SyntaxError` → `DocumentsEntity.status` = `FAILED`, error re-thrown
- Unknown job name: `handle` called with unknown `job.name` → throws `Error('Unknown document job: ...')` without touching entities
- Integration: end-to-end flow from job enqueue through entity persistence — status transitions PENDING → PROCESSING → COMPLETED in order

**Verification:**
- Worker starts without DI errors after adding new providers
- All test scenarios pass
- Manually enqueue a `generate-document` job via a test script; verify S3 object and DB rows created

---

- U5. **API: CRUD endpoints for document generation**

**Goal:** Implement the four API endpoints: `POST /docs/generate`, `GET /docs/:id`, `GET /docs/:id/url`, `DELETE /docs/:id`. The generate endpoint creates a `DocumentsEntity` record synchronously and enqueues the job.

**Requirements:** R5, R6, R7, R8, R9

**Dependencies:** U1 (enums + request DTO)

**Files:**
- Modify: `apps/backend/api/src/modules/core/docs/docs.service.ts`
- Modify: `apps/backend/api/src/modules/core/docs/docs.controller.ts`
- Modify: `apps/backend/api/src/modules/core/docs/docs.module.ts` (add `@InjectQueue(QueueEnum.Document)` dependency, add entity repository injections)
- Test: `apps/backend/api/src/modules/core/docs/docs.service.spec.ts`

**Approach:**
- `DocsService` constructor: add `@InjectQueue(QueueEnum.Document) private docsQueue: Queue`, `@InjectRepository(DocumentsEntity, DatabasesEnum.HsmDbPostgres) private docs: Repository<DocumentsEntity>`, `@InjectRepository(DocumentsVersionEntity, ...) private versions: Repository<DocumentsVersionEntity>`, `@InjectRepository(DocumentStorageObjectEntity, ...) private storageObjects: Repository<DocumentStorageObjectEntity>` (needed by `deleteDocument` to iterate storage objects for S3 deletion)
- `generateDocument(dto: GenerateDocumentRequestDto, userId?: string)`:
  1. Resolve `outputBucket` (default to `'hsm-docs'` if not provided), `outputFolder` (default to `'generated'` or a path derived from template code — decide at implementation time)
  2. Create and save `DocumentsEntity { title: dto.title, description: dto.description, type: DocumentTypeEnum.GENERATED, status: DocumentStatusEnum.PENDING, source: DocumentSourceEnum.TEMPLATE }`
  3. Build `GenerateDocumentJobPayloadDto` with the saved `documentId`
  4. `await docsQueue.add('generate-document', jobPayload)` using `QueueEnum.Document`
  5. Return `{ documentId: doc.id }`
- `getDocument(id)`: `findOne` with `relations: { versions: { storage: true } }` — throw `NotFoundException` if not found or soft-deleted
- `getDocumentUrl(id)`: call `getDocument(id)`, extract storage path+bucket from latest version, call `s3Service.generatePresignedUrls(...)` — reuse existing pattern from `getDocumentsUrl()`
- `deleteDocument(id)`: `softDelete(id)` on `DocumentsEntity`, then call `s3Service.deleteFiles(...)` for each version's storage object
- Controller: wire four routes `POST /docs/generate`, `GET /docs/:id`, `GET /docs/:id/url`, `DELETE /docs/:id`; apply `@Roles()` and `@ApiDocumentation()` per existing pattern; keep existing `POST /docs/url`, `POST /docs/upload`, `POST /docs/create` routes untouched

**Patterns to follow:**
- `apps/backend/api/src/modules/core/coms/coms.service.ts` — `@InjectQueue`, `queue.add(QueueEnum.X, payload)` producer pattern
- `apps/backend/api/src/modules/core/docs/docs.service.ts` — existing `getDocumentsUrl`, `uploadDocuments`, `deleteDocuments` implementations
- `apps/backend/api/src/modules/core/docs/docs.controller.ts` — `@ApiDocumentation()`, `@Roles()`, `@Controller('docs')` pattern

**Test scenarios:**
- Happy path generate: valid `GenerateDocumentRequestDto` → `DocumentsEntity` persisted with `status=PENDING`, `docsQueue.add` called once with correct payload, returns `documentId`
- Missing optional fields: `description` and `outputBucket` omitted → entity created with nullable description, default bucket applied
- Get document: `getDocument(existingId)` returns entity with version relations loaded
- Get document not found: `getDocument(unknownId)` throws `NotFoundException`
- Get document URL: `getDocumentUrl(id)` calls `s3Service.generatePresignedUrls` with correct bucket + path from latest version
- Delete document: `deleteDocument(id)` calls `docs.softDelete(id)` and `s3Service.deleteFiles` for all version storage objects
- Integration: `POST /docs/generate` with a valid body returns `201` with `{ data: { documentId: '<uuid>' } }` (wrapped by `ResponseInterceptor`)

**Verification:**
- API starts without DI errors
- `POST /docs/generate` returns HTTP 201 with a UUID in the response
- Swagger UI at `http://localhost:10001/api` shows all four new endpoints

---

## System-Wide Impact

- **Interaction graph:** `EmailService` calls `DocsService.getDocumentsStreams()` for attachments — this method must stay intact in the worker's `DocsService`. The new `DocsProcessorService` is additive in `DocsModule`.
- **Error propagation:** `DocsProcessorService` re-throws all errors after setting `status=FAILED` — BullMQ gets the rejection and applies 3-attempt retry with 2s backoff (queue defaults). On final failure, the document record stays at `FAILED` status.
- **State lifecycle risks:** If the worker crashes mid-generation (between S3 upload and entity persist), the S3 object exists but the DB record stays at `PROCESSING`. On retry, the job will re-generate and re-upload (idempotency gap). Acceptable for now — document is small, cost is a duplicate S3 object that gets overwritten.
- **API surface parity:** `GET /docs/:id/url` reuses the `generatePresignedUrls` logic already in `DocsService`. The existing `POST /docs/url` endpoint (batch presigned URL) is unchanged.
- **Integration coverage:** Worker-side tests should verify the full PENDING → PROCESSING → COMPLETED state machine. Mocked `TemplatesService` and `S3Service` suffice for unit tests; integration should hit a real Postgres instance.
- **Unchanged invariants:** `DocsService.getDocumentsStreams()` in the worker is not modified. `DocsService.getDocumentsUrl()`, `uploadDocuments()`, and `deleteDocuments()` in the API are not modified.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `@sparticuz/chromium-min` binary not available at container build time | Verify package includes the binary or fetches it at postinstall; confirm Docker layer caching handles it |
| `generic-pool` page leak if `generatePDF` throws before `release` | `release` in `finally` block — verified in spec (page count invariant test) |
| Excel template Handlebars output is not valid JSON | JSON parse error caught, status set to `FAILED`, re-thrown; template author will see job failure in BullMQ dashboard |
| TypeORM entity registration (`DocumentsEntity` etc.) fails silently | All docs entities already verified in barrel chain; run `start:dev` after each module change |
| `DocsModule` circular dependency if `DocsProcessorService` injects both `TemplatesModule` and `GenerationModule` | `DocsModule` already imports both — adding a new provider to the same module avoids new cross-module edges |
| S3 upload + DB persist race: crash between the two leaves orphan S3 object | Acceptable for v1 — retry creates a new S3 object; cleanup deferred to a maintenance job |

---

## Sources & References

- **Origin document:** [docs/brainstorms/document-generation-requirements.md](../brainstorms/document-generation-requirements.md)
- Related code: `apps/backend/worker/src/modules/core/coms/coms.service.ts` — processor pattern
- Related code: `apps/backend/worker/src/modules/core/docs/generation/generation.service.ts` — Puppeteer singleton
- Related code: `packages/common/src/dtos/core-docs.dto.ts` — existing doc DTOs
- Related code: `packages/database/src/entities/modules/core/docs/` — entity hierarchy
- Institutional learning: `docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md`
