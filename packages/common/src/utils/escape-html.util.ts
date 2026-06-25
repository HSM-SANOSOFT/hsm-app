/**
 * Escapes the five HTML-significant characters so a dynamic value (a name, a
 * username, etc.) can be interpolated into an HTML email body without allowing
 * markup or attribute injection.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
