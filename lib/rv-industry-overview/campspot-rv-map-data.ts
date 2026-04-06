/**
 * Single Campspot scan for the RV regional map: regional 2025 means (map coloring)
 * plus per-state 2024 vs 2025 metrics on a matched cohort only (same ARDR rules as the trends chart).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  meanRounded,
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  parseCampspotAdr2025FromAnnualColumn,
  RV_OVERVIEW_STANDARD_OCC_MIN_PCT,
  RV_OVERVIEW_STANDARD_RATE_MAX_USD,
  RV_OVERVIEW_STANDARD_RATE_MIN_USD,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import { CAMPSPOT_RV_OVERVIEW_MAX_ROWS } from '@/lib/rv-industry-overview/campspot-fetch-cap';
import {
  type RvIndustryRegionId,
  RV_INDUSTRY_REGION_IDS,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';
import type { RegionalAggregateRow } from '@/lib/rv-industry-overview/campspot-regional-aggregates';

const PAGE_SIZE = 1000;

/**
 * Upper ARDR bound for five-region labels + state ADR choropleth on the regional map (2025).
 * RV/Tent use the standard $3k cap; Lodging (glamping) uses a higher ceiling so premium Western
 * markets are not excluded solely by rate (see `RV_MAP_REGIONAL_RATE_BANDS_GLAMPING`).
 */
export type RvMapRegionalRateBands = { maxRetailUsd: number };

export const RV_MAP_REGIONAL_RATE_BANDS_DEFAULT: RvMapRegionalRateBands = {
  maxRetailUsd: RV_OVERVIEW_STANDARD_RATE_MAX_USD,
};

/** Lodging toggle only — glamping ADR often exceeds $3k in CA/OR/CO-style markets. */
export const RV_MAP_REGIONAL_RATE_BANDS_GLAMPING: RvMapRegionalRateBands = {
  maxRetailUsd: 10_000,
};

function passesRegionalMapRetailRateUsd(
  rateUsd: number | null,
  bands: RvMapRegionalRateBands
): boolean {
  return (
    rateUsd != null &&
    rateUsd >= RV_OVERVIEW_STANDARD_RATE_MIN_USD &&
    rateUsd <= bands.maxRetailUsd
  );
}

/** Min Campspot rows with positive 2025 ARDR (`avg_retail_daily_rate_2025`) per state to show a rate on the state ADR choropleth. */
export const STATE_ADR_CHOROPLETH_MIN_N = 8;

export type StateAdrChoroplethEntry = {
  /** Unweighted mean of row-level 2025 ARDR when n > 0; null when n === 0. */
  meanAdr: number | null;
  n: number;
};

export type CampspotRvMapAggRow = {
  state: string | null;
  avg_retail_daily_rate_2025: string | null;
  occupancy_rate_2025: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
};

export type StateRvMetrics = {
  meanOcc2024: number | null;
  meanOcc2025: number | null;
  meanAdr2024: number | null;
  meanAdr2025: number | null;
  /** Rows included in both year means and in YoY change (matched cohort). */
  nMatched: number;
};

export type CampspotRvMapDataResult = {
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>;
  byState: Record<string, StateRvMetrics>;
  /** Per-state 2025 ARDR for choropleth: parsed `avg_retail_daily_rate_2025` in regional rate band. No occupancy filter. */
  stateAdrChoropleth: Record<string, StateAdrChoroplethEntry>;
  rowsScanned: number;
  error: string | null;
};

type RegionalAccum = Record<RvIndustryRegionId, { adr: number[]; occ: number[] }>;
type StateBucket = {
  occ2024: number[];
  adr2024: number[];
  occ2025: number[];
  adr2025: number[];
};

function emptyRegionalAccum(): RegionalAccum {
  return {
    west: { adr: [], occ: [] },
    southwest: { adr: [], occ: [] },
    midwest: { adr: [], occ: [] },
    southeast: { adr: [], occ: [] },
    northeast: { adr: [], occ: [] },
  };
}

/** 2025 ARDR for map/regional aggregates: `avg_retail_daily_rate_2025` only. */
function adr2025ForRow(row: CampspotRvMapAggRow): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

/** 2024 ARDR: annual column only (no year-to-date field in Campspot for 2024). */
function adr2024ForRow(row: CampspotRvMapAggRow): number | null {
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  if (annual != null && annual > 0) return annual;
  return null;
}

/**
 * 2025 ARDR for the state modal matched cohort (YoY with 2024): annual avg column only.
 * Matches the definition of `adr2024ForRow` so we do not compare full-year 2024 averages
 * to 2025 YTD retail (which often reads higher and breaks state-level YoY).
 * Choropleth and five-region labels still use `adr2025ForRow` (YTD → annual → seasonal).
 */
function adr2025AnnualForMatchedCohortRow(row: CampspotRvMapAggRow): number | null {
  const annual = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  if (annual != null && annual > 0) return annual;
  return null;
}

/** Why a row is omitted from the five-region ARDR + occupancy labels on the regional map (2025 gate). */
export type RegionalMapLabelExclusionReason =
  | 'missing_2025_adr'
  | 'adr_below_standard_minimum_usd'
  | 'adr_above_standard_maximum_usd'
  | 'missing_occupancy'
  | 'occupancy_below_standard_minimum_pct'
  | 'occupancy_at_or_above_100_pct';

export type RegionalMapLabelDiagnostics =
  | { included: true; adr2025: number; occ2025: number }
  | {
      included: false;
      reason: RegionalMapLabelExclusionReason;
      /** Parsed 2025 ADR when present (may be outside standard band). */
      adr2025: number | null;
      occ2025: number | null;
    };

/**
 * Explains whether a row counts toward regional map label means (same logic as `foldRvMapRows`).
 * Choropleth ADR uses `adr2025` when non-null and in the regional rate band (no occupancy gate).
 */
export function regionalMapLabelDiagnostics(
  row: CampspotRvMapAggRow,
  bands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT
): RegionalMapLabelDiagnostics {
  const adrRegional = adr2025ForRow(row);
  const occ = parseCampspotOccupancyPercent(row.occupancy_rate_2025);

  if (adrRegional == null) {
    return { included: false, reason: 'missing_2025_adr', adr2025: null, occ2025: occ };
  }
  if (!passesRegionalMapRetailRateUsd(adrRegional, bands)) {
    return {
      included: false,
      reason:
        adrRegional < RV_OVERVIEW_STANDARD_RATE_MIN_USD
          ? 'adr_below_standard_minimum_usd'
          : 'adr_above_standard_maximum_usd',
      adr2025: adrRegional,
      occ2025: occ,
    };
  }
  if (occ == null) {
    return { included: false, reason: 'missing_occupancy', adr2025: adrRegional, occ2025: null };
  }
  if (!passesStandardCampspotOccupancyPercent(occ)) {
    return {
      included: false,
      reason:
        occ < RV_OVERVIEW_STANDARD_OCC_MIN_PCT
          ? 'occupancy_below_standard_minimum_pct'
          : 'occupancy_at_or_above_100_pct',
      adr2025: adrRegional,
      occ2025: occ,
    };
  }
  return { included: true, adr2025: adrRegional, occ2025: occ };
}

export function foldRvMapRows(
  regional: RegionalAccum,
  stateBuckets: Map<string, StateBucket>,
  stateAdrChoropleth: Map<string, number[]>,
  rows: CampspotRvMapAggRow[],
  regionalRateBands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr) continue;

    const regionId = getRvIndustryRegionForStateAbbr(stateAbbr);
    if (regionId) {
      const labelDiag = regionalMapLabelDiagnostics(row, regionalRateBands);
      if (labelDiag.included) {
        const bucket = regional[regionId];
        bucket.adr.push(labelDiag.adr2025);
        bucket.occ.push(labelDiag.occ2025);
      }

      if (
        labelDiag.adr2025 != null &&
        passesRegionalMapRetailRateUsd(labelDiag.adr2025, regionalRateBands)
      ) {
        const arr = stateAdrChoropleth.get(stateAbbr) ?? [];
        arr.push(labelDiag.adr2025);
        stateAdrChoropleth.set(stateAbbr, arr);
      }
    }

    let sb = stateBuckets.get(stateAbbr);
    if (!sb) {
      sb = { occ2024: [], adr2024: [], occ2025: [], adr2025: [] };
      stateBuckets.set(stateAbbr, sb);
    }

    const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
    const a4 = adr2024ForRow(row);
    const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
    const a5 = adr2025AnnualForMatchedCohortRow(row);
    if (
      o4 != null &&
      a4 != null &&
      o5 != null &&
      a5 != null &&
      passesStandardCampspotOccupancyPercent(o4) &&
      passesStandardCampspotOccupancyPercent(o5) &&
      passesStandardCampspotRetailRateUsd(a4) &&
      passesStandardCampspotRetailRateUsd(a5)
    ) {
      sb.occ2024.push(o4);
      sb.adr2024.push(a4);
      sb.occ2025.push(o5);
      sb.adr2025.push(a5);
    }
  }
}

function regionalToByRegion(regional: RegionalAccum): Record<RvIndustryRegionId, RegionalAggregateRow> {
  const byRegion = {} as Record<RvIndustryRegionId, RegionalAggregateRow>;
  for (const id of RV_INDUSTRY_REGION_IDS) {
    const { adr, occ } = regional[id];
    const n = adr.length;
    byRegion[id] = {
      regionId: id,
      meanAdr: meanRounded(adr),
      meanOccupancyPct: meanRounded(occ),
      siteCount: n,
    };
  }
  return byRegion;
}

function stateBucketsToByState(stateBuckets: Map<string, StateBucket>): Record<string, StateRvMetrics> {
  const byState: Record<string, StateRvMetrics> = {};
  for (const [abbr, b] of stateBuckets) {
    const nMatched = b.occ2024.length;
    byState[abbr] = {
      meanOcc2024: meanRounded(b.occ2024),
      meanOcc2025: meanRounded(b.occ2025),
      meanAdr2024: meanRounded(b.adr2024),
      meanAdr2025: meanRounded(b.adr2025),
      nMatched,
    };
  }
  return byState;
}

export function createRvMapFoldState() {
  return {
    regional: emptyRegionalAccum(),
    stateBuckets: new Map<string, StateBucket>(),
    stateAdrChoropleth: new Map<string, number[]>(),
  };
}

export type RvMapFoldState = ReturnType<typeof createRvMapFoldState>;

export function finalizeRvMapFoldState(
  state: RvMapFoldState,
  rowsScanned: number,
  error: string | null
): CampspotRvMapDataResult {
  if (error) {
    return {
      byRegion: emptyByRegion(),
      byState: {},
      stateAdrChoropleth: {},
      rowsScanned,
      error,
    };
  }
  return {
    byRegion: regionalToByRegion(state.regional),
    byState: stateBucketsToByState(state.stateBuckets),
    stateAdrChoropleth: stateAdrMapToChoropleth(state.stateAdrChoropleth),
    rowsScanned,
    error: null,
  };
}

function stateAdrMapToChoropleth(m: Map<string, number[]>): Record<string, StateAdrChoroplethEntry> {
  const out: Record<string, StateAdrChoroplethEntry> = {};
  for (const [abbr, vals] of m) {
    const n = vals.length;
    out[abbr] = {
      n,
      meanAdr: n > 0 ? meanRounded(vals) : null,
    };
  }
  return out;
}

/** Pure aggregation for tests */
export function aggregateCampspotRowsToRvMapData(
  rows: CampspotRvMapAggRow[],
  regionalRateBands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT
): {
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>;
  byState: Record<string, StateRvMetrics>;
  stateAdrChoropleth: Record<string, StateAdrChoroplethEntry>;
} {
  const regional = emptyRegionalAccum();
  const stateBuckets = new Map<string, StateBucket>();
  const stateAdrChoropleth = new Map<string, number[]>();
  foldRvMapRows(regional, stateBuckets, stateAdrChoropleth, rows, regionalRateBands);
  return {
    byRegion: regionalToByRegion(regional),
    byState: stateBucketsToByState(stateBuckets),
    stateAdrChoropleth: stateAdrMapToChoropleth(stateAdrChoropleth),
  };
}

function emptyByRegion(): Record<RvIndustryRegionId, RegionalAggregateRow> {
  return RV_INDUSTRY_REGION_IDS.reduce(
    (acc, id) => {
      acc[id] = {
        regionId: id,
        meanAdr: null,
        meanOccupancyPct: null,
        siteCount: 0,
      };
      return acc;
    },
    {} as Record<RvIndustryRegionId, RegionalAggregateRow>
  );
}

export async function fetchCampspotRvMapData(
  supabase: SupabaseClient
): Promise<CampspotRvMapDataResult> {
  const regional = emptyRegionalAccum();
  const stateBuckets = new Map<string, StateBucket>();
  const stateAdrChoropleth = new Map<string, number[]>();
  let offset = 0;
  let rowsScanned = 0;

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const { data, error } = await supabase
      .from('campspot')
      .select(
        'state, avg_retail_daily_rate_2025, occupancy_rate_2025, ' +
          'occupancy_rate_2024, avg_retail_daily_rate_2024'
      )
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return {
        byRegion: emptyByRegion(),
        byState: {},
        stateAdrChoropleth: {},
        rowsScanned,
        error: error.message,
      };
    }

    if (!data?.length) break;

    foldRvMapRows(
      regional,
      stateBuckets,
      stateAdrChoropleth,
      data as unknown as CampspotRvMapAggRow[]
    );

    rowsScanned += data.length;
    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return {
    byRegion: regionalToByRegion(regional),
    byState: stateBucketsToByState(stateBuckets),
    stateAdrChoropleth: stateAdrMapToChoropleth(stateAdrChoropleth),
    rowsScanned,
    error: null,
  };
}

export async function getCampspotRvMapData(): Promise<CampspotRvMapDataResult> {
  return fetchCampspotRvMapData(createServerClient());
}
