/**
 * Feature-local mirrors of the backend document/template wire shapes plus the
 * testable async-generation polling helper (R18, KTD6).
 *
 * Following the `@hsm/web` rule (apps/frontend/web/CLAUDE.md): DTO/entity
 * *shapes* are mirrored locally rather than imported from `@hsm/common` — its
 * DTO/interface barrels drag in `@nestjs/swagger`, `@hsm/database`, and Node
 * globals that the browser build cannot type-check. Status *values*, however,
 * come straight from `@hsm/common/enums` (`DocumentStatusEnum`) — never
 * re-declared — so they stay in lockstep with the backend.
 *
 * Canonical sources:
 * - `packages/database/.../core/docs/documents.entity.ts` (`DocumentsEntity`)
 * - `packages/common/src/dtos/docs.dto.ts`
 *   (`GenerateDocumentRequestDto`, `ListDocumentsQueryDto`)
 * - `packages/common/src/dtos/templates.dto.ts` (`TemplateDetailDto`)
 * - `apps/backend/api/.../core/docs/docs.controller.ts` (endpoints)
 *
 * Keep these in lockstep with the backend if the contracts change.
 */
import { DocumentStatusEnum } from '@hsm/common/enums';
import {
  type Observable,
  type SchedulerLike,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs';

/**
 * Mirror of `DocumentsEntity` as returned by `GET /v1/docs/:id` and the rows of
 * `GET /v1/docs` (only the fields the console reads). `status` is a
 * `DocumentStatusEnum` *value* string.
 */
export interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  /** `DocumentTypeEnum` value: `GENERATED` | `UPLOADED`. */
  type: string;
  /** `DocumentStatusEnum` value: `PENDING` | `PROCESSING` | `COMPLETED` | `FAILED`. */
  status: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Mirror of `POST /v1/docs/generate` body (`GenerateDocumentRequestDto`). */
export interface GenerateDocumentRequest {
  templateIdentifier: string;
  data: Record<string, unknown>;
  title: string;
  description?: string;
  entityId?: string;
  entityType?: string;
}

/** Mirror of the `POST /v1/docs/generate` response (`{ documentId, jobId }`). */
export interface GenerateDocumentResponse {
  documentId: string;
  jobId: string | number | null;
}

/** Mirror of the `GET /v1/docs/:id/url` response (`{ url }`). */
export interface DocumentUrlResponse {
  url: string;
}

/**
 * Mirror of `TemplateDetailDto` (only the fields the picker/form read). The
 * `schema` is the backend mini-schema describing the shape of `data` expected
 * by the template — used to drive the data-entry form.
 */
export interface DocsTemplate {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  /** Backend mini-schema: leaf values are `'string' | 'number' | ...`. */
  schema: Record<string, unknown>;
}

/** A single data-entry field derived from a template `schema` leaf. */
export interface SchemaField {
  /** The schema key, also the `data` property name sent to the backend. */
  key: string;
  /** Resolved input kind for the form control. */
  kind: 'string' | 'number' | 'boolean' | 'date' | 'any';
  /** Whether the field is optional (schema leaf had a `?` suffix). */
  optional: boolean;
}

/** Terminal states that stop polling. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  DocumentStatusEnum.COMPLETED,
  DocumentStatusEnum.FAILED,
]);

/** True once a document leaves PENDING/PROCESSING for a terminal state. */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Options controlling {@link pollDocumentStatus}'s back-off / termination. */
export interface PollOptions {
  /** Milliseconds between poll attempts. Default 1500ms. */
  intervalMs?: number;
  /**
   * Hard cap on the number of poll attempts. Once reached the stream completes
   * even if the document is still PENDING — guarantees termination on a stuck
   * job rather than looping forever. Default 20.
   */
  maxAttempts?: number;
  /** Injectable scheduler so specs can drive polling with fake timers. */
  scheduler?: SchedulerLike;
}

export const DEFAULT_POLL_INTERVAL_MS = 1500;
export const DEFAULT_POLL_MAX_ATTEMPTS = 20;

/**
 * Polls `fetchDocument` on a fixed interval until the document reaches a
 * terminal status (COMPLETED | FAILED) or the attempt cap is hit, then
 * completes.
 *
 * Termination guarantees (KTD6):
 * - `takeWhile(..., inclusive=true)` emits the terminal document and stops, so
 *   a COMPLETED/FAILED result ends polling immediately.
 * - `take(maxAttempts)` caps total attempts so a job stuck in PENDING can never
 *   poll forever — the stream completes after at most `maxAttempts` emissions.
 * - An error from `fetchDocument` propagates and ends the stream.
 *
 * The last value the stream emits is the most recent {@link DocumentRecord}; if
 * it is terminal, callers act on its status. Extracted as a free function so it
 * is unit-testable with fake timers, independent of any component.
 */
export function pollDocumentStatus(
  fetchDocument: () => Observable<DocumentRecord>,
  options: PollOptions = {},
): Observable<DocumentRecord> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS,
  );

  return timer(0, intervalMs, options.scheduler).pipe(
    // Cap attempts: emits indices 0..maxAttempts-1 then completes.
    takeWhile((attempt: number) => attempt < maxAttempts),
    switchMap(() => fetchDocument()),
    // Inclusive: emit the terminal doc, then stop polling.
    takeWhile(doc => !isTerminalStatus(doc.status), true),
  );
}

/**
 * Translates a backend template `schema` into an ordered list of data-entry
 * fields. Each schema leaf is a string like `'string'`, `'number?'`, `'date'`;
 * a trailing `?` marks the field optional. Nested objects / arrays are
 * surfaced as free-form (`any`) fields keyed by their top-level name (the form
 * keeps them as raw text the caller can JSON-encode). Drives the generate form.
 */
export function schemaToFields(schema: Record<string, unknown>): SchemaField[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }
  return Object.entries(schema).map(([key, raw]) => {
    if (typeof raw === 'string') {
      const optional = raw.endsWith('?');
      const base = (optional ? raw.slice(0, -1) : raw).trim().toLowerCase();
      const kind: SchemaField['kind'] =
        base === 'string' ||
        base === 'number' ||
        base === 'boolean' ||
        base === 'date'
          ? base
          : 'any';
      return { key, kind, optional };
    }
    // Objects / arrays => free-form entry.
    return { key, kind: 'any', optional: false };
  });
}
