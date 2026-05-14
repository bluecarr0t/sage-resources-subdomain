/** Hard ceiling to protect DB and serverless payloads. */
export const MARKET_REPORT_FETCH_CAP_MAX = 8000;

/** Max sequential `id > cursor` pages per table when a bbox batch hits the row limit. */
export const MARKET_REPORT_MAX_ID_CHUNKS = 8;

/**
 * National RV Resort (RoverPass + Campspot): page size for `id`-cursor paging
 * until the table is exhausted. Smaller pages keep each Supabase response
 * under typical PostgREST / gateway payload limits while still minimizing round
 * trips. Override: `MARKET_REPORT_NATIONAL_RV_PAGE_SIZE`.
 */
const NATIONAL_RV_PAGE_DEFAULT = 5000;
const NATIONAL_RV_PAGE_MIN = 500;
const NATIONAL_RV_PAGE_MAX = 15000;
export function resolveNationalRvPageSize(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MARKET_REPORT_NATIONAL_RV_PAGE_SIZE;
  if (!raw) return NATIONAL_RV_PAGE_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NATIONAL_RV_PAGE_DEFAULT;
  return Math.max(NATIONAL_RV_PAGE_MIN, Math.min(NATIONAL_RV_PAGE_MAX, Math.floor(n)));
}

/**
 * Safety valve: max HTTP round-trips per source for national RV paging
 * (500 × 5000 = 2.5M rows per source). Override: `MARKET_REPORT_NATIONAL_RV_MAX_CHUNKS`.
 */
const NATIONAL_RV_MAX_CHUNKS_DEFAULT = 800;
const NATIONAL_RV_MAX_CHUNKS_MIN = 10;
const NATIONAL_RV_MAX_CHUNKS_MAX = 2000;
export function resolveNationalRvMaxChunks(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.MARKET_REPORT_NATIONAL_RV_MAX_CHUNKS;
  if (!raw) return NATIONAL_RV_MAX_CHUNKS_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NATIONAL_RV_MAX_CHUNKS_DEFAULT;
  return Math.max(NATIONAL_RV_MAX_CHUNKS_MIN, Math.min(NATIONAL_RV_MAX_CHUNKS_MAX, Math.floor(n)));
}

/**
 * Rows fetched inside the bounding box before Haversine filtering.
 * Scales with search radius so dense areas are less likely to miss in-radius properties
 * when capped (still possible at extreme density).
 */
export function bboxFetchLimitForRadius(radiusMiles: number): number {
  const r = Math.min(250, Math.max(1, radiusMiles));
  const scaled = Math.ceil(500 + r * r * 3.5 + r * 12);
  return Math.min(MARKET_REPORT_FETCH_CAP_MAX, Math.max(800, scaled));
}
