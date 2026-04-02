/**
 * RV parking type distribution (pie) and mean ADR for pull-thru vs back-in only (bar), Campspot.
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

export const RV_PARKING_DIST_KEYS = ['back_in', 'pull_thru', 'not_listed'] as const;
export type RvParkingDistKey = (typeof RV_PARKING_DIST_KEYS)[number];

export const RV_PARKING_RATE_KEYS = ['pull_thru', 'back_in'] as const;
export type RvParkingRateKey = (typeof RV_PARKING_RATE_KEYS)[number];

export type CampspotRvParkingAggRow = {
  state: string | null;
  city: string | null;
  unit_type: string | null;
  description: string | null;
  property_name: string | null;
  quantity_of_units: string | null;
  retail_daily_rate_ytd: string | null;
  avg_retail_daily_rate_2025: string | null;
  rv_parking: string | null;
};

export type RvParkingDistSlice = {
  parkingKey: RvParkingDistKey;
  pct: number | null;
  n: number;
};

export type RvParkingRateBar = {
  parkingKey: RvParkingRateKey;
  avgAdr2025: number | null;
  n: number;
};

export type CampspotRvParkingChartsResult = {
  distribution: RvParkingDistSlice[];
  rateBars: RvParkingRateBar[];
  totalRvRows: number;
  rowsScanned: number;
  error: string | null;
};

export function classifyRvParkingType(raw: unknown): RvParkingDistKey {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === 'no data') return 'not_listed';
  if (/\b(pull[-\s]?thru|pull[-\s]?through|pullthrough)\b/.test(s)) {
    return 'pull_thru';
  }
  if (/\b(back[-\s]?in|backin)\b/.test(s)) {
    return 'back_in';
  }
  return 'not_listed';
}

function adr2025ForRow(row: CampspotRvParkingAggRow): number | null {
  const ytd = parseCampspotNumber(row.retail_daily_rate_ytd);
  if (ytd != null && ytd > 0) return ytd;
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
}

function emptyDistCounts(): Record<RvParkingDistKey, number> {
  return { back_in: 0, pull_thru: 0, not_listed: 0 };
}

function emptyRateBuckets(): Record<RvParkingRateKey, number[]> {
  return { pull_thru: [], back_in: [] };
}

export function createRvParkingFoldState(): {
  distCounts: Record<RvParkingDistKey, number>;
  rateBuckets: Record<RvParkingRateKey, number[]>;
} {
  return {
    distCounts: emptyDistCounts(),
    rateBuckets: emptyRateBuckets(),
  };
}

export function foldRvParkingRows(
  distCounts: Record<RvParkingDistKey, number>,
  rateBuckets: Record<RvParkingRateKey, number[]>,
  rows: CampspotRvParkingAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (classifyCampspotUnitChartBucket(row as CampspotUnitTypeAggRow) !== 'rv') continue;

    const pk = classifyRvParkingType(row.rv_parking);
    distCounts[pk] += 1;

    const adr = adr2025ForRow(row);
    if (adr == null) continue;

    if (pk === 'pull_thru') {
      rateBuckets.pull_thru.push(adr);
    } else if (pk === 'back_in') {
      rateBuckets.back_in.push(adr);
    }
  }
}

function distCountsToSlices(counts: Record<RvParkingDistKey, number>): RvParkingDistSlice[] {
  const total = RV_PARKING_DIST_KEYS.reduce((s, k) => s + counts[k], 0);
  return RV_PARKING_DIST_KEYS.map((parkingKey) => {
    const n = counts[parkingKey];
    const pct = total > 0 ? Math.round((1000 * n) / total) / 10 : null;
    return { parkingKey, n, pct };
  });
}

export function finalizeRvParkingFoldState(state: {
  distCounts: Record<RvParkingDistKey, number>;
  rateBuckets: Record<RvParkingRateKey, number[]>;
}): Pick<CampspotRvParkingChartsResult, 'distribution' | 'rateBars' | 'totalRvRows'> {
  const totalRvRows = RV_PARKING_DIST_KEYS.reduce((s, k) => s + state.distCounts[k], 0);
  return {
    distribution: distCountsToSlices(state.distCounts),
    rateBars: rateBucketsToBars(state.rateBuckets),
    totalRvRows,
  };
}

function rateBucketsToBars(buckets: Record<RvParkingRateKey, number[]>): RvParkingRateBar[] {
  return RV_PARKING_RATE_KEYS.map((parkingKey) => ({
    parkingKey,
    avgAdr2025: meanRounded(buckets[parkingKey]),
    n: buckets[parkingKey].length,
  }));
}

export function aggregateCampspotRowsToRvParkingCharts(
  rows: CampspotRvParkingAggRow[]
): { distribution: RvParkingDistSlice[]; rateBars: RvParkingRateBar[]; totalRvRows: number } {
  const distCounts = emptyDistCounts();
  const rateBuckets = emptyRateBuckets();
  foldRvParkingRows(distCounts, rateBuckets, rows);
  const totalRvRows = RV_PARKING_DIST_KEYS.reduce((s, k) => s + distCounts[k], 0);
  return {
    distribution: distCountsToSlices(distCounts),
    rateBars: rateBucketsToBars(rateBuckets),
    totalRvRows,
  };
}

const SELECT_FIELDS =
  'state, city, unit_type, description, property_name, quantity_of_units, retail_daily_rate_ytd, avg_retail_daily_rate_2025, rv_parking';

export async function fetchCampspotRvParkingChartsData(
  supabase: SupabaseClient
): Promise<CampspotRvParkingChartsResult> {
  const distCounts = emptyDistCounts();
  const rateBuckets = emptyRateBuckets();
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
        distribution: distCountsToSlices(emptyDistCounts()),
        rateBars: rateBucketsToBars(emptyRateBuckets()),
        totalRvRows: 0,
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldRvParkingRows(distCounts, rateBuckets, data as unknown as CampspotRvParkingAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  const totalRvRows = RV_PARKING_DIST_KEYS.reduce((s, k) => s + distCounts[k], 0);
  return {
    distribution: distCountsToSlices(distCounts),
    rateBars: rateBucketsToBars(rateBuckets),
    totalRvRows,
    rowsScanned,
    error: null,
  };
}

export async function getCampspotRvParkingChartsData(): Promise<CampspotRvParkingChartsResult> {
  return fetchCampspotRvParkingChartsData(createServerClient());
}
