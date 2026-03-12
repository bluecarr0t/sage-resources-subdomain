/**
 * Pagination and query param validation for admin API routes.
 */

export const PAGINATION_DEFAULTS = {
  MAX_PAGE: 1_000,
  DEFAULT_PER_PAGE: 50,
  MAX_PER_PAGE: 100,
} as const;

export const FILTER_DEFAULTS = {
  MAX_FILTER_ITEMS: 50,
  MAX_FILTER_VALUE_LENGTH: 100,
  MAX_SEARCH_TERMS: 10,
} as const;

/**
 * Validate and truncate comma-separated filter values (e.g. state, unit_category).
 */
export function validateFilterValues(
  values: string[],
  options: { maxItems?: number; maxLength?: number } = {}
): string[] {
  const { maxItems = FILTER_DEFAULTS.MAX_FILTER_ITEMS, maxLength = FILTER_DEFAULTS.MAX_FILTER_VALUE_LENGTH } = options;
  return values
    .slice(0, maxItems)
    .filter((v) => v.length <= maxLength);
}

/**
 * Validate and truncate search terms.
 */
export function validateSearchTerms(terms: string[], maxTerms = FILTER_DEFAULTS.MAX_SEARCH_TERMS): string[] {
  return terms.slice(0, maxTerms);
}

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
