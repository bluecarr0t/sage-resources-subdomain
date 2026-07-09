/**
 * Seasonal retail rate cells on `all_sage_data` (and Hipcamp mirrors).
 * Values may be a positive USD nightly rate or the literal `closed`.
 */

export const SEASON_RATE_CLOSED = 'closed' as const;

export type SeasonRateKey =
  | 'winter_weekday'
  | 'winter_weekend'
  | 'spring_weekday'
  | 'spring_weekend'
  | 'summer_weekday'
  | 'summer_weekend'
  | 'fall_weekday'
  | 'fall_weekend';

export const SEASON_RATE_KEYS: SeasonRateKey[] = [
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
];

/** DB column names on `all_sage_data`. */
export const GLAMPING_SEASON_RATE_DB_COLUMNS = [
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;

export type GlampingSeasonRateDbColumn = (typeof GLAMPING_SEASON_RATE_DB_COLUMNS)[number];

export const DB_COLUMN_TO_SEASON_KEY: Record<GlampingSeasonRateDbColumn, SeasonRateKey> = {
  rate_winter_weekday: 'winter_weekday',
  rate_winter_weekend: 'winter_weekend',
  rate_spring_weekday: 'spring_weekday',
  rate_spring_weekend: 'spring_weekend',
  rate_summer_weekday: 'summer_weekday',
  rate_summer_weekend: 'summer_weekend',
  rate_fall_weekday: 'fall_weekday',
  rate_fall_weekend: 'fall_weekend',
};

export type ParsedSeasonRate =
  | { kind: 'empty' }
  | { kind: 'closed' }
  | { kind: 'numeric'; value: number };

export function isSeasonRateClosedLiteral(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim().toLowerCase() === SEASON_RATE_CLOSED;
}

/** Normalize admin/API input to stored `closed` or numeric string, or null. */
export function normalizeSeasonRateForDb(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return String(Math.round(value * 100) / 100);
  }
  const s = String(value).trim();
  if (!s || /^no\s*data$/i.test(s)) return null;
  if (s.toLowerCase() === SEASON_RATE_CLOSED) return SEASON_RATE_CLOSED;
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid seasonal rate: ${s}. Use a positive number or "${SEASON_RATE_CLOSED}".`);
  }
  return String(Math.round(n * 100) / 100);
}

export function parseSeasonRateValue(raw: unknown): ParsedSeasonRate {
  if (raw === null || raw === undefined) return { kind: 'empty' };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return { kind: 'empty' };
    return { kind: 'numeric', value: raw };
  }
  const s = String(raw).trim();
  if (!s || /^no\s*data$/i.test(s)) return { kind: 'empty' };
  if (s.toLowerCase() === SEASON_RATE_CLOSED) return { kind: 'closed' };
  const n = parseFloat(s.replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return { kind: 'empty' };
  return { kind: 'numeric', value: n };
}

export function parseSeasonRateNumeric(raw: unknown): number | null {
  const p = parseSeasonRateValue(raw);
  return p.kind === 'numeric' ? p.value : null;
}

export function isSeasonRateDocumented(raw: unknown): boolean {
  const p = parseSeasonRateValue(raw);
  return p.kind === 'numeric' || p.kind === 'closed';
}

export type SeasonClosedFlags = Partial<Record<SeasonRateKey, true>>;

export function buildSeasonClosedFlags(
  row: Record<string, unknown>,
  columnPrefix: '' | 'rate_' = 'rate_'
): SeasonClosedFlags {
  const flags: SeasonClosedFlags = {};
  for (const key of SEASON_RATE_KEYS) {
    const col = columnPrefix ? (`${columnPrefix}${key}` as GlampingSeasonRateDbColumn) : key;
    if (isSeasonRateClosedLiteral(row[col])) {
      flags[key] = true;
    }
  }
  return flags;
}

export function sanitizeGlampingSeasonRateUpdates(
  updates: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...updates };
  for (const col of GLAMPING_SEASON_RATE_DB_COLUMNS) {
    if (!(col in out)) continue;
    const v = out[col];
    if (v === null || v === undefined) {
      out[col] = null;
      continue;
    }
    if (typeof v === 'string' && v.trim() === '') {
      out[col] = null;
      continue;
    }
    out[col] = normalizeSeasonRateForDb(v);
  }
  return out;
}

/** Ski / winter-only: missing when neither winter cell is documented. */
export function isWinterSeasonRateMissing(
  numeric: { winter_weekday: number | null; winter_weekend: number | null },
  seasonClosed: SeasonClosedFlags
): boolean {
  const wd =
    numeric.winter_weekday != null ||
    seasonClosed.winter_weekday === true;
  const we =
    numeric.winter_weekend != null ||
    seasonClosed.winter_weekend === true;
  return !wd && !we;
}

/** Blended seasonal (parks/wineries): missing when no cell is numeric or closed. */
export function isAnySeasonRateMissing(
  numeric: Record<SeasonRateKey, number | null>,
  seasonClosed: SeasonClosedFlags
): boolean {
  for (const key of SEASON_RATE_KEYS) {
    if (numeric[key] != null || seasonClosed[key]) return false;
  }
  return true;
}
