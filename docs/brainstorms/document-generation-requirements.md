# Document Generation Module — Requirements

**Date:** 2026-05-04  
**Status:** Ready for planning

---

## Problem

The system needs to generate multi-format documents (PDF, XLSX) from Handlebars templates that already drive email and SMS. The existing `GenerationService` uses a persistent Puppeteer browser but has no page pooling and no multi-format support. The worker `DocsModule` and API `DocsModule` are stubs.

---

## Goals

1. Wire `TemplatesService.parse()` → format-specific generator → S3 → DB in the worker.
2. Support **PDF** and **XLSX** generation. Word (DOCX) is deferred.
3. Reduce Puppeteer's Chromium footprint with a lighter binary + page pool.
4. Expose a CRUD API so callers can trigger generation and query document status.

---

## Non-Goals

- Word / DOCX generation (deferred)
- Client-side rendering
- Changes to the Handlebars parse pipeline or template schema validation
- New template categories beyond `DOCS`

---

## Template Language Decision

Handlebars is the single template language across email, SMS, and documents. This means:

- Email templates → `TemplatesService.parse()` → HTML body
- SMS templates → `TemplatesService.parse()` → plain-text string (stripped from HTML)
- Doc templates → `TemplatesService.parse()` → either HTML (for PDF) or JSON workbook definition (for XLSX)

The doc template's output format is determined by `TemplateDocEntity.format` (`PDF` or `EXCEL`).

---

## PDF Generation

### Why Puppeteer stays

Doc templates use:
- `<style>` blocks with CSS class selectors
- Flexbox and CSS Grid for form/table layouts
- A base template injecting `{{body}}` — child HTML rendered inside a styled shell

Non-browser PDF engines (html-to-pdfmake, pdfmake, pagedjs-cli) do not support CSS classes from `<style>` blocks or flexbox/grid layout. A browser renderer is required.

### Resource improvement

Replace the full Chromium bundle with **`@sparticuz/chromium-min`** (≈77 MB vs ≈400 MB) and **`puppeteer-core`**. API is identical to the current `puppeteer` import.

Add a **concurrent page pool** (e.g. `generic-pool`, max 4 pages) so burst requests reuse open pages instead of creating unbounded concurrent pages on the same browser instance.

```
browser (singleton, OnModuleInit)
  └── page pool (max 4)
        ├── page A — idle
        ├── page B — rendering job X
        └── page C — rendering job Y
```

---

## XLSX Generation

### Why HTML templates don't map to Excel

Excel files are structured workbooks (sheets → rows → cells), not rendered HTML. Flexbox/grid layout has no Excel equivalent.

### Approach: Handlebars → JSON workbook definition → exceljs

XLSX doc templates produce a **JSON workbook definition** via Handlebars, not HTML. The worker passes this JSON to **`exceljs`** to build the `.xlsx` file.

Example template output shape (rendered by Handlebars, consumed by `exceljs` builder):

```json
{
  "sheets": [
    {
      "name": "Paciente",
      "columns": [
        { "header": "Nombre", "key": "name", "width": 30 },
        { "header": "Fecha", "key": "date", "width": 15 }
      ],
      "rows": [
        { "name": "{{patientName}}", "date": "{{appointmentDate}}" }
      ]
    }
  ]
}
```

Handlebars fills in the dynamic values; `exceljs` reads the structure.

This is a new template sub-type under `TemplateCategoriesEnum.DOCS` with `format: EXCEL`. The `schema` field on `TemplatesEntity` validates the data passed to it (existing mechanism, unchanged).

---

## Worker: Generation Pipeline

```
QueueEnum.Document job received
  ├── read templateId + data + format from job payload
  ├── TemplatesService.parse({ identifier, data })  → { html, templateId }
  ├── route by TemplateDocEntity.format
  │     ├── PDF  → GenerationService.generatePDF(html)  → Buffer
  │     └── EXCEL → ExcelGenerationService.generate(jsonDef) → Buffer
  ├── S3Service.uploadFiles(...)                    → { path, bucket, etag }
  ├── persist DocumentsVersionEntity + DocumentStorageObjectEntity
  └── update DocumentsEntity.status = 'COMPLETED' (or 'FAILED' on error)
```

The job payload DTO (new, in `@hsm/common/dtos`) carries:

| Field | Type | Notes |
|---|---|---|
| `documentId` | `string` (UUID) | Pre-created `DocumentsEntity` row |
| `templateIdentifier` | `string` | UUID or name |
| `data` | `Record<string, unknown>` | Validated against template schema |
| `format` | `DocumentFormatsEnum` | Redundant with template but explicit |
| `outputBucket` | `string` | S3 bucket for the result |
| `outputFolder` | `string` | S3 folder path |

---

## API CRUD

Routes under `/v1/docs`. Auth guard applies (existing global guards).

| Method | Path | Description |
|---|---|---|
| `POST` | `/docs/generate` | Enqueue a generation job; creates `DocumentsEntity` with `status = 'PENDING'`; returns `documentId` |
| `GET` | `/docs/:id` | Fetch `DocumentsEntity` with latest version + storage metadata |
| `GET` | `/docs/:id/url` | Return presigned S3 URL for the generated file |
| `DELETE` | `/docs/:id` | Soft-delete document record; delete S3 object |

The existing `POST /docs/url` and `POST /docs/upload` endpoints remain unchanged — those handle externally-uploaded files, not generated ones.

---

## Data Model (existing entities, used as-is)

| Entity | Role |
|---|---|
| `DocumentsEntity` | Root record; carries `status`, `type`, `source` |
| `DocumentsVersionEntity` | One row per generated version; carries `mimeType`, `filename`, `size` |
| `DocumentStorageObjectEntity` | S3 coordinates for the version file |
| `DocumentsGeneratedEntity` | Links version to the template + data snapshot |
| `TemplateDocEntity` | `format`, `size`, `orientation`, `documentCode` for DOCS-category templates |

No new entities required. `DocumentsEntity.status` and `DocumentsEntity.type` columns need values agreed (`PENDING / PROCESSING / COMPLETED / FAILED` and `GENERATED` vs `UPLOADED`).

---

## Dependencies to add (worker only)

| Package | Purpose |
|---|---|
| `@sparticuz/chromium-min` | Lighter Chromium binary for containers |
| `puppeteer-core` | Puppeteer without bundled browser; replaces `puppeteer` |
| `generic-pool` | Page pool management |
| `exceljs` | XLSX file generation |

---

## Success Criteria

- Enqueueing a PDF generation job produces a `.pdf` file in S3 and a `COMPLETED` document record.
- Enqueueing an XLSX generation job produces a `.xlsx` file in S3 and a `COMPLETED` document record.
- Worker restarts do not leave zombie Chromium processes.
- Concurrent PDF jobs share the same browser instance via the page pool (no unbounded page creation).
- API returns a presigned URL for any completed document.
- Failed jobs set `status = FAILED` and do not leave orphan S3 objects.

---

## Out of Scope / Deferred

- **DOCX (Word):** No browser-equivalent CSS issue but low priority. Revisit when needed — `html-to-docx` is the likely path with accepted CSS limitations.
- **Template editor UI:** Out of scope for backend module.
- **Streaming large documents:** All files fit in memory for now (medical forms are small).
