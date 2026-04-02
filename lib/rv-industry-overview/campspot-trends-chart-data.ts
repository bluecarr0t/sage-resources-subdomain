/**
 * Regional + U.S. aggregates for the RV trends combo chart (2024 vs 2025, Campspot only).
 * 2024: occupancy_rate_2024 + avg_retail_daily_rate_2024 (same-row cohort).
 * 2025: occupancy_rate_2025 + retail_daily_rate_ytd when parseable, else avg_retail_daily_rate_2025 (same-row cohort).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import {
  type RvIndustryRegionId,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

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
};

export type TrendsChartRow = {
  categoryKey: TrendsChartCategoryKey;
  occ2024: number | null;
  occ2025: number | null;
  adr2024: number | null;
  adr2025: number | null;
  n2024: number;
  n2025: number;
};

export type CampspotTrendsChartResult = {
  rows: TrendsChartRow[];
  rowsScanned: number;
  error: string | null;
};

export type CampspotTrendsAggRow = {
  state: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
  occupancy_rate_2025: string | null;
  avg_retail_daily_rate_2025: string | null;
  retail_daily_rate_ytd: string | null;
};

function emptyBuckets(): Record<TrendsChartCategoryKey, Bucket> {
  const b = (): Bucket => ({
    occ2024: [],
    adr2024: [],
    occ2025: [],
    adr2025: [],
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
  const ytd = parseCampspotNumber(row.retail_daily_rate_ytd);
  if (ytd != null && ytd > 0) return ytd;
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
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

    const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
    const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
    if (o4 != null && a4 != null && a4 > 0) {
      for (const k of targets) {
        const b = buckets[k];
        b.occ2024.push(o4);
        b.adr2024.push(a4);
      }
    }

    const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    const a5 = adr2025ForRow(row);
    if (o5 != null && a5 != null && a5 > 0) {
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

export async function fetchCampspotTrendsChartData(
  supabase: SupabaseClient
): Promise<CampspotTrendsChartResult> {
  const buckets = emptyBuckets();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(
        'state, occupancy_rate_2024, avg_retail_daily_rate_2024, ' +
          'occupancy_rate_2025, avg_retail_daily_rate_2025, retail_daily_rate_ytd'
      )
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        rows: bucketsToRows(emptyBuckets()),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldTrendsRows(buckets, data as unknown as CampspotTrendsAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: bucketsToRows(buckets), rowsScanned, error: null };
}

export async function getCampspotTrendsChartData(): Promise<CampspotTrendsChartResult> {
  return fetchCampspotTrendsChartData(createServerClient());
}
