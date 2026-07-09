import type { PropertyWithProximity } from './types';
import { isWinterSeasonRateMissing } from '@/lib/glamping-seasonal-rate';

export type WinterRateResearchSegment =
  | 'winter_missing_no_seasonal'
  | 'winter_missing_has_summer_only'
  | 'winter_missing_has_other_seasons'
  | 'winter_missing_has_avg_only';

export function classifyWinterMissingSegment(
  row: Pick<
    PropertyWithProximity,
    | 'winter_weekday'
    | 'winter_weekend'
    | 'spring_weekday'
    | 'spring_weekend'
    | 'summer_weekday'
    | 'summer_weekend'
    | 'fall_weekday'
    | 'fall_weekend'
    | 'season_closed'
  > & { rate_avg_retail_daily_rate?: number | null }
): WinterRateResearchSegment {
  if (
    !isWinterSeasonRateMissing(
      { winter_weekday: row.winter_weekday, winter_weekend: row.winter_weekend },
      row.season_closed ?? {}
    )
  ) {
    throw new Error('classifyWinterMissingSegment called for property with documented winter rates');
  }
  const has = (v: number | null | undefined) => v != null && !Number.isNaN(v);
  const hasSummer = has(row.summer_weekday) || has(row.summer_weekend);
  const hasOther =
    has(row.spring_weekday) ||
    has(row.spring_weekend) ||
    has(row.fall_weekday) ||
    has(row.fall_weekend);
  const hasAvg = has(row.rate_avg_retail_daily_rate);

  if (hasSummer) return 'winter_missing_has_summer_only';
  if (hasOther) return 'winter_missing_has_other_seasons';
  if (hasAvg) return 'winter_missing_has_avg_only';
  return 'winter_missing_no_seasonal';
}
