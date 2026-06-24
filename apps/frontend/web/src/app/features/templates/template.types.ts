/**
 * Feature-local mirrors of the backend template wire shapes (U13).
 *
 * Following the `@hsm/web` rule (apps/frontend/web/CLAUDE.md): DTO/entity
 * *shapes* are mirrored here as plain interfaces rather than imported from
 * `@hsm/common/dtos` — that barrel transitively drags in `@nestjs/swagger`,
 * `@hsm/database`, and Node globals the browser build cannot type-check. The
 * `TemplateCategoriesEnum` runtime *values*, however, are imported directly
 * from `@hsm/common/enums` (never re-declared) so they stay in lockstep with
 * the backend.
 *
 * Canonical sources (keep in lockstep if they change):
 * - `packages/common/src/dtos/templates.dto.ts`
 *   (`TemplateDetailDto`, `TemplateWithBaseResponseDto`, `DraftRenderPayloadDto`)
 * - `packages/common/src/utils/template-schema.util.ts` (the `schema` shape)
 */

import type { TemplateCategoriesEnum } from '@hsm/common/enums';

/**
 * The recursive mini-schema describing the shape of `data` a template renders
 * against. Mirror of `TemplateSchemaNode` in
 * `packages/common/src/utils/template-schema.util.ts`:
 * - a primitive tag string: `'string' | 'number' | 'boolean' | 'date' | 'any'`,
 *   optionally suffixed with `?` to mark it optional;
 * - a single-element array `[item]` = a list of `item`;
 * - a plain object = a nested sub-schema.
 */
export type TemplateSchemaNode =
  | string
  | TemplateSchemaNode[]
  | { [key: string]: TemplateSchemaNode };

/** Mirror of `@hsm/common` `TemplateDetailDto`. */
export interface TemplateDetail {
  id: string;
  category: TemplateCategoriesEnum;
  name: string;
  isActive: boolean;
  /** The jsonb mini-schema (see {@link TemplateSchemaNode}). */
  schema: TemplateSchemaNode;
  /** Handlebars source. */
  content: string;
  description?: string | null;
  /** Channel-specific fields (email/doc/sms); `null` for BASE templates. */
  metadata?: Record<string, unknown> | null;
}

/** Mirror of `@hsm/common` `TemplateWithBaseResponseDto`. */
export interface TemplateWithBase {
  template: TemplateDetail;
  baseTemplate: TemplateDetail | null;
}

/**
 * Mirror of `@hsm/common` `DraftRenderPayloadDto` — the body U14's Save seam
 * will POST to `/v1/templates/draft-render`. Declared here so the stubbed Save
 * `output` can carry a typed payload today.
 */
export interface DraftRenderPayload {
  content: string;
  baseTemplateId?: string;
  sampleData?: Record<string, unknown>;
}

/**
 * Mirror of `@hsm/common` `DraftRenderResponseDto` — the body returned by
 * `POST /v1/templates/draft-render`: the server-composed (base + child) HTML.
 */
export interface DraftRenderResponse {
  html: string;
}

/**
 * Everything the editor's metadata bar + panels capture, emitted on Save so the
 * host's save-flow (U14) can both draft-render and persist. `loadedId` carries
 * the id of the template being edited (CREATE vs UPDATE discriminator).
 */
export interface SaveRequest {
  /** The id of the loaded template, if editing an existing one (else null). */
  loadedId: string | null;
  name: string;
  description: string;
  category: TemplateCategoriesEnum;
  content: string;
  baseTemplateId?: string;
  /** The editable sample-data object (drives draft-render + schema derivation). */
  sampleData?: Record<string, unknown>;
}

/**
 * Mirror of `@hsm/common` `CreateTemplatePayloadDto` (the subset this unit
 * sends). `schema` is the derived mini-schema; channel `metadata` editors
 * (email/doc/sms) are out of scope for U14 — those keys are intentionally
 * omitted, so CREATE is exercised for BASE and content-only templates.
 */
export interface CreateTemplatePayload {
  category: TemplateCategoriesEnum;
  name: string;
  description?: string;
  schema: TemplateSchemaNode;
  content: string;
  baseTemplateId?: string;
}

/**
 * Mirror of `@hsm/common` `UpdateTemplatePayloadDto` (`PartialType` of create):
 * every field optional, so an update sends only what changed.
 */
export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

/** A `TemplateCategoriesEnum` option for the category `p-select`. */
export interface CategoryOption {
  label: string;
  value: TemplateCategoriesEnum;
}

/** A BASE-template option for the base-template `p-select`. */
export interface BaseTemplateOption {
  label: string;
  value: string;
  /** The base template's Handlebars content, for client-side composition. */
  content: string;
}
