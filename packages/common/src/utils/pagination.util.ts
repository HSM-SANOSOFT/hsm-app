/**
 * Builds the `metadata.extra.pagination` block that paginated list endpoints
 * return, so the shape stays identical across every list response (the global
 * `ResponseInterceptor` reads `metadata.extra.pagination`).
 */
export interface PaginationInput {
  page: number;
  pageSize: number;
  totalItems: number;
}

export function buildPaginationMeta({
  page,
  pageSize,
  totalItems,
}: PaginationInput): {
  extra: {
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
} {
  return {
    extra: {
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0,
      },
    },
  };
}
