function envInt(name: string, fallback: number, min: number, max: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Max rows to scan per source table for RV Industry Overview aggregates.
 * Tune via env (defaults match prior fixed Campspot 400k / RoverPass 250k caps).
 */
export const CAMPSPOT_RV_OVERVIEW_MAX_ROWS = envInt(
  'CAMPSPOT_RV_OVERVIEW_MAX_ROWS',
  400_000,
  1_000,
  500_000
);

export const ROVERPASS_RV_OVERVIEW_MAX_ROWS = envInt(
  'ROVERPASS_RV_OVERVIEW_MAX_ROWS',
  250_000,
  1_000,
  500_000
);

/**
 * Rows per Supabase range() request. Default 1000 matches typical PostgREST max_rows; if you raise
 * max_rows in Supabase (Project Settings → API), set CAMPSPOT_RV_OVERVIEW_PAGE_SIZE (e.g. 5000).
 */
export const CAMPSPOT_RV_OVERVIEW_PAGE_SIZE = envInt(
  'CAMPSPOT_RV_OVERVIEW_PAGE_SIZE',
  1000,
  200,
  20_000
);

/** Concurrent range() requests (ordered offsets: 0, PAGE_SIZE, 2*PAGE_SIZE, …). */
export const CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES = envInt(
  'CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES',
  4,
  1,
  8
);
