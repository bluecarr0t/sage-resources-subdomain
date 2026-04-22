/**
 * Seasonal rate columns on `all_glamping_properties` — same set as
 * `calc_avg_retail_daily_rate` / `sync_season_rates_from_latest_year` in Postgres.
 * When any are present, their average is the authoritative “retail ADR” for that
 * line; `rate_avg_retail_daily_rate` can be stale or wrong vs seasons.
 */
export const GLAMPING_SEASONAL_RATE_COLUMN_KEYS = [
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;

/**
 * Returns the per-row effective retail ADR for analytics: average of non-null
 * seasonal rates when at least one exists, otherwise `rate_avg_retail_daily_rate`
 * when positive. Aligns with `aggregate_properties_v2` in Postgres.
 */
export function effectiveGlampingRetailAdrFromRow(row: Record<string, unknown>): number | null {
  const seasonal: number[] = [];
  for (const k of GLAMPING_SEASONAL_RATE_COLUMN_KEYS) {
    const v = row[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      seasonal.push(v);
    } else if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) seasonal.push(n);
    }
  }
  if (seasonal.length > 0) {
    const s = seasonal.reduce((a, b) => a + b, 0) / seasonal.length;
    return Math.round(s * 100) / 100;
  }
  const r = row.rate_avg_retail_daily_rate;
  if (typeof r === 'number' && Number.isFinite(r) && r > 0) return r;
  if (typeof r === 'string' && r.trim() !== '') {
    const n = Number(r);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
