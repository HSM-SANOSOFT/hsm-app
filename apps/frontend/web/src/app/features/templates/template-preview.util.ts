/**
 * Pure, framework-free helpers for the template editor (U13).
 *
 * Everything that drives the live preview lives here as plain functions so it
 * is unit-testable without a real Monaco DOM or an Angular fixture:
 * - {@link seedSampleDataFromSchema} walks the template `schema` and produces an
 *   editable sample object (R15 / AE5);
 * - {@link composeTemplatePreview} compiles content (optionally wrapped in a
 *   base via `{{body}}`) against sample data, mirroring the server-side
 *   `composeTemplate` util (R16 / KTD7);
 * - {@link buildPreviewSrcdoc} returns the HTML string fed to the sandboxed
 *   `<iframe [srcdoc]>`.
 *
 * The Handlebars *full* build is imported directly (compiler included) — see
 * `apps/frontend/web/CLAUDE.md` (KTD1).
 */

import Handlebars from 'handlebars';

import type { TemplateSchemaNode } from './template.types';

const PRIMITIVE_TAGS = ['string', 'number', 'boolean', 'date', 'any'] as const;
type PrimitiveTag = (typeof PRIMITIVE_TAGS)[number];

/**
 * Walk a template `schema` and produce a sample value for every leaf:
 * - `string` → `''`
 * - `number` → `0`
 * - `boolean` → `false`
 * - `date` → current time as an ISO string
 * - `any` (or an unknown tag) → `null`
 * - `[item]` → `[<one sample of item>]`
 * - nested object → recurse key-by-key
 *
 * Optional (`?`-suffixed) leaves are still seeded — the author can clear them.
 * `now` is injectable so date seeding is deterministic in tests.
 */
export function seedSampleDataFromSchema(
  schema: TemplateSchemaNode,
  now: Date = new Date(),
): unknown {
  if (typeof schema === 'string') {
    return sampleForTag(stripOptional(schema), now);
  }

  if (Array.isArray(schema)) {
    // Mini-schema arrays are single-element ([item]); seed one sample item.
    if (schema.length === 0) {
      return [];
    }
    return [seedSampleDataFromSchema(schema[0], now)];
  }

  if (isPlainObject(schema)) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(schema)) {
      out[key] = seedSampleDataFromSchema(child, now);
    }
    return out;
  }

  return null;
}

/**
 * Inverse of {@link seedSampleDataFromSchema}: derive a template mini-schema
 * from a concrete sample-data object (U14). Used to assemble the `schema` field
 * a CREATE requires, since the editor only captures editable sample data.
 *
 * Leaf mapping:
 * - `string` → `'string'`
 * - `number` → `'number'`
 * - `boolean` → `'boolean'`
 * - object → recurse key-by-key (nested sub-schema)
 * - array → `[<schema of first element>]` (single-element mini-schema list);
 *   an empty array → `['any']`
 * - `null` / `undefined` → `'any'`
 *
 * This mirrors `seedSampleDataFromSchema`'s primitive tags so a seed→edit→derive
 * round-trip stays within the backend's accepted schema shape.
 */
export function deriveSchemaFromSampleData(value: unknown): TemplateSchemaNode {
  if (value === null || value === undefined) {
    return 'any';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ['any'];
    }
    return [deriveSchemaFromSampleData(value[0])];
  }

  if (isPlainObject(value)) {
    const out: Record<string, TemplateSchemaNode> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = deriveSchemaFromSampleData(child);
    }
    return out;
  }

  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      // bigint / symbol / function — not representable; treat as 'any'.
      return 'any';
  }
}

function sampleForTag(tag: string, now: Date): unknown {
  switch (tag as PrimitiveTag) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return now.toISOString();
    default:
      // 'any' and any unrecognized tag.
      return null;
  }
}

function stripOptional(tag: string): string {
  return tag.endsWith('?') ? tag.slice(0, -1) : tag;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export interface ComposePreviewInput {
  /** The child (or standalone) Handlebars content the author is editing. */
  content: string;
  /**
   * Optional base-template content. When present, the rendered child output is
   * injected as `body` into the base — mirroring server-side base inheritance.
   */
  baseContent?: string | null;
  /** Data the template(s) render against. */
  data: Record<string, unknown>;
}

/**
 * Compile `content` into HTML, optionally wrapping it in `baseContent` via
 * `{{body}}`. Mirrors `packages/common/src/utils/template-compose.util.ts` so
 * the client preview tracks the server's authoritative composition (the
 * true-preview-on-save gate, U14, remains the fidelity backstop). Handlebars
 * compile/runtime errors propagate to the caller.
 */
export function composeTemplatePreview(input: ComposePreviewInput): string {
  const { content, baseContent, data } = input;

  const childHtml = Handlebars.compile(content, { noEscape: false })(data);

  if (baseContent == null) {
    return childHtml;
  }

  return Handlebars.compile(baseContent, { noEscape: false })({
    ...data,
    body: childHtml,
  });
}

/**
 * Result of an attempted preview render: either the composed HTML or the
 * Handlebars/parse error message to show the author. Never throws — designed to
 * feed a signal that the debounced effect writes on every keystroke.
 */
export type PreviewResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

/**
 * Parse `rawSampleData` (the editable JSON panel) and compose the preview.
 * Captures both JSON-parse and Handlebars errors as a friendly message rather
 * than throwing, so a transient invalid edit never breaks the editor.
 */
export function renderPreview(input: {
  content: string;
  baseContent?: string | null;
  rawSampleData: string;
}): PreviewResult {
  let data: Record<string, unknown>;
  try {
    const parsed = input.rawSampleData.trim()
      ? JSON.parse(input.rawSampleData)
      : {};
    data = isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    return {
      ok: false,
      error: `Invalid sample-data JSON: ${(err as Error).message}`,
    };
  }

  try {
    const html = composeTemplatePreview({
      content: input.content,
      baseContent: input.baseContent,
      data,
    });
    return { ok: true, html };
  } catch (err) {
    return { ok: false, error: `Template error: ${(err as Error).message}` };
  }
}

/**
 * Wrap a {@link PreviewResult} into the HTML document fed to the preview
 * `<iframe [srcdoc]>`. The iframe is sandboxed with `allow-scripts` ONLY (never
 * `allow-same-origin`) at the template level (KTD7); this only builds the body.
 */
export function buildPreviewSrcdoc(result: PreviewResult): string {
  if (!result.ok) {
    return errorDocument(result.error);
  }
  return result.html;
}

function errorDocument(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre style="color:#b00020;font-family:monospace;white-space:pre-wrap;padding:8px;">${escaped}</pre>`;
}
