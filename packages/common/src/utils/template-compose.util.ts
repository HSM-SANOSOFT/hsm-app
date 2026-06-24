import Handlebars from 'handlebars';

export interface ComposeTemplateInput {
  /** The child (or standalone) template content to render. */
  content: string;
  /**
   * Optional base-template content. When provided, the rendered child output
   * is injected as `body` into the base, mirroring base-template inheritance.
   * When omitted, the child output is returned as-is.
   */
  baseContent?: string | null;
  /** Data the template(s) render against. */
  data: Record<string, unknown>;
}

/**
 * Compose a Handlebars template into HTML, optionally wrapping it in a base
 * template via `{{body}}` inheritance.
 *
 * This is the single, framework-agnostic composition path shared by the API's
 * draft-render endpoint, the worker's generation job, and client-side preview.
 * It registers no helpers (none exist server-side today); any future helper
 * added here stays parity-shared across all three call sites.
 *
 * Handlebars compile/runtime errors propagate to the caller — callers wrap them
 * in their domain-specific error types (e.g. `TemplateInvalidHandlebarsError`).
 */
export function composeTemplate(input: ComposeTemplateInput): string {
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
