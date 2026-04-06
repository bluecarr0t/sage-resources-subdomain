/**
 * Single paginated scan over `campspot` for all RV Industry Overview charts, plus Next.js data cache.
 * Replaces nine independent full-table scans (which could exceed server timeouts).
 */

import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';
import {
  CAMPSPOT_RV_OVERVIEW_MAX_ROWS,
  CAMPSPOT_RV_OVERVIEW_PAGE_SIZE,
  CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES,
} from '@/lib/rv-industry-overview/campspot-fetch-cap';
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

const CAMPSPOT_RV_OVERVIEW_CACHE_TABLE = 'campspot_rv_overview_cache';

/** Superset of columns needed by every RV overview aggregate (one row shape per page). */
export const CAMPSPOT_RV_OVERVIEW_PAGE_SELECT =
  'state, city, property_name, unit_type, description, quantity_of_units, property_total_sites, ' +
  'avg_retail_daily_rate_2025, avg_retail_daily_rate_2024, occupancy_rate_2025, occupancy_rate_2024, ' +
  'winter_weekday, winter_weekend, spring_weekday, spring_weekend, summer_weekday, summer_weekend, ' +
  'fall_weekday, fall_weekend, rv_surface_type, rv_parking, ' +
  'hot_tub_sauna, pool, electrical_hook_up, sewer_hook_up, water_hookup';

type CampspotRvOverviewWideRow = CampspotRvMapAggRow &
  CampspotTrendsAggRow &
  CampspotSizeTierAggRow &
  CampspotUnitTypeAggRow &
  CampspotSeasonRatesAggRow &
  CampspotSurfaceRatesAggRow &
  CampspotAmenityPropertiesAggRow &
  CampspotAmenityAdrAggRow &
  CampspotRvParkingAggRow;

/** Same buckets as unit-type charts; UI labels Tent / RV / Lodging (lodging = glamping classifier). */
export type RvOverviewUnitFilterKey = UnitTypeChartBucketKey;

export const RV_OVERVIEW_UNIT_FILTER_KEYS: readonly RvOverviewUnitFilterKey[] = UNIT_TYPE_CHART_BUCKET_KEYS;

export type CampspotRvOverviewSlice = {
  mapResult: CampspotRvMapDataResult;
  trendsResult: CampspotTrendsChartResult;
  sizeResult: CampspotSizeTierChartResult;
  unitTypeResult: CampspotUnitTypeChartsResult;
  seasonRatesResult: CampspotSeasonRatesChartResult;
  surfaceRatesResult: CampspotSurfaceRatesChartResult;
  amenityPropsResult: CampspotAmenityPropertiesChartResult;
  amenityAdrResult: CampspotAmenityAdrChartResult;
  rvParkingChartsResult: CampspotRvParkingChartsResult;
};

export type CampspotRvOverviewPageData = {
  /** Total Campspot rows read in the scan (same for every unit-type slice). */
  rowsScannedTotal: number;
  /**
   * Unit-type bar charts (avg. rate + mix) across all three buckets in one pass.
   * Not scoped to the RV / Tent / Lodging toggle; each per-filter slice still carries its own `unitTypeResult` for internal use.
   */
  unitTypeComparisonResult: CampspotUnitTypeChartsResult;
  byUnitFilter: Record<RvOverviewUnitFilterKey, CampspotRvOverviewSlice>;
};

type RvOverviewFoldBundle = {
  rvMap: ReturnType<typeof createRvMapFoldState>;
  trends: ReturnType<typeof createTrendsFoldState>;
  sizeTier: ReturnType<typeof createSizeTierFoldState>;
  unitType: ReturnType<typeof createUnitTypeFoldState>;
  season: ReturnType<typeof createSeasonRatesFoldState>;
  surface: ReturnType<typeof createSurfaceRatesFoldState>;
  amenityProps: ReturnType<typeof createAmenityPropertiesFoldState>;
  amenityAdr: ReturnType<typeof createAmenityAdrFoldState>;
  rvParking: ReturnType<typeof createRvParkingFoldState>;
};

function createRvOverviewFoldBundle(): RvOverviewFoldBundle {
  return {
    rvMap: createRvMapFoldState(),
    trends: createTrendsFoldState(),
    sizeTier: createSizeTierFoldState(),
    unitType: createUnitTypeFoldState(),
    season: createSeasonRatesFoldState(),
    surface: createSurfaceRatesFoldState(),
    amenityProps: createAmenityPropertiesFoldState(),
    amenityAdr: createAmenityAdrFoldState(),
    rvParking: createRvParkingFoldState(),
  };
}

function foldWideRowIntoBundle(
  b: RvOverviewFoldBundle,
  row: CampspotRvOverviewWideRow,
  unitFilter: RvOverviewUnitFilterKey
): void {
  const regionalBands =
    unitFilter === 'glamping'
      ? RV_MAP_REGIONAL_RATE_BANDS_GLAMPING
      : RV_MAP_REGIONAL_RATE_BANDS_DEFAULT;
  foldRvMapRows(b.rvMap.regional, b.rvMap.stateBuckets, b.rvMap.stateAdrChoropleth, [row], regionalBands);
  foldTrendsRows(b.trends, [row]);
  foldSizeTierRows(b.sizeTier, [row]);
  foldUnitTypeRows(b.unitType.adrBuckets, b.unitType.byProp, [row]);
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
  const unitFinal = finalizeUnitTypeFoldState(b.unitType);
  const rvFinal = finalizeRvParkingFoldState(b.rvParking);
  return {
    mapResult: finalizeRvMapFoldState(b.rvMap, rowsScanned, fetchError),
    trendsResult: { rows: finalizeTrendsFoldState(b.trends), rowsScanned, error: fetchError },
    sizeResult: { rows: finalizeSizeTierFoldState(b.sizeTier), rowsScanned, error: fetchError },
    unitTypeResult: {
      rateRows: unitFinal.rateRows,
      distributionRows: unitFinal.distributionRows,
      rowsScanned,
      error: fetchError,
    },
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
    unitTypeResult: {
      rateRows: aggregateCampspotRowsToUnitTypeByRate([]),
      distributionRows: aggregateCampspotRowsToUnitTypeDistribution([]),
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

function bundleError(rowsScanned: number, message: string): CampspotRvOverviewPageData {
  const slice = bundleErrorSlice(rowsScanned, message);
  return {
    rowsScannedTotal: rowsScanned,
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

async function readRvOverviewPayloadFromPg(
  supabase: SupabaseClient
): Promise<CampspotRvOverviewPageData | null> {
  const { data, error } = await supabase
    .from(CAMPSPOT_RV_OVERVIEW_CACHE_TABLE)
    .select('payload')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.payload) return null;
  if (!isValidRvOverviewPayload(data.payload)) return null;
  return data.payload;
}

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

/**
 * Full table scan + fold in Node (regex-heavy unit-type rules stay here).
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
  const unitTypeComparisonFold = createUnitTypeFoldState();

  let rowsScanned = 0;
  let fetchError: string | null = null;

  const pageSize = CAMPSPOT_RV_OVERVIEW_PAGE_SIZE;
  const parallel = CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES;

  const fetchRange = (start: number, end: number) =>
    supabase
      .from('campspot')
      .select(CAMPSPOT_RV_OVERVIEW_PAGE_SELECT)
      .order('id', { ascending: true })
      .range(start, end);

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const batchStarts: number[] = [];
    for (let p = 0; p < parallel; p++) {
      const start = rowsScanned + p * pageSize;
      if (start >= CAMPSPOT_RV_OVERVIEW_MAX_ROWS) break;
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
        fetchError = error.message;
        batchDone = true;
        break;
      }
      if (!data?.length) {
        batchDone = true;
        break;
      }

      const rows = data as unknown as CampspotRvOverviewWideRow[];

      for (const row of rows) {
        const fk = classifyCampspotUnitChartBucket(row);
        if (!fk) continue;
        foldWideRowIntoBundle(byFilter[fk], row, fk);
        foldUnitTypeRows(
          unitTypeComparisonFold.adrBuckets,
          unitTypeComparisonFold.byProp,
          [row]
        );
      }

      rowsScanned += data.length;
      if (data.length < pageSize || rowsScanned >= CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
        batchDone = true;
        break;
      }
    }

    if (fetchError || batchDone) break;
  }

  if (fetchError) {
    return bundleError(rowsScanned, fetchError);
  }

  const unitTypeCompFinal = finalizeUnitTypeFoldState(unitTypeComparisonFold);
  return {
    rowsScannedTotal: rowsScanned,
    unitTypeComparisonResult: {
      rateRows: unitTypeCompFinal.rateRows,
      distributionRows: unitTypeCompFinal.distributionRows,
      rowsScanned,
      error: null,
    },
    byUnitFilter: {
      rv: finalizeRvOverviewFoldBundle(byFilter.rv, rowsScanned, null),
      tent: finalizeRvOverviewFoldBundle(byFilter.tent, rowsScanned, null),
      glamping: finalizeRvOverviewFoldBundle(byFilter.glamping, rowsScanned, null),
    },
  };
}

/**
 * Postgres snapshot of the TS-built payload (one row). Avoids streaming `campspot` on every cold Next miss.
 * Aggregation rules remain in TypeScript; the table stores the materialized JSON only.
 */
async function loadCampspotRvOverviewPageData(): Promise<CampspotRvOverviewPageData> {
  const supabase = createServerClient();
  const fromPg = await readRvOverviewPayloadFromPg(supabase);
  if (fromPg) return fromPg;

  const computed = await fetchCampspotRvOverviewPageDataUncached(supabase);
  if (!computed.byUnitFilter.rv.mapResult.error) {
    await writeRvOverviewPayloadToPg(supabase, computed);
  }
  return computed;
}

const RV_OVERVIEW_CACHE_KEY =
  'campspot-rv-industry-overview-page-v15-adr-2025-annual-column-only-pg-snapshot';

/** ~90 days — source data is updated on a quarterly cadence; avoids repeated full-table scans. */
export const RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS = 90 * 24 * 60 * 60;

/** Tag for `revalidateTag('rv-industry-overview')` when Campspot data is refreshed early. */
export const RV_INDUSTRY_OVERVIEW_CACHE_TAG = 'rv-industry-overview';

const getCachedCampspotRvOverviewPageData = unstable_cache(loadCampspotRvOverviewPageData, [RV_OVERVIEW_CACHE_KEY], {
  revalidate: RV_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
  tags: [RV_INDUSTRY_OVERVIEW_CACHE_TAG],
});

export async function getCampspotRvOverviewPageData(): Promise<CampspotRvOverviewPageData> {
  return getCachedCampspotRvOverviewPageData();
}

/**
 * Recompute from `campspot`, upsert Postgres snapshot, for ETL or admin refresh.
 * Caller should invoke `revalidateTag(RV_INDUSTRY_OVERVIEW_CACHE_TAG)` when appropriate.
 */
export async function recomputeCampspotRvOverviewPageData(): Promise<CampspotRvOverviewPageData> {
  const supabase = createServerClient();
  const computed = await fetchCampspotRvOverviewPageDataUncached(supabase);
  await writeRvOverviewPayloadToPg(supabase, computed);
  return computed;
}
