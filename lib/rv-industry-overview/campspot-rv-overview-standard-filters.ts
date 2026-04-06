/**
 * Row-level data-quality bands applied consistently across RV Industry Overview
 * (every unit-type slice and every chart fed by `campspot-rv-overview-page-data`).
 *
 * Documented for admins in `messages/en.json` under `admin.rvIndustryOverview.standardFilters`.
 */

import { parseCampspotNumber, parseCampspotOccupancyPercent } from '@/lib/rv-industry-overview/campspot-field-parse';

/** Inclusive band on parsed percent; 100% occupancy is excluded as unreliable. */
export const RV_OVERVIEW_STANDARD_OCC_MIN_PCT = 10;
export const RV_OVERVIEW_STANDARD_OCC_MAX_PCT = 99;

/** Inclusive USD/night for any retail daily rate field aggregated on the overview. */
export const RV_OVERVIEW_STANDARD_RATE_MIN_USD = 10;
export const RV_OVERVIEW_STANDARD_RATE_MAX_USD = 3_000;

export function passesStandardCampspotOccupancyPercent(occPercent: number | null): boolean {
  return (
    occPercent != null &&
    occPercent >= RV_OVERVIEW_STANDARD_OCC_MIN_PCT &&
    occPercent <= RV_OVERVIEW_STANDARD_OCC_MAX_PCT
  );
}

export function passesStandardCampspotRetailRateUsd(rateUsd: number | null): boolean {
  return (
    rateUsd != null &&
    rateUsd >= RV_OVERVIEW_STANDARD_RATE_MIN_USD &&
    rateUsd <= RV_OVERVIEW_STANDARD_RATE_MAX_USD
  );
}

export function campspotOccupancyRawPassesStandardFilter(rawOccupancy: unknown): boolean {
  return passesStandardCampspotOccupancyPercent(parseCampspotOccupancyPercent(rawOccupancy));
}

/**
 * 2025 ARDR from `avg_retail_daily_rate_2025` only (Retail Daily Rate YTD is not used).
 */
export function parseCampspotAdr2025FromAnnualColumn(row: {
  avg_retail_daily_rate_2025: string | null;
}): number | null {
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
}

/**
 * Gate for row-level charts that should stay comparable to 2025 rate/occupancy cohorts
 * (unit-type mix, RV parking counts, amenity property %).
 */
export function rowPassesStandardCampspot2025Quality(row: {
  occupancy_rate_2025: unknown;
  avg_retail_daily_rate_2025: string | null;
}): boolean {
  if (!campspotOccupancyRawPassesStandardFilter(row.occupancy_rate_2025)) return false;
  return passesStandardCampspotRetailRateUsd(parseCampspotAdr2025FromAnnualColumn(row));
}
