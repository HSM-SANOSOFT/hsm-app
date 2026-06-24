/** Default page size for server-paginated tables. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Translates a table's `first`/`rows` (0-based offset + page size) into the
 * backend's 1-based `page`/`limit` query. Falls back to {@link DEFAULT_PAGE_SIZE}
 * when `rows` is not a positive number.
 */
export function computePage(
  offset: number,
  rows: number,
): { page: number; limit: number } {
  const limit = rows > 0 ? rows : DEFAULT_PAGE_SIZE;
  return { page: Math.floor(offset / limit) + 1, limit };
}
