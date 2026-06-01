import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

/** Generic chart-load message when the raw error is empty or fully redacted. */
export const RV_OVERVIEW_CHART_ERROR_FALLBACK = 'Database request failed.';

export const RV_OVERVIEW_API_ERROR_FALLBACK = 'Request failed.';

export function rvOverviewSupabaseDisplayError(error: unknown): string {
  return sanitizeAdminDisplayError(error, { fallback: RV_OVERVIEW_CHART_ERROR_FALLBACK });
}

export function rvOverviewApiDisplayError(error: unknown): string {
  return sanitizeAdminDisplayError(error, { fallback: RV_OVERVIEW_API_ERROR_FALLBACK });
}
