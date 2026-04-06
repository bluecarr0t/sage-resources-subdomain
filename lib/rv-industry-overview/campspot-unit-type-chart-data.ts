/**
 * Unit-type bar charts (avg 2025 ARDR by type; % mix averaged per property), Campspot only.
 * Priority tuned for overview slices: vacation → tent → glamping → generic site (excluded) → RV.
 * Glamping before RV so hookup tokens (30/50 amp) on cabins/yurts stay in Lodging; cabin rule must not
 * treat “RV” in a property name (e.g. “… RV Resort”) as disqualifying.
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
import {
  parseCampspotAdr2025FromAnnualColumn,
  rowPassesStandardCampspot2025Quality,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';

const PAGE_SIZE = 1000;

export const UNIT_TYPE_CHART_BUCKET_KEYS = ['glamping', 'rv', 'tent'] as const;
export type UnitTypeChartBucketKey = (typeof UNIT_TYPE_CHART_BUCKET_KEYS)[number];

export type CampspotUnitTypeAggRow = {
  unit_type: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  quantity_of_units: string | null;
  occupancy_rate_2025: string | null;
  avg_retail_daily_rate_2025: string | null;
};

export type UnitTypeRateChartRow = {
  bucketKey: UnitTypeChartBucketKey;
  avgAdr2025: number | null;
  n: number;
};

export type UnitTypeDistributionChartRow = {
  bucketKey: UnitTypeChartBucketKey;
  pctMean: number | null;
  nProperties: number;
};

export type CampspotUnitTypeChartsResult = {
  rateRows: UnitTypeRateChartRow[];
  distributionRows: UnitTypeDistributionChartRow[];
  rowsScanned: number;
  error: string | null;
};

type PropAcc = { glamping: number; rv: number; tent: number };

function campspotBlob(row: CampspotUnitTypeAggRow): string {
  return [row.unit_type, row.description, row.property_name].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Maps wide classifier output to chart buckets; vacation / campground / unknown → excluded (null).
 */
export function classifyCampspotUnitChartBucket(row: CampspotUnitTypeAggRow): UnitTypeChartBucketKey | null {
  const t = campspotBlob(row);

  if (/\b(vrbo|airbnb|whole\s+(home|house|place|property)|entire\s+(home|place|cabin)|vacation\s+rental|short[\s-]term\s+rental|condo\s+rental)\b/.test(t)) {
    return null;
  }
  if (
    /\b(tent\s*site|primitive\s*site|hike[-\s]?in|walk[-\s]?in\s*tent|car\s*camping|ground\s*tent|basic\s*tent)\b/.test(
      t
    )
  ) {
    return 'tent';
  }
  if (
    /\b(glamp|yurt|safari\s*tent|bell\s*tent|canvas\s*tent|geodesic|dome\s*(suite|unit|tent)?|tree\s*house|treehouse|tiny\s*(home|house|cabin)|shepherd'?s?\s*hut|wall\s*tent|tipi|teepee|eco[\s-]?(pod|tent)|lodg(?:e|ing)\s*pod|mirror\s*cabin|airstream\s*(suite|glamp|stay))\b/.test(
      t
    )
  ) {
    return 'glamping';
  }
  if (
    /\b(cabin|cottage|bungalow|chalet|hut\s*rental)\b/.test(t) &&
    !/\b(rv\s*site|tent\s*site)\b/.test(t)
  ) {
    return 'glamping';
  }
  if (/\blodging\b/.test(t) && !/\b(rv\s*site|tent\s*site)\b/.test(t)) {
    return 'glamping';
  }
  if (
    /\b(standard\s*site|partial\s*hook|picnic\s*table\s*only|tent\s*\/\s*rv)\b/.test(t) &&
    !/\b(yurt|glamp|safari|canvas|dome|tree\s*house|tiny)\b/.test(t)
  ) {
    return null;
  }
  if (
    /\b(rv\s*site|rv\s*parking|motorhome|travel\s*trailer|fifth\s*wheel|5th\s*wheel|camper\s*van|campervan|pull[-\s]?through|full\s*hook|50\s*amp|30\s*amp|sewer\s*hook|black\s*water|tow\s*vehicle|class\s*[abc]\s*rv)\b/.test(
      t
    )
  ) {
    return 'rv';
  }

  return null;
}

function adr2025ForRow(row: CampspotUnitTypeAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

function rowSiteWeight(row: CampspotUnitTypeAggRow): number {
  const q = parseCampspotNumber(row.quantity_of_units);
  if (q != null && q >= 1) return Math.min(10_000, q);
  return 1;
}

function propertyGroupKey(row: CampspotUnitTypeAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

function emptyRateRows(): UnitTypeRateChartRow[] {
  return UNIT_TYPE_CHART_BUCKET_KEYS.map((bucketKey) => ({
    bucketKey,
    avgAdr2025: null,
    n: 0,
  }));
}

function emptyDistributionRows(): UnitTypeDistributionChartRow[] {
  return UNIT_TYPE_CHART_BUCKET_KEYS.map((bucketKey) => ({
    bucketKey,
    pctMean: null,
    nProperties: 0,
  }));
}

export function aggregateCampspotRowsToUnitTypeByRate(
  rows: CampspotUnitTypeAggRow[]
): UnitTypeRateChartRow[] {
  const adrBy: Record<UnitTypeChartBucketKey, number[]> = {
    glamping: [],
    rv: [],
    tent: [],
  };

  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (!rowPassesStandardCampspot2025Quality(row)) continue;

    const bucket = classifyCampspotUnitChartBucket(row);
    if (!bucket) continue;

    const adr = adr2025ForRow(row);
    if (adr == null) continue;

    adrBy[bucket].push(adr);
  }

  return UNIT_TYPE_CHART_BUCKET_KEYS.map((bucketKey) => ({
    bucketKey,
    avgAdr2025: meanRounded(adrBy[bucketKey]),
    n: adrBy[bucketKey].length,
  }));
}

export function aggregateCampspotRowsToUnitTypeDistribution(
  rows: CampspotUnitTypeAggRow[]
): UnitTypeDistributionChartRow[] {
  const byProp = new Map<string, PropAcc>();

  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (!rowPassesStandardCampspot2025Quality(row)) continue;

    const bucket = classifyCampspotUnitChartBucket(row);
    if (!bucket) continue;

    const pk = propertyGroupKey(row);
    if (!pk) continue;

    const w = rowSiteWeight(row);
    let acc = byProp.get(pk);
    if (!acc) {
      acc = { glamping: 0, rv: 0, tent: 0 };
      byProp.set(pk, acc);
    }
    acc[bucket] += w;
  }

  const pctGlamp: number[] = [];
  const pctRv: number[] = [];
  const pctTent: number[] = [];

  for (const acc of byProp.values()) {
    const total = acc.glamping + acc.rv + acc.tent;
    if (total <= 0) continue;
    pctGlamp.push((100 * acc.glamping) / total);
    pctRv.push((100 * acc.rv) / total);
    pctTent.push((100 * acc.tent) / total);
  }

  const nProperties = pctGlamp.length;

  if (nProperties === 0) {
    return emptyDistributionRows();
  }

  return [
    { bucketKey: 'glamping', pctMean: meanRounded(pctGlamp), nProperties },
    { bucketKey: 'rv', pctMean: meanRounded(pctRv), nProperties },
    { bucketKey: 'tent', pctMean: meanRounded(pctTent), nProperties },
  ];
}

export function createUnitTypeFoldState(): {
  adrBuckets: Record<UnitTypeChartBucketKey, number[]>;
  byProp: Map<string, PropAcc>;
} {
  return {
    adrBuckets: { glamping: [], rv: [], tent: [] },
    byProp: new Map(),
  };
}

export function foldUnitTypeRows(
  adrBuckets: Record<UnitTypeChartBucketKey, number[]>,
  byProp: Map<string, PropAcc>,
  rows: CampspotUnitTypeAggRow[]
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) continue;

    if (!rowPassesStandardCampspot2025Quality(row)) continue;

    const bucket = classifyCampspotUnitChartBucket(row);
    if (!bucket) continue;

    const adr = adr2025ForRow(row);
    if (adr != null) {
      adrBuckets[bucket].push(adr);
    }

    const pk = propertyGroupKey(row);
    if (!pk) continue;

    const w = rowSiteWeight(row);
    let acc = byProp.get(pk);
    if (!acc) {
      acc = { glamping: 0, rv: 0, tent: 0 };
      byProp.set(pk, acc);
    }
    acc[bucket] += w;
  }
}

function distributionFromPropMap(byProp: Map<string, PropAcc>): UnitTypeDistributionChartRow[] {
  const pctGlamp: number[] = [];
  const pctRv: number[] = [];
  const pctTent: number[] = [];

  for (const acc of byProp.values()) {
    const total = acc.glamping + acc.rv + acc.tent;
    if (total <= 0) continue;
    pctGlamp.push((100 * acc.glamping) / total);
    pctRv.push((100 * acc.rv) / total);
    pctTent.push((100 * acc.tent) / total);
  }

  const nProperties = pctGlamp.length;

  if (nProperties === 0) {
    return emptyDistributionRows();
  }

  return [
    { bucketKey: 'glamping', pctMean: meanRounded(pctGlamp), nProperties },
    { bucketKey: 'rv', pctMean: meanRounded(pctRv), nProperties },
    { bucketKey: 'tent', pctMean: meanRounded(pctTent), nProperties },
  ];
}

export function finalizeUnitTypeFoldState(state: {
  adrBuckets: Record<UnitTypeChartBucketKey, number[]>;
  byProp: Map<string, PropAcc>;
}): Pick<CampspotUnitTypeChartsResult, 'rateRows' | 'distributionRows'> {
  return {
    rateRows: rateRowsFromAdrBuckets(state.adrBuckets),
    distributionRows: distributionFromPropMap(state.byProp),
  };
}

function rateRowsFromAdrBuckets(adrBuckets: Record<UnitTypeChartBucketKey, number[]>): UnitTypeRateChartRow[] {
  return UNIT_TYPE_CHART_BUCKET_KEYS.map((bucketKey) => ({
    bucketKey,
    avgAdr2025: meanRounded(adrBuckets[bucketKey]),
    n: adrBuckets[bucketKey].length,
  }));
}

export async function fetchCampspotUnitTypeChartsData(
  supabase: SupabaseClient
): Promise<CampspotUnitTypeChartsResult> {
  const adrBuckets: Record<UnitTypeChartBucketKey, number[]> = {
    glamping: [],
    rv: [],
    tent: [],
  };
  const byProp = new Map<string, PropAcc>();

  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(
        'unit_type, property_name, city, state, description, quantity_of_units, ' +
          'occupancy_rate_2025, avg_retail_daily_rate_2025'
      )
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        rateRows: emptyRateRows(),
        distributionRows: emptyDistributionRows(),
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldUnitTypeRows(adrBuckets, byProp, data as unknown as CampspotUnitTypeAggRow[]);

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return {
    rateRows: rateRowsFromAdrBuckets(adrBuckets),
    distributionRows: distributionFromPropMap(byProp),
    rowsScanned,
    error: null,
  };
}

export async function getCampspotUnitTypeChartsData(): Promise<CampspotUnitTypeChartsResult> {
  return fetchCampspotUnitTypeChartsData(createServerClient());
}
