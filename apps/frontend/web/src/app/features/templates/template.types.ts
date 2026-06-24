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
