/**
 * Mean 2025 ARDR for RV site rows only, split by with vs without each amenity (Campspot).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { createServerClient } from '@/lib/supabase';
import {
  classifyCampspotUnitChartBucket,
  type CampspotUnitTypeAggRow,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import {
  meanRounded,
  parseCampspotNumber,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

/** X-axis order matches reference chart */
export const AMENITY_ADR_CHART_KEYS = [
  'sewer_hook_up',
  'water_hookup',
  'hot_tub_sauna',
  'pool',
] as const;

export type AmenityAdrChartKey = (typeof AMENITY_ADR_CHART_KEYS)[number];

export type CampspotAmenityAdrAggRow = {
  state: string | null;
  city: string | null;
  unit_type: string | null;
  description: string | null;
  property_name: string | null;
  quantity_of_units: string | null;
  retail_daily_rate_ytd: string | null;
  avg_retail_daily_rate_2025: string | null;
  sewer_hook_up: string | null;
  water_hookup: string | null;
  hot_tub_sauna: string | null;
  pool: string | null;
};

export type AmenityAdrChartRow = {
  amenityKey: AmenityAdrChartKey;
  avgWithout: number | null;
  avgWith: number | null;
  nWithout: number;
  nWith: number;
  /** Whole dollars, with - without; null if either mean missing */
  diffRounded: number | null;
};

export type CampspotAmenityAdrChartResult = {
  rows: AmenityAdrChartRow[];
  rowsScanned: number;
  error: string | null;
};

function campspotTruthyAmenity(val: unknown): boolean {
  if (val == null || val === '') return false;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'no data') return false;
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

function adr2025ForRow(row: CampspotAmenityAdrAggRow): number | null {
  const ytd = parseCampspotNumber(row.retail_daily_rate_ytd);
  if (ytd != null && ytd > 0) return ytd;
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
}

function amenityPresent(row: CampspotAmenityAdrAggRow, key: AmenityAdrChartKey): boolean {
  return campspotTruthyAmenity(row[key]);
}

type PairBuckets = { with: number[]; without: number[] };

function emptyPairBuckets(): Record<AmenityAdrChartKey, PairBuckets> {
  return {
    sewer_hook_up: { with: [], without: [] },
    water_hookup: { with: [], without: [] },
    hot_tub_sauna: { with: [], without: [] },
    pool: { with: [], without: [] },
  };
}

export function createAmenityAdrFoldState(): Record<AmenityAdrChartKey, PairBuckets> {
  return emptyPairBuckets();
}

export function foldAmenityAdrRows(
  buckets: Record<AmenityAdrChartKey, PairBuckets>,
  rows: CampspotAmenityAdrAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (classifyCampspotUnitChartBucket(row as CampspotUnitTypeAggRow) !== 'rv') continue;

    const adr = adr2025ForRow(row);
    if (adr == null) continue;

    for (const key of AMENITY_ADR_CHART_KEYS) {
      const b = buckets[key];
      if (amenityPresent(row, key)) {
        b.with.push(adr);
      } else {
        b.without.push(adr);
      }
    }
  }
}

export function finalizeAmenityAdrFoldState(
  buckets: Record<AmenityAdrChartKey, PairBuckets>
): AmenityAdrChartRow[] {
  return bucketsToRows(buckets);
}

function bucketsToRows(buckets: Record<AmenityAdrChartKey, PairBuckets>): AmenityAdrChartRow[] {
  return AMENITY_ADR_CHART_KEYS.map((amenityKey) => {
    const b = buckets[amenityKey];
    const avgWithout = meanRounded(b.without);
    const avgWith = meanRounded(b.with);
    let diffRounded: number | null = null;
    if (avgWithout != null && avgWith != null) {
      diffRounded = Math.round(avgWith - avgWithout);
    }
    return {
      amenityKey,
      avgWithout,
      avgWith,
      nWithout: b.without.length,
      nWith: b.with.length,
      diffRounded,
    };
  });
}

export function aggregateCampspotRowsToAmenityAdrChart(
  rows: CampspotAmenityAdrAggRow[]
): AmenityAdrChartRow[] {
  const buckets = emptyPairBuckets();
  foldAmenityAdrRows(buckets, rows);
  return bucketsToRows(buckets);
}

const SELECT_FIELDS =
  'state, city, unit_type, description, property_name, quantity_of_units, retail_daily_rate_ytd, avg_retail_daily_rate_2025, ' +
  'sewer_hook_up, water_hookup, hot_tub_sauna, pool';

export async function fetchCampspotAmenityAdrChartData(
  supabase: SupabaseClient
): Promise<CampspotAmenityAdrChartResult> {
  const buckets = emptyPairBuckets();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(SELECT_FIELDS)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        rows: bucketsToRows(emptyPairBuckets()),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldAmenityAdrRows(buckets, data as unknown as CampspotAmenityAdrAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: bucketsToRows(buckets), rowsScanned, error: null };
}

export async function getCampspotAmenityAdrChartData(): Promise<CampspotAmenityAdrChartResult> {
  return fetchCampspotAmenityAdrChartData(createServerClient());
}
