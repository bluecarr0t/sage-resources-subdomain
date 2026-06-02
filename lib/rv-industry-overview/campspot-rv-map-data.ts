/**
 * RV regional map: regional 2025 means (map coloring) plus per-state 2024 vs 2025 matched cohort.
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
  RV_OVERVIEW_STANDARD_OCC_MIN_PCT,
  RV_OVERVIEW_STANDARD_RATE_MAX_USD,
  RV_OVERVIEW_STANDARD_RATE_MIN_USD,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  type RvIndustryRegionId,
  RV_INDUSTRY_REGION_IDS,
  getRvIndustryRegionForStateAbbr,
} from '@/lib/rv-industry-overview/us-rv-regions';
import type { RegionalAggregateRow } from '@/lib/rv-industry-overview/campspot-regional-aggregates';

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

/** Min site rows per state to show a mean on the RV state ADR choropleth. */
export const STATE_ADR_CHOROPLETH_MIN_N = 8;

/** Glamping cohorts are smaller per state — use a lower gate so Sage/Hipcamp coverage is visible. */
export const GLAMPING_STATE_ADR_CHOROPLETH_MIN_N = 3;

export type StateAdrChoroplethEntry = {
  /** Unweighted mean of row-level 2025 ARDR when n > 0; null when n === 0. */
  meanAdr: number | null;
  /** Qualifying inventory rows in state (min-N gate and partial labels). */
  n: number;
  /** Distinct properties (name + state + city) with at least one qualifying unit row. */
  nProperties: number;
  /**
   * Unit count for display: qualifying rows (`rows`) or sum of `quantity_of_units` (`quantity_of_units`).
   */
  nUnits: number;
};

/** How state ADR choropleth totals units on the regional map. */
export type RvMapChoroplethUnitCountMode = 'rows' | 'quantity_of_units';

export type CampspotRvMapAggRow = {
  state: string | null;
  property_name?: string | null;
  city?: string | null;
  quantity_of_units?: string | null;
  avg_retail_daily_rate_2025: string | null;
  occupancy_rate_2025: string | null;
  occupancy_rate_2024: string | null;
  avg_retail_daily_rate_2024: string | null;
};

type StateAdrChoroplethAccum = {
  adrs: number[];
  propertyKeys: Set<string>;
  unitCount: number;
};

export function choroplethUnitWeightForRow(
  row: CampspotRvMapAggRow,
  mode: RvMapChoroplethUnitCountMode
): number {
  if (mode === 'rows') return 1;
  const q = parseCampspotNumber(row.quantity_of_units);
  if (q != null && q >= 1) return Math.round(q);
  return 0;
}

function mapChoroplethPropertyKey(row: CampspotRvMapAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

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

/**
 * How five-region map labels include rows.
 * - `paired_adr_occ`: 2025 ARDR and occupancy in standard bands (RV / Hipcamp default).
 * - `adr_only`: 2025 ARDR in band only (Sage glamping — no occupancy field).
 */
export type RegionalMapLabelMode = 'paired_adr_occ' | 'adr_only';

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
/** Whether a row counts toward per-state ADR choropleth (ADR in regional band; occupancy optional). */
export function rowQualifiesForStateAdrChoropleth(
  row: CampspotRvMapAggRow,
  bands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  labelMode: RegionalMapLabelMode = 'paired_adr_occ'
): boolean {
  const stateAbbr = normalizeState(row.state);
  if (!stateAbbr || !getRvIndustryRegionForStateAbbr(stateAbbr)) return false;
  const diag = regionalMapLabelDiagnostics(row, bands, labelMode);
  return (
    diag.adr2025 != null && passesRegionalMapRetailRateUsd(diag.adr2025, bands)
  );
}

export function regionalMapLabelDiagnostics(
  row: CampspotRvMapAggRow,
  bands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  labelMode: RegionalMapLabelMode = 'paired_adr_occ'
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
  if (labelMode === 'adr_only') {
    return { included: true, adr2025: adrRegional, occ2025: occ };
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
  stateAdrChoropleth: Map<string, StateAdrChoroplethAccum>,
  rows: CampspotRvMapAggRow[],
  regionalRateBands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  regionalLabelMode: RegionalMapLabelMode = 'paired_adr_occ',
  choroplethUnitCountMode: RvMapChoroplethUnitCountMode = 'rows'
): void {
  for (const row of rows) {
    const stateAbbr = normalizeState(row.state);
    if (!stateAbbr) continue;

    const regionId = getRvIndustryRegionForStateAbbr(stateAbbr);
    const labelDiag = regionalMapLabelDiagnostics(row, regionalRateBands, regionalLabelMode);

    if (
      regionId &&
      labelDiag.adr2025 != null &&
      passesRegionalMapRetailRateUsd(labelDiag.adr2025, regionalRateBands)
    ) {
      let accum = stateAdrChoropleth.get(stateAbbr);
      if (!accum) {
        accum = { adrs: [], propertyKeys: new Set(), unitCount: 0 };
        stateAdrChoropleth.set(stateAbbr, accum);
      }
      accum.adrs.push(labelDiag.adr2025);
      accum.unitCount += choroplethUnitWeightForRow(row, choroplethUnitCountMode);
      const pk = mapChoroplethPropertyKey(row);
      if (pk) accum.propertyKeys.add(pk);
    }

    if (regionId) {
      if (labelDiag.included) {
        const bucket = regional[regionId];
        bucket.adr.push(labelDiag.adr2025);
        if (labelDiag.occ2025 != null && passesStandardCampspotOccupancyPercent(labelDiag.occ2025)) {
          bucket.occ.push(labelDiag.occ2025);
        }
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

export type CreateRvMapFoldStateOptions = {
  regionalLabelMode?: RegionalMapLabelMode;
  choroplethUnitCountMode?: RvMapChoroplethUnitCountMode;
};

export function createRvMapFoldState(
  options: CreateRvMapFoldStateOptions | RegionalMapLabelMode = 'paired_adr_occ'
) {
  const opts: CreateRvMapFoldStateOptions =
    typeof options === 'string' ? { regionalLabelMode: options } : options;
  return {
    regional: emptyRegionalAccum(),
    stateBuckets: new Map<string, StateBucket>(),
    stateAdrChoropleth: new Map<string, StateAdrChoroplethAccum>(),
    regionalLabelMode: opts.regionalLabelMode ?? 'paired_adr_occ',
    choroplethUnitCountMode: opts.choroplethUnitCountMode ?? 'rows',
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
    stateAdrChoropleth: stateAdrMapToChoropleth(
      state.stateAdrChoropleth,
      state.choroplethUnitCountMode
    ),
    rowsScanned,
    error: null,
  };
}

function stateAdrMapToChoropleth(
  m: Map<string, StateAdrChoroplethAccum>,
  choroplethUnitCountMode: RvMapChoroplethUnitCountMode = 'rows'
): Record<string, StateAdrChoroplethEntry> {
  const out: Record<string, StateAdrChoroplethEntry> = {};
  for (const [abbr, accum] of m) {
    const nRows = accum.adrs.length;
    const nUnits =
      choroplethUnitCountMode === 'quantity_of_units' ? accum.unitCount : nRows;
    const nProperties = accum.propertyKeys.size;
    out[abbr] = {
      n: nRows,
      nUnits,
      nProperties,
      meanAdr: nRows > 0 ? meanRounded(accum.adrs) : null,
    };
  }
  return out;
}

/** Pure aggregation for tests */
export function aggregateCampspotRowsToRvMapData(
  rows: CampspotRvMapAggRow[],
  regionalRateBands: RvMapRegionalRateBands = RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  regionalLabelMode: RegionalMapLabelMode = 'paired_adr_occ',
  choroplethUnitCountMode: RvMapChoroplethUnitCountMode = 'rows'
): {
  byRegion: Record<RvIndustryRegionId, RegionalAggregateRow>;
  byState: Record<string, StateRvMetrics>;
  stateAdrChoropleth: Record<string, StateAdrChoroplethEntry>;
} {
  const regional = emptyRegionalAccum();
  const stateBuckets = new Map<string, StateBucket>();
  const stateAdrChoropleth = new Map<string, StateAdrChoroplethAccum>();
  foldRvMapRows(
    regional,
    stateBuckets,
    stateAdrChoropleth,
    rows,
    regionalRateBands,
    regionalLabelMode,
    choroplethUnitCountMode
  );
  return {
    byRegion: regionalToByRegion(regional),
    byState: stateBucketsToByState(stateBuckets),
    stateAdrChoropleth: stateAdrMapToChoropleth(stateAdrChoropleth, choroplethUnitCountMode),
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
