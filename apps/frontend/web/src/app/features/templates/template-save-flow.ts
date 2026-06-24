import { Injectable, inject } from '@angular/core';
import { TemplateCategoriesEnum } from '@hsm/common/enums';
import { map, type Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';
import type {
  CreateTemplatePayload,
  DraftRenderPayload,
  DraftRenderResponse,
  SaveRequest,
  TemplateDetail,
  UpdateTemplatePayload,
} from './template.types';
import { deriveSchemaFromSampleData } from './template-preview.util';

const TEMPLATES_PATH = '/templates';
const DRAFT_RENDER_PATH = '/templates/draft-render';

/**
 * The true-preview-on-save gate (U14, R17; AE1, AE2).
 *
 * This service is the single, testable home for the Save flow so the gate logic
 * never lives buried in template-only component code:
 *
 * 1. {@link draftRender} POSTs `{ content, baseTemplateId?, sampleData? }` to
 *    `POST /v1/templates/draft-render` and returns the TRUE server-composed HTML
 *    (including base composition, which may DIFFER from the client preview).
 *    A draft-render failure surfaces as an `ApiError` from the `ApiClient` — the
 *    caller MUST NOT persist when it rejects.
 * 2. The caller shows that HTML in a confirm dialog.
 * 3. Only on confirm does the caller call {@link persist}, which routes to
 *    `PUT /v1/templates/:id` (when editing an existing template) or
 *    `POST /v1/templates` (when new). Cancel persists nothing.
 *
 * Keeping draft-render and persist as two separate calls is what guarantees the
 * gate: nothing reaches `/v1/templates` until the author confirms.
 */
@Injectable({ providedIn: 'root' })
export class TemplateSaveFlow {
  private readonly api = inject(ApiClient);

  /**
   * Step 1 of the gate: ask the backend to compose the draft and return the
   * true HTML. Does NOT persist anything. Errors propagate as `ApiError`.
   */
  draftRender(payload: DraftRenderPayload): Observable<string> {
    return this.api
      .post<DraftRenderResponse>(DRAFT_RENDER_PATH, payload)
      .pipe(map(res => res.html));
  }

  /**
   * Step 3 of the gate (confirm-only): persist the template. Routes to UPDATE
   * when `request.loadedId` is set, else CREATE. Returns the persisted template.
   */
  persist(request: SaveRequest): Observable<TemplateDetail> {
    if (request.loadedId) {
      return this.api.put<TemplateDetail>(
        `${TEMPLATES_PATH}/${encodeURIComponent(request.loadedId)}`,
        this.buildUpdatePayload(request),
      );
    }
    return this.api.post<TemplateDetail>(
      TEMPLATES_PATH,
      this.buildCreatePayload(request),
    );
  }

  /** Convenience seam for `draftRender({ content, baseTemplateId, sampleData })`. */
  toDraftPayload(request: SaveRequest): DraftRenderPayload {
    return {
      content: request.content,
      baseTemplateId: request.baseTemplateId,
      sampleData: request.sampleData,
    };
  }

  /**
   * CREATE payload (R17). Requires `category`, `name`, `schema`, `content`;
   * `baseTemplateId` is required for non-BASE categories. The `schema` is
   * derived from the editable sample data (inverse of U13's seed helper).
   *
   * Channel `metadata` (email/doc/sms) is NOT captured by the editor in this
   * unit — those keys are omitted, so the backend will reject a CREATE for a
   * category that requires them. That validation error surfaces gracefully via
   * the `ApiError` path; a full channel-metadata editor is a follow-up.
   */
  private buildCreatePayload(request: SaveRequest): CreateTemplatePayload {
    const payload: CreateTemplatePayload = {
      category: request.category,
      name: request.name,
      schema: deriveSchemaFromSampleData(request.sampleData ?? {}),
      content: request.content,
    };
    if (request.description) {
      payload.description = request.description;
    }
    if (request.category !== TemplateCategoriesEnum.BASE) {
      payload.baseTemplateId = request.baseTemplateId;
    }
    return payload;
  }

  /**
   * UPDATE payload (R17): `UpdateTemplatePayloadDto` is a `PartialType`, so we
   * send the editable fields (content, name, description, category, base, and
   * the re-derived schema). This is the primary persist flow and works cleanly.
   */
  private buildUpdatePayload(request: SaveRequest): UpdateTemplatePayload {
    const payload: UpdateTemplatePayload = {
      name: request.name,
      category: request.category,
      content: request.content,
      schema: deriveSchemaFromSampleData(request.sampleData ?? {}),
      description: request.description,
    };
    if (request.category !== TemplateCategoriesEnum.BASE) {
      payload.baseTemplateId = request.baseTemplateId;
    }
    return payload;
  }
}
