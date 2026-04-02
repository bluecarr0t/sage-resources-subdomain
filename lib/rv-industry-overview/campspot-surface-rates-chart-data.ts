/**
 * Mean 2025 ARDR by RV site surface type (campspot.rv_surface_type → three display buckets).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { createServerClient } from '@/lib/supabase';
import {
  meanRounded,
  parseCampspotNumber,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

/** Display order: Concrete Pad, Loose Gravel, Grass or Field */
export const SURFACE_CHART_BUCKET_KEYS = ['concrete_pad', 'loose_gravel', 'grass_or_field'] as const;
export type SurfaceChartBucketKey = (typeof SURFACE_CHART_BUCKET_KEYS)[number];

export type CampspotSurfaceRatesAggRow = {
  state: string | null;
  rv_surface_type: string | null;
  retail_daily_rate_ytd: string | null;
  avg_retail_daily_rate_2025: string | null;
};

export type SurfaceRatesChartRow = {
  bucketKey: SurfaceChartBucketKey;
  avgAdr2025: number | null;
  n: number;
};

export type CampspotSurfaceRatesChartResult = {
  rows: SurfaceRatesChartRow[];
  rowsScanned: number;
  error: string | null;
};

/**
 * Maps free-text `rv_surface_type` to chart buckets. Unknown / mixed → null (excluded).
 */
export function classifyCampspotRvSurfaceType(raw: unknown): SurfaceChartBucketKey | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === 'no data') return null;
  if (/\b(mixed|multiple|various|unknown|n\/a)\b/.test(s)) return null;

  if (/\b(grass|turf|lawn|meadow|pasture|field\b|sod)\b/.test(s)) {
    return 'grass_or_field';
  }

  if (
    /\b(concrete|cement|asphalt|blacktop|macadam)\b/.test(s) ||
    /\bpaved\b/.test(s) ||
    (/\b(pad|slab)\b/.test(s) && !/\bgravel\b/.test(s))
  ) {
    return 'concrete_pad';
  }

  if (
    /\b(gravel|crushed|aggregate|pebble|stones?|loose|sand)\b/.test(s) ||
    /\bdirt\b/.test(s) ||
    /\bunpaved\b/.test(s)
  ) {
    return 'loose_gravel';
  }

  return null;
}

function adr2025ForRow(row: CampspotSurfaceRatesAggRow): number | null {
  const ytd = parseCampspotNumber(row.retail_daily_rate_ytd);
  if (ytd != null && ytd > 0) return ytd;
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
}

function emptyBuckets(): Record<SurfaceChartBucketKey, number[]> {
  return { concrete_pad: [], loose_gravel: [], grass_or_field: [] };
}

export function createSurfaceRatesFoldState(): Record<SurfaceChartBucketKey, number[]> {
  return emptyBuckets();
}

export function foldSurfaceRows(
  buckets: Record<SurfaceChartBucketKey, number[]>,
  rows: CampspotSurfaceRatesAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    const bucket = classifyCampspotRvSurfaceType(row.rv_surface_type);
    if (!bucket) continue;

    const adr = adr2025ForRow(row);
    if (adr == null) continue;

    buckets[bucket].push(adr);
  }
}

export function finalizeSurfaceRatesFoldState(
  buckets: Record<SurfaceChartBucketKey, number[]>
): SurfaceRatesChartRow[] {
  return bucketsToRows(buckets);
}

function bucketsToRows(buckets: Record<SurfaceChartBucketKey, number[]>): SurfaceRatesChartRow[] {
  return SURFACE_CHART_BUCKET_KEYS.map((bucketKey) => ({
    bucketKey,
    avgAdr2025: meanRounded(buckets[bucketKey]),
    n: buckets[bucketKey].length,
  }));
}

export function aggregateCampspotRowsToSurfaceRates(
  rows: CampspotSurfaceRatesAggRow[]
): SurfaceRatesChartRow[] {
  const buckets = emptyBuckets();
  foldSurfaceRows(buckets, rows);
  return bucketsToRows(buckets);
}

export async function fetchCampspotSurfaceRatesChartData(
  supabase: SupabaseClient
): Promise<CampspotSurfaceRatesChartResult> {
  const buckets = emptyBuckets();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select('state, rv_surface_type, retail_daily_rate_ytd, avg_retail_daily_rate_2025')
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

    foldSurfaceRows(buckets, data as unknown as CampspotSurfaceRatesAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: bucketsToRows(buckets), rowsScanned, error: null };
}

export async function getCampspotSurfaceRatesChartData(): Promise<CampspotSurfaceRatesChartResult> {
  return fetchCampspotSurfaceRatesChartData(createServerClient());
}
