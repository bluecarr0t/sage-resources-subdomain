/**
 * Paginated scans over `campspot` and `all_roverpass_data_new` for all RV Industry Overview charts,
 * plus Next.js data cache. Replaces nine independent full-table scans (which could exceed server timeouts).
 */

import { unstable_cache } from 'next/cache';
import { cache as reactCache } from 'react';
import {
  industryOverviewSnapshotMetaFromRow,
  type IndustryOverviewCacheRow,
} from '@/lib/industry-overview/industry-overview-cache-row';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import {
  CAMPSPOT_RV_OVERVIEW_MAX_ROWS,
  CAMPSPOT_RV_OVERVIEW_PAGE_SIZE,
  CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES,
  ROVERPASS_RV_OVERVIEW_MAX_ROWS,
} from '@/lib/rv-industry-overview/campspot-fetch-cap';
import {
  normalizeRoverpassRowToOverviewWide,
  ROVERPASS_RV_OVERVIEW_PAGE_SELECT,
  type RvOverviewWideRow,
} from '@/lib/rv-industry-overview/rv-overview-wide-row';
import { rvOverviewSupabaseDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { sanitizeRvOverviewPageDataPayload } from '@/lib/rv-industry-overview/sanitize-rv-overview-payload';
import {
  buildSourceScanMeta,
  emptyRvOverviewScanMeta,
  type RvOverviewScanMeta,
} from '@/lib/rv-industry-overview/rv-overview-scan-meta';
import {
  aggregateCampspotRowsToRvMapData,
  createRvMapFoldState,
  finalizeRvMapFoldState,
  foldRvMapRows,
  RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
  type CampspotRvMapAggRow,
  type CampspotRvMapDataResult,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import type { CampspotTrendsAggRow } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import {
  aggregateCampspotRowsToTrendsChart,
  createTrendsFoldState,
  finalizeTrendsFoldState,
  foldTrendsRows,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotTrendsChartResult } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotSizeTierAggRow } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import {
  aggregateCampspotRowsToSizeTierChart,
  createSizeTierFoldState,
  finalizeSizeTierFoldState,
  foldSizeTierRows,
} from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import type { CampspotSizeTierChartResult } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import {
  type CampspotUnitTypeAggRow,
  type CampspotUnitTypeChartsResult,
  type UnitTypeChartBucketKey,
  aggregateCampspotRowsToUnitTypeByRate,
  aggregateCampspotRowsToUnitTypeDistribution,
  classifyCampspotUnitChartBucket,
  createUnitTypeFoldState,
  finalizeUnitTypeFoldState,
  foldUnitTypeRows,
  UNIT_TYPE_CHART_BUCKET_KEYS,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import type { CampspotSeasonRatesAggRow } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import {
  aggregateCampspotRowsToSeasonRates,
  createSeasonRatesFoldState,
  finalizeSeasonRatesFoldState,
  foldSeasonRateRows,
} from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import type { CampspotSeasonRatesChartResult } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import type { CampspotSurfaceRatesAggRow } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import {
  aggregateCampspotRowsToSurfaceRates,
  createSurfaceRatesFoldState,
  finalizeSurfaceRatesFoldState,
  foldSurfaceRows,
} from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import type { CampspotSurfaceRatesChartResult } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import type { CampspotAmenityPropertiesAggRow } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import {
  aggregateCampspotRowsToAmenityPropertyPcts,
  createAmenityPropertiesFoldState,
  finalizeAmenityPropertiesFoldState,
  foldAmenityPropertyRows,
} from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import type { CampspotAmenityPropertiesChartResult } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import type { CampspotAmenityAdrAggRow } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import {
  aggregateCampspotRowsToAmenityAdrChart,
  createAmenityAdrFoldState,
  finalizeAmenityAdrFoldState,
  foldAmenityAdrRows,
} from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import type { CampspotAmenityAdrChartResult } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import type { CampspotRvParkingAggRow } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import {
  aggregateCampspotRowsToRvParkingCharts,
  createRvParkingFoldState,
  finalizeRvParkingFoldState,
  foldRvParkingRows,
} from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import type { CampspotRvParkingChartsResult } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import { RvOverviewSnapshotMissingError } from '@/lib/rv-industry-overview/rv-overview-errors';
import {
  createRvOverviewSnapshotInventoryAccum,
  finalizeRvOverviewSnapshotInventory,
  recordRvOverviewSnapshotInventoryRow,
  type RvOverviewSnapshotInventory,
} from '@/lib/rv-industry-overview/rv-overview-snapshot-inventory';
import {
  createChartTransparencyAccum,
  createUnclassifiedAccum,
  finalizeChartTransparencyAccum,
  finalizeUnclassifiedAccum,
  recordUnitSliceChartTransparency,
  recordUnitTypeComparisonChartTransparency,
  recordUnclassifiedRow,
  type RvOverviewChartTransparencyMap,
  type RvOverviewDataSource,
  type RvOverviewScanTransparency,
  type ChartTransparencyAccum,
  type UnclassifiedAccum,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

const CAMPSPOT_RV_OVERVIEW_CACHE_TABLE = 'campspot_rv_overview_cache';

/** When `1`, page loads may run live Campspot/RoverPass scans if Postgres snapshot is missing (dev only). */
function rvOverviewLiveScanAllowed(): boolean {
  return process.env.RV_OVERVIEW_ALLOW_LIVE_SCAN === '1';
}

export { RvOverviewSnapshotMissingError } from '@/lib/rv-industry-overview/rv-overview-errors';
export { isRvOverviewSnapshotMissingError } from '@/lib/rv-industry-overview/rv-overview-errors';

/** Superset of columns needed by every RV overview aggregate (one row shape per page). */
export const CAMPSPOT_RV_OVERVIEW_PAGE_SELECT =
  'state, city, property_name, unit_type, description, quantity_of_units, property_total_sites, ' +
  'avg_retail_daily_rate_2025, avg_retail_daily_rate_2024, occupancy_rate_2025, occupancy_rate_2024, ' +
  'winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, ' +
  'fall_weekday, fall_weekend, rv_surface_type, rv_parking, ' +
  'hot_tub_sauna, pool, electrical_hook_up, sewer_hook_up, water_hookup';

export type { RvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';
export {
  RV_OVERVIEW_UNIT_FILTER_KEYS,
  parseRvOverviewUnitFilterKey,
} from '@/lib/rv-industry-overview/rv-overview-unit-filter';
import type { RvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';

export type { ChartSourceBreakdown } from '@/lib/rv-industry-overview/rv-overview-chart-transparency';

export type UnitTypeComparisonSourceTransparency = {
  unitTypeRate: import('@/lib/rv-industry-overview/rv-overview-chart-transparency').ChartSourceBreakdown;
  unitTypeDistribution: import('@/lib/rv-industry-overview/rv-overview-chart-transparency').ChartSourceBreakdown;
};

export type CampspotRvOverviewSlice = {
  mapResult: CampspotRvMapDataResult;
  trendsResult: CampspotTrendsChartResult;
  sizeResult: CampspotSizeTierChartResult;
  seasonRatesResult: CampspotSeasonRatesChartResult;
  surfaceRatesResult: CampspotSurfaceRatesChartResult;
  amenityPropsResult: CampspotAmenityPropertiesChartResult;
  amenityAdrResult: CampspotAmenityAdrChartResult;
  rvParkingChartsResult: CampspotRvParkingChartsResult;
  /** Per-chart row counts by source; omitted until snapshot refresh after deploy. */
  chartSourceTransparency?: RvOverviewChartTransparencyMap;
};

export type { RvOverviewChartTransparencyMap, RvOverviewScanTransparency };

/** Postgres `campspot_rv_overview_cache` metadata (not wrapped in Next.js `unstable_cache`). */
export type RvOverviewSnapshotMeta = {
  present: boolean;
  computedAt: string | null;
  rowsScanned: number | null;
};

/** Campspot-only aggregates (no RoverPass rows); for `?source=campspot`. */
export type RvOverviewCampspotOnlyPayload = {
  rowsScannedTotal: number;
  unitTypeComparisonResult: CampspotUnitTypeChartsResult;
  byUnitFilter: Record<RvOverviewUnitFilterKey, CampspotRvOverviewSlice>;
  scanTransparency?: RvOverviewScanTransparency;
};

export type CampspotRvOverviewPageData = {
  /** Total Campspot + RoverPass rows read in the scan (same for every unit-type slice). */
  rowsScannedTotal: number;
  rowsScannedCampspot: number;
  rowsScannedRoverpass: number;
  /**
   * Unit-type bar charts (avg. rate + mix) across all three buckets in one pass.
   * Not scoped to the RV / Tent / Lodging toggle.
   */
  unitTypeComparisonResult: CampspotUnitTypeChartsResult;
  byUnitFilter: Record<RvOverviewUnitFilterKey, CampspotRvOverviewSlice>;
  /** Scan-level rows excluded because unit type could not be classified. */
  scanTransparency?: RvOverviewScanTransparency;
  /** Pre-folded Campspot-only variant for analyst source toggle (omitted on older snapshots). */
  campspotOnly?: RvOverviewCampspotOnlyPayload;
  /** Per-source scan caps (omitted on snapshots before v19+). */
  scanMeta?: RvOverviewScanMeta;
  /** Distinct properties and unit/site rows in the last snapshot scan (omitted on older snapshots). */
  snapshotInventory?: RvOverviewSnapshotInventory;
};

export type { RvOverviewSnapshotInventory } from '@/lib/rv-industry-overview/rv-overview-snapshot-inventory';

export type { RvOverviewScanMeta, RvOverviewSourceScanMeta } from '@/lib/rv-industry-overview/rv-overview-scan-meta';

type RvOverviewFoldBundle = {
  rvMap: ReturnType<typeof createRvMapFoldState>;
  trends: ReturnType<typeof createTrendsFoldState>;
  sizeTier: ReturnType<typeof createSizeTierFoldState>;
  season: ReturnType<typeof createSeasonRatesFoldState>;
  surface: ReturnType<typeof createSurfaceRatesFoldState>;
  amenityProps: ReturnType<typeof createAmenityPropertiesFoldState>;
  amenityAdr: ReturnType<typeof createAmenityAdrFoldState>;
  rvParking: ReturnType<typeof createRvParkingFoldState>;
  transparency: ChartTransparencyAccum;
};

function createRvOverviewFoldBundle(): RvOverviewFoldBundle {
  return {
    rvMap: createRvMapFoldState(),
    trends: createTrendsFoldState(),
    sizeTier: createSizeTierFoldState(),
    season: createSeasonRatesFoldState(),
    surface: createSurfaceRatesFoldState(),
    amenityProps: createAmenityPropertiesFoldState(),
    amenityAdr: createAmenityAdrFoldState(),
    rvParking: createRvParkingFoldState(),
    transparency: createChartTransparencyAccum(),
  };
}

function foldWideRowIntoBundle(
  b: RvOverviewFoldBundle,
  row: RvOverviewWideRow,
  unitFilter: RvOverviewUnitFilterKey,
  source: RvOverviewDataSource
): void {
  recordUnitSliceChartTransparency(b.transparency, row, source, unitFilter);
  const regionalBands =
    unitFilter === 'glamping'
      ? RV_MAP_REGIONAL_RATE_BANDS_GLAMPING
      : RV_MAP_REGIONAL_RATE_BANDS_DEFAULT;
  foldRvMapRows(
    b.rvMap.regional,
    b.rvMap.stateBuckets,
    b.rvMap.stateAdrChoropleth,
    [row],
    regionalBands,
    b.rvMap.regionalLabelMode
  );
  foldTrendsRows(b.trends, [row]);
  foldSizeTierRows(b.sizeTier, [row]);
  foldSeasonRateRows(b.season, [row]);
  foldSurfaceRows(b.surface, [row]);
  foldAmenityPropertyRows(b.amenityProps, [row]);
  foldAmenityAdrRows(b.amenityAdr, [row]);
  foldRvParkingRows(b.rvParking.distCounts, b.rvParking.rateBuckets, [row]);
}

function finalizeRvOverviewFoldBundle(
  b: RvOverviewFoldBundle,
  rowsScanned: number,
  fetchError: string | null
): CampspotRvOverviewSlice {
  const rvFinal = finalizeRvParkingFoldState(b.rvParking);
  return {
    mapResult: finalizeRvMapFoldState(b.rvMap, rowsScanned, fetchError),
    trendsResult: { rows: finalizeTrendsFoldState(b.trends), rowsScanned, error: fetchError },
    sizeResult: { rows: finalizeSizeTierFoldState(b.sizeTier), rowsScanned, error: fetchError },
    seasonRatesResult: { rows: finalizeSeasonRatesFoldState(b.season), rowsScanned, error: fetchError },
    surfaceRatesResult: { rows: finalizeSurfaceRatesFoldState(b.surface), rowsScanned, error: fetchError },
    amenityPropsResult: {
      rows: finalizeAmenityPropertiesFoldState(b.amenityProps),
      rowsScanned,
      error: fetchError,
    },
    amenityAdrResult: { rows: finalizeAmenityAdrFoldState(b.amenityAdr), rowsScanned, error: fetchError },
    rvParkingChartsResult: {
      distribution: rvFinal.distribution,
      rateBars: rvFinal.rateBars,
      totalRvRows: rvFinal.totalRvRows,
      rowsScanned,
      error: fetchError,
    },
    chartSourceTransparency: finalizeChartTransparencyAccum(b.transparency),
  };
}

function bundleErrorSlice(rowsScanned: number, message: string): CampspotRvOverviewSlice {
  const emptyRv = aggregateCampspotRowsToRvParkingCharts([]);
  return {
    mapResult: { ...aggregateCampspotRowsToRvMapData([]), rowsScanned, error: message },
    trendsResult: {
      rows: aggregateCampspotRowsToTrendsChart([]),
      rowsScanned,
      error: message,
    },
    sizeResult: {
      rows: aggregateCampspotRowsToSizeTierChart([]),
      rowsScanned,
      error: message,
    },
    seasonRatesResult: {
      rows: aggregateCampspotRowsToSeasonRates([]),
      rowsScanned,
      error: message,
    },
    surfaceRatesResult: {
      rows: aggregateCampspotRowsToSurfaceRates([]),
      rowsScanned,
      error: message,
    },
    amenityPropsResult: {
      rows: aggregateCampspotRowsToAmenityPropertyPcts([]),
      rowsScanned,
      error: message,
    },
    amenityAdrResult: {
      rows: aggregateCampspotRowsToAmenityAdrChart([]),
      rowsScanned,
      error: message,
    },
    rvParkingChartsResult: {
      ...emptyRv,
      rowsScanned,
      error: message,
    },
  };
}

function emptyUnitTypeComparisonResult(
  rowsScanned: number,
  error: string | null
): CampspotUnitTypeChartsResult {
  return {
    rateRows: aggregateCampspotRowsToUnitTypeByRate([]),
    distributionRows: aggregateCampspotRowsToUnitTypeDistribution([]),
    rowsScanned,
    error,
  };
}

function bundleError(
  rowsScanned: number,
  message: string,
  campspotScanned = 0,
  roverpassScanned = 0,
  scanMeta: RvOverviewScanMeta = emptyRvOverviewScanMeta()
): CampspotRvOverviewPageData {
  const slice = bundleErrorSlice(rowsScanned, message);
  return {
    rowsScannedTotal: rowsScanned,
    rowsScannedCampspot: campspotScanned,
    rowsScannedRoverpass: roverpassScanned,
    scanMeta,
    unitTypeComparisonResult: emptyUnitTypeComparisonResult(rowsScanned, message),
    byUnitFilter: {
      rv: slice,
      tent: slice,
      glamping: slice,
    },
  };
}

function isValidRvOverviewSlice(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const map = o.mapResult as Record<string, unknown> | undefined;
  const trends = o.trendsResult as Record<string, unknown> | undefined;
  return (
    map != null &&
    trends != null &&
    typeof map.rowsScanned === 'number' &&
    typeof trends.rowsScanned === 'number'
  );
}

function isValidUnitTypeChartsPayload(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.rateRows) &&
    Array.isArray(o.distributionRows) &&
    typeof o.rowsScanned === 'number' &&
    (o.error === null || typeof o.error === 'string')
  );
}

function normalizeRvOverviewPayloadFromCache(
  payload: CampspotRvOverviewPageData
): CampspotRvOverviewPageData {
  const total = payload.rowsScannedTotal;
  const campspot =
    typeof payload.rowsScannedCampspot === 'number' ? payload.rowsScannedCampspot : total;
  const roverpass =
    typeof payload.rowsScannedRoverpass === 'number' ? payload.rowsScannedRoverpass : 0;
  if (payload.rowsScannedCampspot === campspot && payload.rowsScannedRoverpass === roverpass) {
    return payload;
  }
  return { ...payload, rowsScannedCampspot: campspot, rowsScannedRoverpass: roverpass };
}

function isValidRvOverviewPayload(v: unknown): v is CampspotRvOverviewPageData {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.rowsScannedTotal !== 'number') return false;
  if (!isValidUnitTypeChartsPayload(o.unitTypeComparisonResult)) return false;
  const bf = o.byUnitFilter;
  if (!bf || typeof bf !== 'object') return false;
  const rec = bf as Record<string, unknown>;
  for (const k of UNIT_TYPE_CHART_BUCKET_KEYS) {
    if (!isValidRvOverviewSlice(rec[k])) return false;
  }
  return true;
}

const RV_OVERVIEW_CACHE_ROW_SELECT = 'payload, computed_at, rows_scanned';

async function readRvOverviewCacheRow(
  supabase: SupabaseClient
): Promise<IndustryOverviewCacheRow | null> {
  const { data, error } = await supabase
    .from(CAMPSPOT_RV_OVERVIEW_CACHE_TABLE)
    .select(RV_OVERVIEW_CACHE_ROW_SELECT)
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    payload: data.payload ?? null,
    computed_at: data.computed_at ?? null,
    rows_scanned: typeof data.rows_scanned === 'number' ? data.rows_scanned : null,
  };
}

function rvOverviewSnapshotMetaFromCacheRow(
  row: IndustryOverviewCacheRow | null
): RvOverviewSnapshotMeta {
  return industryOverviewSnapshotMetaFromRow(row);
}

function parseRvOverviewPayloadFromCacheRow(
  row: IndustryOverviewCacheRow | null
): CampspotRvOverviewPageData | null {
  if (!row?.payload) return null;
  if (!isValidRvOverviewPayload(row.payload)) return null;
  const normalized = normalizeRvOverviewPayloadFromCache(row.payload);
  return sanitizeRvOverviewPageDataPayload(normalized);
}

/** Fresh Postgres read for admin cache health UI (bypasses `unstable_cache`). */
export const getRvOverviewSnapshotMeta = reactCache(
  async (): Promise<RvOverviewSnapshotMeta> => {
    const supabase = createServerClient();
    const row = await readRvOverviewCacheRow(supabase);
    return rvOverviewSnapshotMetaFromCacheRow(row);
  }
);

async function readRvOverviewPayloadFromPg(
  supabase: SupabaseClient
): Promise<CampspotRvOverviewPageData | null> {
  const row = await readRvOverviewCacheRow(supabase);
  return parseRvOverviewPayloadFromCacheRow(row);
}

export type RvIndustryOverviewPageLoad = {
  pageData: CampspotRvOverviewPageData;
  snapshotMeta: RvOverviewSnapshotMeta;
};

async function writeRvOverviewPayloadToPg(
  supabase: SupabaseClient,
  payload: CampspotRvOverviewPageData
): Promise<void> {
  const rowsScanned = payload.rowsScannedTotal;
  const { error } = await supabase.from(CAMPSPOT_RV_OVERVIEW_CACHE_TABLE).upsert(
    {
      id: 1,
      payload,
      rows_scanned: rowsScanned,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('[campspot-rv-overview] Failed to persist Postgres cache:', error.message);
  }
}

type UnitTypeComparisonFoldState = ReturnType<typeof createUnitTypeFoldState> & {
  transparency: ChartTransparencyAccum;
};

function createUnitTypeComparisonFoldState(): UnitTypeComparisonFoldState {
  return {
    ...createUnitTypeFoldState(),
    transparency: createChartTransparencyAccum(),
  };
}

function foldOverviewWideRows(
  rows: RvOverviewWideRow[],
  byFilter: Record<RvOverviewUnitFilterKey, RvOverviewFoldBundle>,
  unitTypeComparisonFold: UnitTypeComparisonFoldState,
  unclassifiedAccum: UnclassifiedAccum,
  source: RvOverviewDataSource
): void {
  for (const row of rows) {
    const fk = classifyCampspotUnitChartBucket(row);
    if (!fk) {
      recordUnclassifiedRow(unclassifiedAccum, source);
      continue;
    }
    foldWideRowIntoBundle(byFilter[fk], row, fk, source);
    recordUnitTypeComparisonChartTransparency(
      unitTypeComparisonFold.transparency,
      row,
      source
    );
    foldUnitTypeRows(
      unitTypeComparisonFold.adrBuckets,
      unitTypeComparisonFold.byProp,
      [row]
    );
  }
}

type SourceScanResult = {
  rowsScanned: number;
  error: string | null;
  hitRowCap: boolean;
  maxRows: number;
};

async function scanOverviewSourceTable(
  supabase: SupabaseClient,
  config:
    | {
        table: 'campspot';
        select: string;
        maxRows: number;
        mapRow: (row: Record<string, unknown>) => RvOverviewWideRow;
      }
    | {
        table: 'all_roverpass_data_new';
        select: string;
        maxRows: number;
        mapRow: (row: Record<string, unknown>) => RvOverviewWideRow;
      },
  onRows: (rows: RvOverviewWideRow[]) => void
): Promise<SourceScanResult> {
  let rowsScanned = 0;
  let fetchError: string | null = null;
  let hitRowCap = false;
  const pageSize = CAMPSPOT_RV_OVERVIEW_PAGE_SIZE;
  const parallel = CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES;
  const maxRows = config.maxRows;

  const fetchRange = (start: number, end: number) => {
    let q = supabase.from(config.table).select(config.select).order('id', { ascending: true });
    if (config.table === 'all_roverpass_data_new') {
      q = q.neq('is_closed', 'Yes');
    }
    return q.range(start, end);
  };

  while (rowsScanned < config.maxRows) {
    const batchStarts: number[] = [];
    for (let p = 0; p < parallel; p++) {
      const start = rowsScanned + p * pageSize;
      if (start >= config.maxRows) break;
      batchStarts.push(start);
    }
    if (batchStarts.length === 0) break;

    const results = await Promise.all(
      batchStarts.map((s) => fetchRange(s, s + pageSize - 1))
    );

    let batchDone = false;
    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i];
      if (error) {
        fetchError = rvOverviewSupabaseDisplayError(error);
        batchDone = true;
        break;
      }
      if (!data?.length) {
        batchDone = true;
        break;
      }

      const wide = (data as Record<string, unknown>[]).map(config.mapRow);
      onRows(wide);

      rowsScanned += data.length;
      if (data.length < pageSize) {
        batchDone = true;
        break;
      }
      if (rowsScanned >= maxRows) {
        hitRowCap = true;
        batchDone = true;
        break;
      }
    }

    if (fetchError || batchDone) break;
  }

  return { rowsScanned, error: fetchError, hitRowCap, maxRows };
}

/**
 * Full table scans + fold in Node (regex-heavy unit-type rules stay here).
 * Pass parallel pages and page size via env (see `campspot-fetch-cap`).
 */
export async function fetchCampspotRvOverviewPageDataUncached(
  supabase: SupabaseClient
): Promise<CampspotRvOverviewPageData> {
  const byFilter: Record<RvOverviewUnitFilterKey, RvOverviewFoldBundle> = {
    rv: createRvOverviewFoldBundle(),
    tent: createRvOverviewFoldBundle(),
    glamping: createRvOverviewFoldBundle(),
  };
  const byFilterCampspotOnly: Record<RvOverviewUnitFilterKey, RvOverviewFoldBundle> = {
    rv: createRvOverviewFoldBundle(),
    tent: createRvOverviewFoldBundle(),
    glamping: createRvOverviewFoldBundle(),
  };
  const unitTypeComparisonFold = createUnitTypeComparisonFoldState();
  const unitTypeComparisonFoldCampspotOnly = createUnitTypeComparisonFoldState();
  const unclassifiedAccum = createUnclassifiedAccum();
  const unclassifiedCampspotOnly = createUnclassifiedAccum();
  const inventoryAccum = createRvOverviewSnapshotInventoryAccum();

  const campspotScan = await scanOverviewSourceTable(
    supabase,
    {
      table: 'campspot',
      select: CAMPSPOT_RV_OVERVIEW_PAGE_SELECT,
      maxRows: CAMPSPOT_RV_OVERVIEW_MAX_ROWS,
      mapRow: (row) => row as RvOverviewWideRow,
    },
    (rows) => {
      for (const row of rows) {
        recordRvOverviewSnapshotInventoryRow(inventoryAccum, row, 'campspot');
      }
      foldOverviewWideRows(rows, byFilter, unitTypeComparisonFold, unclassifiedAccum, 'campspot');
      foldOverviewWideRows(
        rows,
        byFilterCampspotOnly,
        unitTypeComparisonFoldCampspotOnly,
        unclassifiedCampspotOnly,
        'campspot'
      );
    }
  );

  if (campspotScan.error) {
    return bundleError(
      campspotScan.rowsScanned,
      campspotScan.error,
      campspotScan.rowsScanned,
      0,
      {
        campspot: buildSourceScanMeta(
          campspotScan.rowsScanned,
          campspotScan.maxRows,
          campspotScan.hitRowCap
        ),
        roverpass: buildSourceScanMeta(0, ROVERPASS_RV_OVERVIEW_MAX_ROWS, false),
      }
    );
  }

  const roverpassScan = await scanOverviewSourceTable(
    supabase,
    {
      table: 'all_roverpass_data_new',
      select: ROVERPASS_RV_OVERVIEW_PAGE_SELECT,
      maxRows: ROVERPASS_RV_OVERVIEW_MAX_ROWS,
      mapRow: normalizeRoverpassRowToOverviewWide,
    },
    (rows) => {
      for (const row of rows) {
        recordRvOverviewSnapshotInventoryRow(inventoryAccum, row, 'roverpass');
      }
      foldOverviewWideRows(rows, byFilter, unitTypeComparisonFold, unclassifiedAccum, 'roverpass');
    }
  );

  const rowsScannedTotal = campspotScan.rowsScanned + roverpassScan.rowsScanned;

  if (roverpassScan.error) {
    return bundleError(
      rowsScannedTotal,
      roverpassScan.error,
      campspotScan.rowsScanned,
      roverpassScan.rowsScanned,
      {
        campspot: buildSourceScanMeta(
          campspotScan.rowsScanned,
          campspotScan.maxRows,
          campspotScan.hitRowCap
        ),
        roverpass: buildSourceScanMeta(
          roverpassScan.rowsScanned,
          roverpassScan.maxRows,
          roverpassScan.hitRowCap
        ),
      }
    );
  }

  const unitTypeCompFinal = finalizeUnitTypeFoldState(unitTypeComparisonFold);
  const unitTypeTransp = finalizeChartTransparencyAccum(unitTypeComparisonFold.transparency);
  const unitTypeCompCs = finalizeUnitTypeFoldState(unitTypeComparisonFoldCampspotOnly);
  const unitTypeTranspCs = finalizeChartTransparencyAccum(
    unitTypeComparisonFoldCampspotOnly.transparency
  );
  const campspotRowsScanned = campspotScan.rowsScanned;

  const scanMeta: RvOverviewScanMeta = {
    campspot: buildSourceScanMeta(
      campspotScan.rowsScanned,
      campspotScan.maxRows,
      campspotScan.hitRowCap
    ),
    roverpass: buildSourceScanMeta(
      roverpassScan.rowsScanned,
      roverpassScan.maxRows,
      roverpassScan.hitRowCap
    ),
  };

  return {
    rowsScannedTotal,
    rowsScannedCampspot: campspotScan.rowsScanned,
    rowsScannedRoverpass: roverpassScan.rowsScanned,
    scanMeta,
    snapshotInventory: finalizeRvOverviewSnapshotInventory(inventoryAccum),
    scanTransparency: finalizeUnclassifiedAccum(unclassifiedAccum),
    unitTypeComparisonResult: {
      rateRows: unitTypeCompFinal.rateRows,
      distributionRows: unitTypeCompFinal.distributionRows,
      rowsScanned: rowsScannedTotal,
      error: null,
      chartSourceTransparency: {
        unitTypeRate: unitTypeTransp.unitTypeRate,
        unitTypeDistribution: unitTypeTransp.unitTypeDistribution,
      },
    },
    byUnitFilter: {
      rv: finalizeRvOverviewFoldBundle(byFilter.rv, rowsScannedTotal, null),
      tent: finalizeRvOverviewFoldBundle(byFilter.tent, rowsScannedTotal, null),
      glamping: finalizeRvOverviewFoldBundle(byFilter.glamping, rowsScannedTotal, null),
    },
    campspotOnly: {
      rowsScannedTotal: campspotRowsScanned,
      scanTransparency: finalizeUnclassifiedAccum(unclassifiedCampspotOnly),
      unitTypeComparisonResult: {
        rateRows: unitTypeCompCs.rateRows,
        distributionRows: unitTypeCompCs.distributionRows,
        rowsScanned: campspotRowsScanned,
        error: null,
        chartSourceTransparency: {
          unitTypeRate: unitTypeTranspCs.unitTypeRate,
          unitTypeDistribution: unitTypeTranspCs.unitTypeDistribution,
        },
      },
      byUnitFilter: {
        rv: finalizeRvOverviewFoldBundle(byFilterCampspotOnly.rv, campspotRowsScanned, null),
        tent: finalizeRvOverviewFoldBundle(byFilterCampspotOnly.tent, campspotRowsScanned, null),
        glamping: finalizeRvOverviewFoldBundle(
          byFilterCampspotOnly.glamping,
          campspotRowsScanned,
          null
        ),
      },
    },
  };
}

/**
 * Postgres snapshot of the TS-built payload (one row). Avoids streaming `campspot` on every cold Next miss.
 * Aggregation rules remain in TypeScript; the table stores the materialized JSON only.
 */
async function resolveRvIndustryOverviewPageLoad(): Promise<RvIndustryOverviewPageLoad> {
  const supabase = createServerClient();
  const row = await readRvOverviewCacheRow(supabase);
  const snapshotMeta = rvOverviewSnapshotMetaFromCacheRow(row);
  const fromPg = parseRvOverviewPayloadFromCacheRow(row);
  if (fromPg) {
    return { pageData: fromPg, snapshotMeta };
  }

  if (!rvOverviewLiveScanAllowed()) {
    throw new RvOverviewSnapshotMissingError(
      'RV Industry Overview snapshot is missing or invalid in campspot_rv_overview_cache. ' +
        'Run POST /api/admin/rv-industry-overview/refresh-cache, npm run refresh:rv-overview, or refresh:downstream.'
    );
  }

  const computed = await fetchCampspotRvOverviewPageDataUncached(supabase);
  if (!computed.byUnitFilter.rv.mapResult.error) {
    await writeRvOverviewPayloadToPg(supabase, computed);
  }
  return {
    pageData: computed,
    snapshotMeta: {
      present: true,
      computedAt: new Date().toISOString(),
      rowsScanned: computed.rowsScannedTotal,
    },
  };
}

const RV_OVERVIEW_CACHE_KEY =
  'campspot-rv-industry-overview-page-v22-roverpass-regional-occ-2025';

/** ~90 days — source data is updated on a quarterly cadence; avoids repeated full-table scans. */
export const RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS = 90 * 24 * 60 * 60;

/** Tag for `revalidateTag('rv-industry-overview')` when Campspot data is refreshed early. */
export const RV_INDUSTRY_OVERVIEW_CACHE_TAG = 'rv-industry-overview';

const getCachedRvIndustryOverviewPageLoad = unstable_cache(
  resolveRvIndustryOverviewPageLoad,
  [RV_OVERVIEW_CACHE_KEY],
  {
    revalidate: RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
    tags: [RV_INDUSTRY_OVERVIEW_CACHE_TAG],
  }
);

/** One Postgres read + Next cache for admin page render (payload and cache-bar meta). */
export const getRvIndustryOverviewPageLoad = reactCache(
  async (): Promise<RvIndustryOverviewPageLoad> => getCachedRvIndustryOverviewPageLoad()
);

export async function getCampspotRvOverviewPageData(): Promise<CampspotRvOverviewPageData> {
  return (await getRvIndustryOverviewPageLoad()).pageData;
}

/**
 * Recompute from `campspot` + `all_roverpass_data_new`, upsert Postgres snapshot, for ETL or admin refresh.
 * Caller should invoke `revalidateTag(RV_INDUSTRY_OVERVIEW_CACHE_TAG)` when appropriate.
 */
export async function recomputeCampspotRvOverviewPageData(): Promise<CampspotRvOverviewPageData> {
  const supabase = createServerClient();
  const computed = await fetchCampspotRvOverviewPageDataUncached(supabase);
  await writeRvOverviewPayloadToPg(supabase, computed);
  return computed;
}
