/**
 * Regional + U.S. aggregates for the RV trends combo chart (2024 vs 2025).
 * 2024: occupancy_rate_2024 + avg_retail_daily_rate_2024 (same-row cohort).
 * 2025: occupancy_rate_2025 + avg_retail_daily_rate_2025 (same-row cohort).
 * Fed by unified page scan in `campspot-rv-overview-page-data.ts` (Campspot + RoverPass).
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  type RvIndustryRegionId,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';

export const TRENDS_CHART_CATEGORY_KEYS = [
  'us',
  'northeast',
  'midwest',
  'southeast',
  'southwest',
  'west',
] as const;

export type TrendsChartCategoryKey = (typeof TRENDS_CHART_CATEGORY_KEYS)[number];

type Bucket = {
  occ2024: number[];
  adr2024: number[];
  occ2025: number[];
  adr2025: number[];
  /** Sum of quantity_of_units (min 1 per row) for classified rows in region. */
  siteCount: number;
};

export type TrendsChartRow = {
  categoryKey: TrendsChartCategoryKey;
  occ2024: number | null;
  occ2025: number | null;
  adr2024: number | null;
  adr2025: number | null;
  n2024: number;
  n2025: number;
  siteCount: number;
};

export type CampspotTrendsChartResult = {
  rows: TrendsChartRow[];
  rowsScanned: number;
  error: string | null;
};

export type CampspotTrendsAggRow = {
  state: string | null;
  quantity_of_units?: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
  occupancy_rate_2025: string | null;
  avg_retail_daily_rate_2025: string | null;
};

/** Sites/units weight for a classified inventory row (matches unit-type chart logic). */
export function trendsRowSiteWeight(row: CampspotTrendsAggRow): number {
  const q = parseCampspotNumber(row.quantity_of_units);
  if (q != null && q >= 1) return Math.min(10_000, Math.round(q));
  return 1;
}

function emptyBuckets(): Record<TrendsChartCategoryKey, Bucket> {
  const b = (): Bucket => ({
    occ2024: [],
    adr2024: [],
    occ2025: [],
    adr2025: [],
    siteCount: 0,
  });
  return {
    us: b(),
    northeast: b(),
    midwest: b(),
    southeast: b(),
    southwest: b(),
    west: b(),
  };
}

function adr2025ForRow(row: CampspotTrendsAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

export function createTrendsFoldState(): Record<TrendsChartCategoryKey, Bucket> {
  return emptyBuckets();
}

export function foldTrendsRows(
  buckets: Record<TrendsChartCategoryKey, Bucket>,
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
    if (
      o4 != null &&
      a4 != null &&
      passesStandardCampspotOccupancyPercent(o4) &&
      passesStandardCampspotRetailRateUsd(a4)
    ) {
      for (const k of targets) {
        const b = buckets[k];
        b.occ2024.push(o4);
        b.adr2024.push(a4);
      }
    }

    const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    const a5 = adr2025ForRow(row);
    if (
      o5 != null &&
      a5 != null &&
      passesStandardCampspotOccupancyPercent(o5) &&
      passesStandardCampspotRetailRateUsd(a5)
    ) {
      for (const k of targets) {
        const b = buckets[k];
        b.occ2025.push(o5);
        b.adr2025.push(a5);
      }
    }
  }
}

export function finalizeTrendsFoldState(
  buckets: Record<TrendsChartCategoryKey, Bucket>
): TrendsChartRow[] {
  return bucketsToRows(buckets);
}

function bucketsToRows(
  buckets: Record<TrendsChartCategoryKey, Bucket>
): TrendsChartRow[] {
  return TRENDS_CHART_CATEGORY_KEYS.map((categoryKey) => {
    const b = buckets[categoryKey];
    const n2024 = b.occ2024.length;
    const n2025 = b.occ2025.length;
    return {
      categoryKey,
      occ2024: meanRounded(b.occ2024),
      occ2025: meanRounded(b.occ2025),
      adr2024: meanRounded(b.adr2024),
      adr2025: meanRounded(b.adr2025),
      n2024,
      n2025,
      siteCount: b.siteCount,
    };
  });
}

export function aggregateCampspotRowsToTrendsChart(
  rows: CampspotTrendsAggRow[]
): TrendsChartRow[] {
  const buckets = emptyBuckets();
  foldTrendsRows(buckets, rows);
  return bucketsToRows(buckets);
}
