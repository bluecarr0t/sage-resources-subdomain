/**
 * Mean seasonal weekday/weekend retail rates from Campspot (winter–fall columns).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { createServerClient } from '@/lib/supabase';
import { meanRounded, parseCampspotNumber } from '@/lib/rv-industry-overview/campspot-field-parse';
import { passesStandardCampspotRetailRateUsd } from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';

const PAGE_SIZE = 1000;

export const SEASON_RATE_KEYS = [
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
] as const;

export type SeasonRateKey = (typeof SEASON_RATE_KEYS)[number];

export type CampspotSeasonRatesAggRow = {
  state: string | null;
  winter_weekday: string | null;
  winter_weekend: string | null;
  spring_weekday: string | null;
  spring_weekend: string | null;
  summer_weekday: string | null;
  summer_weekend: string | null;
  fall_weekday: string | null;
  fall_weekend: string | null;
};

export type SeasonRatesChartRow = {
  rateKey: SeasonRateKey;
  avgRate: number | null;
  n: number;
};

export type CampspotSeasonRatesChartResult = {
  rows: SeasonRatesChartRow[];
  rowsScanned: number;
  error: string | null;
};

const SELECT_FIELDS =
  'state, winter_weekday, winter_weekend, spring_weekday, spring_weekend, ' +
  'summer_weekday, summer_weekend, fall_weekday, fall_weekend';

function emptyBuckets(): Record<SeasonRateKey, number[]> {
  return {
    winter_weekday: [],
    winter_weekend: [],
    spring_weekday: [],
    spring_weekend: [],
    summer_weekday: [],
    summer_weekend: [],
    fall_weekday: [],
    fall_weekend: [],
  };
}

export function createSeasonRatesFoldState(): Record<SeasonRateKey, number[]> {
  return emptyBuckets();
}

export function foldSeasonRateRows(
  buckets: Record<SeasonRateKey, number[]>,
  rows: CampspotSeasonRatesAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    for (const key of SEASON_RATE_KEYS) {
      const n = parseCampspotNumber(row[key]);
      if (n != null && passesStandardCampspotRetailRateUsd(n)) {
        buckets[key].push(n);
      }
    }
  }
}

export function finalizeSeasonRatesFoldState(
  buckets: Record<SeasonRateKey, number[]>
): SeasonRatesChartRow[] {
  return bucketsToRows(buckets);
}

function bucketsToRows(buckets: Record<SeasonRateKey, number[]>): SeasonRatesChartRow[] {
  return SEASON_RATE_KEYS.map((rateKey) => ({
    rateKey,
    avgRate: meanRounded(buckets[rateKey]),
    n: buckets[rateKey].length,
  }));
}

export function aggregateCampspotRowsToSeasonRates(
  rows: CampspotSeasonRatesAggRow[]
): SeasonRatesChartRow[] {
  const buckets = emptyBuckets();
  foldSeasonRateRows(buckets, rows);
  return bucketsToRows(buckets);
}

export async function fetchCampspotSeasonRatesChartData(
  supabase: SupabaseClient
): Promise<CampspotSeasonRatesChartResult> {
  const buckets = emptyBuckets();
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
        rows: bucketsToRows(emptyBuckets()),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldSeasonRateRows(buckets, data as unknown as CampspotSeasonRatesAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return { rows: bucketsToRows(buckets), rowsScanned, error: null };
}

export async function getCampspotSeasonRatesChartData(): Promise<CampspotSeasonRatesChartResult> {
  return fetchCampspotSeasonRatesChartData(createServerClient());
}
