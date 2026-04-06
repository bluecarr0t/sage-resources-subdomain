/**
 * Mean 2025 ARDR by RV site surface type (campspot.rv_surface_type → three display buckets).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { createServerClient } from '@/lib/supabase';
import { meanRounded } from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

/** Display order: Concrete Pad, Loose Gravel, Grass or Field */
export const SURFACE_CHART_BUCKET_KEYS = ['concrete_pad', 'loose_gravel', 'grass_or_field'] as const;
export type SurfaceChartBucketKey = (typeof SURFACE_CHART_BUCKET_KEYS)[number];

export type CampspotSurfaceRatesAggRow = {
  state: string | null;
  rv_surface_type: string | null;
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

  if (/\b(grass|turf|lawn|meadow|pasture|field\b|sod|artificial\s*turf)\b/.test(s)) {
    return 'grass_or_field';
  }

  // Named hardscape before gravel (so "concrete aggregate" stays concrete).
  if (
    /\b(concrete|cement|asphalt|blacktop|macadam)\b/.test(s) ||
    /\bpaved\b/.test(s)
  ) {
    return 'concrete_pad';
  }

  // Gravel / earth / road-base materials (before generic "pad" → concrete).
  if (
    /\b(gravel|crushed|aggregate|pebble|stones?|loose|sand)\b/.test(s) ||
    /\b(dirt|earth|mud|dust)\b/.test(s) ||
    /\bunpaved\b/.test(s) ||
    /\b(screenings|caliche|fines\b|road\s*base|chat\b|dg\b|decomposed)\b/.test(s) ||
    /\b(shell\s*(rock|base)?|limestone|granite\s*chips?)\b/.test(s)
  ) {
    return 'loose_gravel';
  }

  if (/\b(pad|slab)\b/.test(s) && !/\bgravel\b/.test(s)) {
    return 'concrete_pad';
  }

  return null;
}

function adr2025ForRow(row: CampspotSurfaceRatesAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
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
    if (adr == null || !passesStandardCampspotRetailRateUsd(adr)) continue;

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
      .select('state, rv_surface_type, avg_retail_daily_rate_2025')
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
