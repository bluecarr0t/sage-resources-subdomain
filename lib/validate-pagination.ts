/**
 * Pagination validation for admin API routes.
 */

export const PAGINATION_DEFAULTS = {
  MAX_PAGE: 10_000,
  DEFAULT_PER_PAGE: 50,
  MAX_PER_PAGE: 100,
} as const;

export interface PaginationParams {
  page: number;
  perPage: number;
  from: number;
}

/**
 * Parse and validate page/per_page from URLSearchParams.
 * Returns clamped, safe values.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  options: {
    defaultPerPage?: number;
    maxPerPage?: number;
    maxPage?: number;
  } = {}
): PaginationParams {
  const {
    defaultPerPage = PAGINATION_DEFAULTS.DEFAULT_PER_PAGE,
    maxPerPage = PAGINATION_DEFAULTS.MAX_PER_PAGE,
    maxPage = PAGINATION_DEFAULTS.MAX_PAGE,
  } = options;

  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  const perPageRaw = parseInt(searchParams.get('per_page') || String(defaultPerPage), 10);

  const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : Math.min(maxPage, pageRaw));
  const perPage = Math.max(
    1,
    Number.isNaN(perPageRaw) ? defaultPerPage : Math.min(maxPerPage, perPageRaw)
  );
  const from = (page - 1) * perPage;

  return { page, perPage, from };
}
