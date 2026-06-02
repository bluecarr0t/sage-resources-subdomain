function envInt(name: string, fallback: number, min: number, max: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Max rows to scan from `hipcamp` for Glamping Industry Overview. */
export const HIPCAMP_GLAMPING_OVERVIEW_MAX_ROWS = envInt(
  'HIPCAMP_GLAMPING_OVERVIEW_MAX_ROWS',
  400_000,
  1_000,
  500_000
);

/** Max rows to scan from `all_glamping_properties` (Sage). */
export const SAGE_GLAMPING_OVERVIEW_MAX_ROWS = envInt(
  'SAGE_GLAMPING_OVERVIEW_MAX_ROWS',
  250_000,
  1_000,
  500_000
);

export const GLAMPING_OVERVIEW_PAGE_SIZE = envInt(
  'GLAMPING_OVERVIEW_PAGE_SIZE',
  1000,
  200,
  20_000
);

export const GLAMPING_OVERVIEW_PARALLEL_PAGES = envInt(
  'GLAMPING_OVERVIEW_PARALLEL_PAGES',
  4,
  1,
  8
);
