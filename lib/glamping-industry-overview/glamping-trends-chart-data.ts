/**
 * Glamping Industry Overview trends fold: Hipcamp keeps paired occupancy+ARDR;
 * Sage contributes 2025 ARDR from `rate_avg_retail_daily_rate` without occupancy.
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  createTrendsFoldState,
  finalizeTrendsFoldState,
  trendsRowSiteWeight,
  type CampspotTrendsAggRow,
  type TrendsChartCategoryKey,
  type TrendsChartRow,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';

export {
  createTrendsFoldState,
  finalizeTrendsFoldState,
  type CampspotTrendsAggRow,
  type CampspotTrendsChartResult,
  type TrendsChartCategoryKey,
  type TrendsChartRow,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';

function rowInUsRegion(row: { state: string | null }): boolean {
  const stateAbbr = normalizeState(row.state);
  if (!stateAbbr) return false;
  return getRvIndustryRegionForStateAbbr(stateAbbr) != null;
}

function adr2025ForRow(row: CampspotTrendsAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

/** Whether this row can enter the glamping trends chart (any series). */
export function rowContributesToGlampingTrends(row: CampspotTrendsAggRow): boolean {
  if (!rowInUsRegion(row)) return false;

  const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
  const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  const paired2024 =
    o4 != null &&
    a4 != null &&
    passesStandardCampspotOccupancyPercent(o4) &&
    passesStandardCampspotRetailRateUsd(a4);

  const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  const a5 = adr2025ForRow(row);
  const paired2025 =
    o5 != null &&
    a5 != null &&
    passesStandardCampspotOccupancyPercent(o5) &&
    passesStandardCampspotRetailRateUsd(a5);

  const adrOnly2025 = a5 != null && passesStandardCampspotRetailRateUsd(a5) && !paired2025;
  const adrOnly2024 =
    a4 != null && passesStandardCampspotRetailRateUsd(a4) && !paired2024;

  return paired2024 || paired2025 || adrOnly2025 || adrOnly2024;
}

export function aggregateGlampingRowsToTrendsChart(rows: CampspotTrendsAggRow[]): TrendsChartRow[] {
  const buckets = createTrendsFoldState();
  foldGlampingTrendsRows(buckets, rows);
  return finalizeTrendsFoldState(buckets);
}

export function foldGlampingTrendsRows(
  buckets: ReturnType<typeof createTrendsFoldState>,
  rows: CampspotTrendsAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr) continue;
    const regionId = getRvIndustryRegionForStateAbbr(stateAbbr);
    if (!regionId) continue;

    const targets: TrendsChartCategoryKey[] = ['us', regionId];
    const weight = trendsRowSiteWeight(row);
    for (const k of targets) {
      buckets[k].siteCount += weight;
    }

    const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
    const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
    const paired2024 =
      o4 != null &&
      a4 != null &&
      passesStandardCampspotOccupancyPercent(o4) &&
      passesStandardCampspotRetailRateUsd(a4);

    if (paired2024) {
      for (const k of targets) {
        const b = buckets[k];
        b.occ2024.push(o4);
        b.adr2024.push(a4);
      }
    } else if (a4 != null && passesStandardCampspotRetailRateUsd(a4)) {
      for (const k of targets) {
        buckets[k].adr2024.push(a4);
      }
    }

    const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    const a5 = adr2025ForRow(row);
    const paired2025 =
      o5 != null &&
      a5 != null &&
      passesStandardCampspotOccupancyPercent(o5) &&
      passesStandardCampspotRetailRateUsd(a5);

    if (paired2025) {
      for (const k of targets) {
        const b = buckets[k];
        b.occ2025.push(o5);
        b.adr2025.push(a5);
      }
    } else if (a5 != null && passesStandardCampspotRetailRateUsd(a5)) {
      for (const k of targets) {
        buckets[k].adr2025.push(a5);
      }
    }
  }
}
