/**
 * Paginated scans over `hipcamp` and `all_glamping_properties` for Glamping Industry Overview.
 * Reuses RV overview chart fold logic with Hipcamp + Sage row normalization.
 */

import { unstable_cache } from 'next/cache';
import { cache as reactCache } from 'react';
import {
  industryOverviewSnapshotMetaFromRow,
  type IndustryOverviewCacheRow,
} from '@/lib/industry-overview/industry-overview-cache-row';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { applyGlampingOverviewUsScope, isGlampingOverviewUsCountryValue } from '@/lib/glamping-industry-overview/glamping-overview-us-scope';
import {
  HIPCAMP_GLAMPING_OVERVIEW_MAX_ROWS,
  GLAMPING_OVERVIEW_PAGE_SIZE,
  GLAMPING_OVERVIEW_PARALLEL_PAGES,
  SAGE_GLAMPING_OVERVIEW_MAX_ROWS,
} from '@/lib/glamping-industry-overview/glamping-fetch-cap';
import { GlampingOverviewSnapshotMissingError } from '@/lib/glamping-industry-overview/glamping-overview-errors';
import {
  HIPCAMP_GLAMPING_OVERVIEW_SELECT,
  normalizeHipcampRowToGlampingOverviewWide,
  normalizeSageRowToGlampingOverviewWide,
  SAGE_GLAMPING_OVERVIEW_SELECT,
} from '@/lib/glamping-industry-overview/glamping-overview-wide-row';
import { wideRowForGlampingStateAdrChoropleth } from '@/lib/glamping-industry-overview/sage-retail-rate-by-year';
import { createServerClient } from '@/lib/supabase';
import { isHipcampRvDominantPropertyType } from '@/lib/market-report/load-cohort';
import {
  aggregateCampspotRowsToRvMapData,
  createRvMapFoldState,
  finalizeRvMapFoldState,
  foldRvMapRows,
  rowQualifiesForStateAdrChoropleth,
  RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
  type CampspotRvMapDataResult,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  createTrendsFoldState,
  finalizeTrendsFoldState,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotTrendsChartResult } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import {
  aggregateGlampingRowsToTrendsChart,
  foldGlampingTrendsRows,
  rowContributesToGlampingTrends,
} from '@/lib/glamping-industry-overview/glamping-trends-chart-data';
import {
  createGlampingSizeTierFoldState,
  finalizeGlampingSizeTierFoldState,
  foldGlampingSizeTierRows,
  rowContributesToGlampingResortSize,
} from '@/lib/glamping-industry-overview/glamping-size-tier-chart-data';
import type { CampspotSizeTierChartResult } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import {
  classifyCampspotUnitChartBucket,
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
  createGlampingAmenityPropertiesFoldState,
  finalizeGlampingAmenityPropertiesFoldState,
  foldGlampingAmenityPropertyRows,
  type GlampingAmenityPropertiesChartResult,
} from '@/lib/glamping-industry-overview/glamping-amenity-properties-chart-data';
import {
  aggregateGlampingRowsToAmenityAdrChart,
  createGlampingAmenityAdrFoldState,
  finalizeGlampingAmenityAdrFoldState,
  foldGlampingAmenityAdrRows,
  rowContributesToGlampingAmenityAdr,
  type GlampingAmenityAdrChartResult,
} from '@/lib/glamping-industry-overview/glamping-amenity-adr-chart-data';
import type { CampspotRvParkingAggRow } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import {
  aggregateCampspotRowsToRvParkingCharts,
  createRvParkingFoldState,
  finalizeRvParkingFoldState,
  foldRvParkingRows,
} from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import type { CampspotRvParkingChartsResult } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import {
  createChartTransparencyAccum,
  createUnclassifiedAccum,
  finalizeGlampingChartTransparencyAccum,
} from '@/lib/glamping-industry-overview/glamping-chart-transparency';
import {
  finalizeUnclassifiedAccum,
  recordUnitSliceChartTransparency,
  rowContributesToRegionalMap,
  recordUnclassifiedRow,
  type RvOverviewChartTransparencyMap,
  type RvOverviewDataSource,
  type RvOverviewScanTransparency,
  type ChartTransparencyAccum,
  type UnclassifiedAccum,
} from '@/lib/rv-industry-overview/rv-overview-chart-transparency';
import { rvOverviewSupabaseDisplayError } from '@/lib/rv-industry-overview/rv-overview-display-error';
import { sanitizeGlampingOverviewPageDataPayload } from '@/lib/glamping-industry-overview/sanitize-glamping-overview-payload';
import {
  buildSourceScanMeta,
  emptyRvOverviewScanMeta,
  type RvOverviewScanMeta,
} from '@/lib/rv-industry-overview/rv-overview-scan-meta';
import type { RvOverviewWideRow } from '@/lib/rv-industry-overview/rv-overview-wide-row';
import {
  createGlampingOverviewSnapshotInventoryAccum,
  finalizeGlampingOverviewSnapshotInventory,
  recordGlampingOverviewSnapshotInventoryRow,
  type GlampingOverviewSnapshotInventory,
} from '@/lib/glamping-industry-overview/glamping-overview-snapshot-inventory';

const GLAMPING_INDUSTRY_OVERVIEW_CACHE_TABLE = 'glamping_industry_overview_cache';

export type GlampingOverviewFetchSource = 'hipcamp' | 'sage';

/** Maps Hipcamp/Sage to transparency accum keys (campspot/roverpass slots). */
function transparencySource(source: GlampingOverviewFetchSource): RvOverviewDataSource {
  return source === 'hipcamp' ? 'campspot' : 'roverpass';
}

/** When true, page loads run live Hipcamp/Sage scans if Postgres snapshot is missing. */
export function isGlampingOverviewLiveScanAllowed(): boolean {
  if (process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN === '1') return true;
  return process.env.NODE_ENV === 'development';
}

export type GlampingIndustryOverviewSlice = {
  mapResult: CampspotRvMapDataResult;
  trendsResult: CampspotTrendsChartResult;
  sizeResult: CampspotSizeTierChartResult;
  seasonRatesResult: CampspotSeasonRatesChartResult;
  surfaceRatesResult: CampspotSurfaceRatesChartResult;
  amenityPropsResult: GlampingAmenityPropertiesChartResult;
  amenityAdrResult: GlampingAmenityAdrChartResult;
  rvParkingChartsResult: CampspotRvParkingChartsResult;
  chartSourceTransparency?: RvOverviewChartTransparencyMap;
};

export type GlampingOverviewSnapshotMeta = {
  present: boolean;
  computedAt: string | null;
  rowsScanned: number | null;
};

export type GlampingIndustryOverviewSourceOnlyPayload = {
  rowsScannedTotal: number;
  slice: GlampingIndustryOverviewSlice;
  scanTransparency?: RvOverviewScanTransparency;
};

/** @deprecated Use GlampingIndustryOverviewSourceOnlyPayload */
export type GlampingIndustryOverviewHipcampOnlyPayload = GlampingIndustryOverviewSourceOnlyPayload;

export type GlampingIndustryOverviewPageData = {
  rowsScannedTotal: number;
  rowsScannedHipcamp: number;
  rowsScannedSage: number;
  slice: GlampingIndustryOverviewSlice;
  scanTransparency?: RvOverviewScanTransparency;
  hipcampOnly?: GlampingIndustryOverviewSourceOnlyPayload;
  sageOnly?: GlampingIndustryOverviewSourceOnlyPayload;
  scanMeta?: RvOverviewScanMeta;
  snapshotInventory?: GlampingOverviewSnapshotInventory;
};

export type { GlampingOverviewSnapshotInventory } from '@/lib/glamping-industry-overview/glamping-overview-snapshot-inventory';

export { GlampingOverviewSnapshotMissingError } from '@/lib/glamping-industry-overview/glamping-overview-errors';
export { isGlampingOverviewSnapshotMissingError } from '@/lib/glamping-industry-overview/glamping-overview-errors';

type GlampingFoldBundleOptions = {
  /** Sage-only scan: regional map labels and size chart use ARDR without occupancy. */
  sageAdrOnlyMetrics?: boolean;
};

type GlampingFoldBundle = GlampingFoldBundleOptions & {
  rvMap: ReturnType<typeof createRvMapFoldState>;
  trends: ReturnType<typeof createTrendsFoldState>;
  sizeTier: ReturnType<typeof createGlampingSizeTierFoldState>;
  season: ReturnType<typeof createSeasonRatesFoldState>;
  surface: ReturnType<typeof createSurfaceRatesFoldState>;
  amenityProps: ReturnType<typeof createGlampingAmenityPropertiesFoldState>;
  amenityAdr: ReturnType<typeof createGlampingAmenityAdrFoldState>;
  rvParking: ReturnType<typeof createRvParkingFoldState>;
  transparency: ChartTransparencyAccum;
};

function createGlampingFoldBundle(options?: GlampingFoldBundleOptions): GlampingFoldBundle {
  return {
    sageAdrOnlyMetrics: options?.sageAdrOnlyMetrics === true,
    rvMap: createRvMapFoldState({
      regionalLabelMode: options?.sageAdrOnlyMetrics ? 'adr_only' : 'paired_adr_occ',
      choroplethUnitCountMode: options?.sageAdrOnlyMetrics ? 'quantity_of_units' : 'rows',
    }),
    trends: createTrendsFoldState(),
    sizeTier: createGlampingSizeTierFoldState(),
    season: createSeasonRatesFoldState(),
    surface: createSurfaceRatesFoldState(),
    amenityProps: createGlampingAmenityPropertiesFoldState(),
    amenityAdr: createGlampingAmenityAdrFoldState(),
    rvParking: createRvParkingFoldState(),
    transparency: createChartTransparencyAccum(),
  };
}

function foldGlampingWideRowIntoBundle(
  b: GlampingFoldBundle,
  row: RvOverviewWideRow,
  source: GlampingOverviewFetchSource,
  raw?: Record<string, unknown>
): void {
  const mapRow =
    source === 'sage' && raw
      ? wideRowForGlampingStateAdrChoropleth(row, raw)
      : row;
  const transp = transparencySource(source);
  recordUnitSliceChartTransparency(b.transparency, row, transp, 'glamping', {
    contributesToTrends: rowContributesToGlampingTrends,
    contributesToRegionalMap: (r) =>
      rowContributesToRegionalMap(r, RV_MAP_REGIONAL_RATE_BANDS_GLAMPING, b.rvMap.regionalLabelMode),
    contributesToAmenityAdr: (r) => rowContributesToGlampingAmenityAdr(r),
    contributesToResortSize: (r) =>
      rowContributesToGlampingResortSize(r, {
        adrOnly2025: b.sageAdrOnlyMetrics === true,
        adrOnly2024: b.sageAdrOnlyMetrics === true,
      }),
    contributesToStateAdrChoropleth: (r) =>
      rowQualifiesForStateAdrChoropleth(
        mapRow,
        RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
        b.rvMap.regionalLabelMode
      ),
  });
  foldRvMapRows(
    b.rvMap.regional,
    b.rvMap.stateBuckets,
    b.rvMap.stateAdrChoropleth,
    [mapRow],
    RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
    b.rvMap.regionalLabelMode,
    b.rvMap.choroplethUnitCountMode
  );
  foldGlampingTrendsRows(b.trends, [row]);
  foldGlampingSizeTierRows(b.sizeTier, [row], {
    adrOnly2025: source === 'sage',
    adrOnly2024: source === 'sage',
  });
  foldSeasonRateRows(b.season, [row]);
  foldSurfaceRows(b.surface, [row]);
  foldGlampingAmenityPropertyRows(b.amenityProps, [row]);
  foldGlampingAmenityAdrRows(b.amenityAdr, [row]);
  foldRvParkingRows(b.rvParking.distCounts, b.rvParking.rateBuckets, [row]);
}

function finalizeGlampingFoldBundle(
  b: GlampingFoldBundle,
  rowsScanned: number,
  fetchError: string | null
): GlampingIndustryOverviewSlice {
  const rvFinal = finalizeRvParkingFoldState(b.rvParking);
  return {
    mapResult: finalizeRvMapFoldState(b.rvMap, rowsScanned, fetchError),
    trendsResult: { rows: finalizeTrendsFoldState(b.trends), rowsScanned, error: fetchError },
    sizeResult: {
      rows: finalizeGlampingSizeTierFoldState(b.sizeTier),
      rowsScanned,
      error: fetchError,
    },
    seasonRatesResult: { rows: finalizeSeasonRatesFoldState(b.season), rowsScanned, error: fetchError },
    surfaceRatesResult: { rows: finalizeSurfaceRatesFoldState(b.surface), rowsScanned, error: fetchError },
    amenityPropsResult: {
      rows: finalizeGlampingAmenityPropertiesFoldState(b.amenityProps),
      rowsScanned,
      error: fetchError,
    },
    amenityAdrResult: {
      rows: finalizeGlampingAmenityAdrFoldState(b.amenityAdr),
      rowsScanned,
      error: fetchError,
    },
    rvParkingChartsResult: {
      distribution: rvFinal.distribution,
      rateBars: rvFinal.rateBars,
      totalRvRows: rvFinal.totalRvRows,
      rowsScanned,
      error: fetchError,
    },
    chartSourceTransparency: finalizeGlampingChartTransparencyAccum(b.transparency),
  };
}

function bundleErrorSlice(rowsScanned: number, message: string): GlampingIndustryOverviewSlice {
  const emptyRv = aggregateCampspotRowsToRvParkingCharts([]);
  return {
    mapResult: { ...aggregateCampspotRowsToRvMapData([]), rowsScanned, error: message },
    trendsResult: { rows: aggregateGlampingRowsToTrendsChart([]), rowsScanned, error: message },
    sizeResult: {
      rows: finalizeGlampingSizeTierFoldState(createGlampingSizeTierFoldState()),
      rowsScanned,
      error: message,
    },
    seasonRatesResult: { rows: aggregateCampspotRowsToSeasonRates([]), rowsScanned, error: message },
    surfaceRatesResult: { rows: aggregateCampspotRowsToSurfaceRates([]), rowsScanned, error: message },
    amenityPropsResult: {
      rows: finalizeGlampingAmenityPropertiesFoldState(new Map()),
      rowsScanned,
      error: message,
    },
    amenityAdrResult: { rows: aggregateGlampingRowsToAmenityAdrChart([]), rowsScanned, error: message },
    rvParkingChartsResult: { ...emptyRv, rowsScanned, error: message },
  };
}

function bundleError(
  rowsScanned: number,
  message: string,
  hipcampScanned = 0,
  sageScanned = 0,
  scanMeta: RvOverviewScanMeta = emptyRvOverviewScanMeta()
): GlampingIndustryOverviewPageData {
  const slice = bundleErrorSlice(rowsScanned, message);
  return {
    rowsScannedTotal: rowsScanned,
    rowsScannedHipcamp: hipcampScanned,
    rowsScannedSage: sageScanned,
    scanMeta,
    slice,
  };
}

function rowEligibleForGlampingOverview(
  row: RvOverviewWideRow,
  source: GlampingOverviewFetchSource,
  raw?: Record<string, unknown>
): boolean {
  if (raw && !isGlampingOverviewUsCountryValue(raw.country)) {
    return false;
  }
  if (source === 'hipcamp' && raw && isHipcampRvDominantPropertyType(raw.property_type)) {
    return false;
  }
  return classifyCampspotUnitChartBucket(row) === 'glamping';
}

function foldGlampingOverviewWideRows(
  rows: RvOverviewWideRow[],
  bundle: GlampingFoldBundle,
  unclassifiedAccum: UnclassifiedAccum,
  source: GlampingOverviewFetchSource,
  rawRows?: Record<string, unknown>[]
): void {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const raw = rawRows?.[i];
    if (!rowEligibleForGlampingOverview(row, source, raw)) {
      recordUnclassifiedRow(unclassifiedAccum, transparencySource(source));
      continue;
    }
    foldGlampingWideRowIntoBundle(bundle, row, source, raw);
  }
}

function isValidGlampingSlice(v: unknown): boolean {
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

function isValidGlampingPayload(v: unknown): v is GlampingIndustryOverviewPageData {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.rowsScannedTotal !== 'number') return false;
  return isValidGlampingSlice(o.slice);
}

const GLAMPING_OVERVIEW_CACHE_ROW_SELECT = 'payload, computed_at, rows_scanned';

async function readGlampingOverviewCacheRow(
  supabase: SupabaseClient
): Promise<IndustryOverviewCacheRow | null> {
  const { data, error } = await supabase
    .from(GLAMPING_INDUSTRY_OVERVIEW_CACHE_TABLE)
    .select(GLAMPING_OVERVIEW_CACHE_ROW_SELECT)
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    payload: data.payload ?? null,
    computed_at: data.computed_at ?? null,
    rows_scanned: typeof data.rows_scanned === 'number' ? data.rows_scanned : null,
  };
}

function glampingOverviewSnapshotMetaFromCacheRow(
  row: IndustryOverviewCacheRow | null
): GlampingOverviewSnapshotMeta {
  return industryOverviewSnapshotMetaFromRow(row);
}

function parseGlampingOverviewPayloadFromCacheRow(
  row: IndustryOverviewCacheRow | null
): GlampingIndustryOverviewPageData | null {
  if (!row?.payload) return null;
  if (!isValidGlampingPayload(row.payload)) return null;
  return sanitizeGlampingOverviewPageDataPayload(row.payload);
}

/** Fresh Postgres read for admin cache health UI (bypasses `unstable_cache`). */
export const getGlampingOverviewSnapshotMeta = reactCache(
  async (): Promise<GlampingOverviewSnapshotMeta> => {
    const supabase = createServerClient();
    const row = await readGlampingOverviewCacheRow(supabase);
    return glampingOverviewSnapshotMetaFromCacheRow(row);
  }
);

async function readGlampingOverviewPayloadFromPg(
  supabase: SupabaseClient
): Promise<GlampingIndustryOverviewPageData | null> {
  const row = await readGlampingOverviewCacheRow(supabase);
  return parseGlampingOverviewPayloadFromCacheRow(row);
}

export type GlampingIndustryOverviewPageLoad = {
  pageData: GlampingIndustryOverviewPageData | null;
  snapshotMeta: GlampingOverviewSnapshotMeta;
};

async function writeGlampingOverviewPayloadToPg(
  supabase: SupabaseClient,
  payload: GlampingIndustryOverviewPageData
): Promise<void> {
  const { error } = await supabase.from(GLAMPING_INDUSTRY_OVERVIEW_CACHE_TABLE).upsert(
    {
      id: 1,
      payload,
      rows_scanned: payload.rowsScannedTotal,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('[glamping-industry-overview] Failed to persist Postgres cache:', error.message);
  }
}

type SourceScanResult = {
  rowsScanned: number;
  error: string | null;
  hitRowCap: boolean;
  maxRows: number;
};

async function scanGlampingOverviewTable(
  supabase: SupabaseClient,
  config: {
    table: 'hipcamp' | 'all_glamping_properties';
    select: string;
    maxRows: number;
    mapRow: (row: Record<string, unknown>) => RvOverviewWideRow;
    applyQuery: (q: any) => any;
  },
  onBatch: (wide: RvOverviewWideRow[], raw: Record<string, unknown>[]) => void
): Promise<SourceScanResult> {
  let rowsScanned = 0;
  let fetchError: string | null = null;
  let hitRowCap = false;
  const pageSize = GLAMPING_OVERVIEW_PAGE_SIZE;
  const parallel = GLAMPING_OVERVIEW_PARALLEL_PAGES;
  const maxRows = config.maxRows;

  const fetchRange = (start: number, end: number) => {
    let q = supabase.from(config.table).select(config.select).order('id', { ascending: true });
    q = config.applyQuery(q);
    return q.range(start, end);
  };

  while (rowsScanned < maxRows) {
    const batchStarts: number[] = [];
    for (let p = 0; p < parallel; p++) {
      const start = rowsScanned + p * pageSize;
      if (start >= maxRows) break;
      batchStarts.push(start);
    }
    if (batchStarts.length === 0) break;

    const results = await Promise.all(
      batchStarts.map((s) => fetchRange(s, s + pageSize - 1))
    );

    let batchDone = false;
    for (const { data, error } of results) {
      if (error) {
        fetchError = rvOverviewSupabaseDisplayError(error);
        batchDone = true;
        break;
      }
      if (!data?.length) {
        batchDone = true;
        break;
      }

      const raw = data as unknown as Record<string, unknown>[];
      const wide = raw.map(config.mapRow);
      onBatch(wide, raw);

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

export async function fetchGlampingIndustryOverviewPageDataUncached(
  supabase: SupabaseClient
): Promise<GlampingIndustryOverviewPageData> {
  const bundle = createGlampingFoldBundle();
  const bundleHipcampOnly = createGlampingFoldBundle();
  const bundleSageOnly = createGlampingFoldBundle({ sageAdrOnlyMetrics: true });
  const unclassifiedAccum = createUnclassifiedAccum();
  const unclassifiedHipcampOnly = createUnclassifiedAccum();
  const unclassifiedSageOnly = createUnclassifiedAccum();
  const inventoryAccum = createGlampingOverviewSnapshotInventoryAccum();

  const [hipcampScan, sageScan] = await Promise.all([
    scanGlampingOverviewTable(
      supabase,
      {
        table: 'hipcamp',
        select: HIPCAMP_GLAMPING_OVERVIEW_SELECT,
        maxRows: HIPCAMP_GLAMPING_OVERVIEW_MAX_ROWS,
        mapRow: normalizeHipcampRowToGlampingOverviewWide,
        applyQuery: (q) =>
          applyGlampingOverviewUsScope(q)
            .not('lat_num', 'is', null)
            .not('lon_num', 'is', null)
            .not('property_name', 'is', null),
      },
    (wide, raw) => {
      for (const row of wide) {
        recordGlampingOverviewSnapshotInventoryRow(inventoryAccum, row, 'hipcamp');
      }
      foldGlampingOverviewWideRows(wide, bundle, unclassifiedAccum, 'hipcamp', raw);
      foldGlampingOverviewWideRows(wide, bundleHipcampOnly, unclassifiedHipcampOnly, 'hipcamp', raw);
    }
    ),
    scanGlampingOverviewTable(
      supabase,
      {
        table: 'all_glamping_properties',
        select: SAGE_GLAMPING_OVERVIEW_SELECT,
        maxRows: SAGE_GLAMPING_OVERVIEW_MAX_ROWS,
        mapRow: normalizeSageRowToGlampingOverviewWide,
        applyQuery: (q) =>
          applyGlampingOverviewUsScope(q)
            .eq('is_glamping_property', 'Yes')
            .or('is_open.is.null,is_open.eq.Yes')
            .eq('research_status', 'published')
            .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
            .not('lat', 'is', null)
            .not('lon', 'is', null),
      },
    (wide, raw) => {
      for (const row of wide) {
        recordGlampingOverviewSnapshotInventoryRow(inventoryAccum, row, 'sage');
      }
      foldGlampingOverviewWideRows(wide, bundle, unclassifiedAccum, 'sage', raw);
      foldGlampingOverviewWideRows(wide, bundleSageOnly, unclassifiedSageOnly, 'sage', raw);
    }
    ),
  ]);

  if (hipcampScan.error) {
    return bundleError(
      hipcampScan.rowsScanned,
      hipcampScan.error,
      hipcampScan.rowsScanned,
      sageScan.rowsScanned,
      {
        campspot: buildSourceScanMeta(
          hipcampScan.rowsScanned,
          hipcampScan.maxRows,
          hipcampScan.hitRowCap
        ),
        roverpass: buildSourceScanMeta(
          sageScan.rowsScanned,
          sageScan.maxRows,
          sageScan.hitRowCap
        ),
      }
    );
  }

  const rowsScannedTotal = hipcampScan.rowsScanned + sageScan.rowsScanned;

  if (sageScan.error) {
    return bundleError(
      rowsScannedTotal,
      sageScan.error,
      hipcampScan.rowsScanned,
      sageScan.rowsScanned,
      {
        campspot: buildSourceScanMeta(
          hipcampScan.rowsScanned,
          hipcampScan.maxRows,
          hipcampScan.hitRowCap
        ),
        roverpass: buildSourceScanMeta(
          sageScan.rowsScanned,
          sageScan.maxRows,
          sageScan.hitRowCap
        ),
      }
    );
  }

  const scanMeta: RvOverviewScanMeta = {
    campspot: buildSourceScanMeta(
      hipcampScan.rowsScanned,
      hipcampScan.maxRows,
      hipcampScan.hitRowCap
    ),
    roverpass: buildSourceScanMeta(sageScan.rowsScanned, sageScan.maxRows, sageScan.hitRowCap),
  };

  return {
    rowsScannedTotal,
    rowsScannedHipcamp: hipcampScan.rowsScanned,
    rowsScannedSage: sageScan.rowsScanned,
    scanMeta,
    snapshotInventory: finalizeGlampingOverviewSnapshotInventory(inventoryAccum),
    scanTransparency: finalizeUnclassifiedAccum(unclassifiedAccum),
    slice: finalizeGlampingFoldBundle(bundle, rowsScannedTotal, null),
    hipcampOnly: {
      rowsScannedTotal: hipcampScan.rowsScanned,
      scanTransparency: finalizeUnclassifiedAccum(unclassifiedHipcampOnly),
      slice: finalizeGlampingFoldBundle(bundleHipcampOnly, hipcampScan.rowsScanned, null),
    },
    sageOnly: {
      rowsScannedTotal: sageScan.rowsScanned,
      scanTransparency: finalizeUnclassifiedAccum(unclassifiedSageOnly),
      slice: finalizeGlampingFoldBundle(bundleSageOnly, sageScan.rowsScanned, null),
    },
  };
}

export const GLAMPING_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS = 90 * 24 * 60 * 60;
export const GLAMPING_INDUSTRY_OVERVIEW_CACHE_TAG = 'glamping-industry-overview';

const GLAMPING_OVERVIEW_CACHE_KEY =
  'glamping-industry-overview-page-v14-hipcamp-occ-2024-2025';

async function computeGlampingIndustryOverviewPageData(
  supabase: SupabaseClient
): Promise<GlampingIndustryOverviewPageData> {
  const computed = await fetchGlampingIndustryOverviewPageDataUncached(supabase);
  if (!computed.slice.mapResult.error) {
    await writeGlampingOverviewPayloadToPg(supabase, computed);
  }
  return computed;
}

const getCachedGlampingIndustryOverviewLiveCompute = unstable_cache(
  async () => computeGlampingIndustryOverviewPageData(createServerClient()),
  [GLAMPING_OVERVIEW_CACHE_KEY, 'live-compute'],
  {
    revalidate: GLAMPING_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
    tags: [GLAMPING_INDUSTRY_OVERVIEW_CACHE_TAG],
  }
);

async function resolveGlampingIndustryOverviewPageLoad(): Promise<GlampingIndustryOverviewPageLoad> {
  const supabase = createServerClient();
  const row = await readGlampingOverviewCacheRow(supabase);
  const snapshotMeta = glampingOverviewSnapshotMetaFromCacheRow(row);
  const fromPg = parseGlampingOverviewPayloadFromCacheRow(row);
  if (fromPg) {
    return { pageData: fromPg, snapshotMeta };
  }

  if (!isGlampingOverviewLiveScanAllowed()) {
    return { pageData: null, snapshotMeta };
  }

  const computed = await getCachedGlampingIndustryOverviewLiveCompute();
  return {
    pageData: computed,
    snapshotMeta: {
      present: true,
      computedAt: new Date().toISOString(),
      rowsScanned: computed.rowsScannedTotal,
    },
  };
}

function throwGlampingOverviewSnapshotMissing(): never {
  throw new GlampingOverviewSnapshotMissingError(
    'Glamping Industry Overview snapshot is missing or invalid in glamping_industry_overview_cache. ' +
      'Run POST /api/admin/glamping-industry-overview/refresh-cache or npm run refresh:glamping-overview.'
  );
}

const getCachedGlampingIndustryOverviewPageLoad = unstable_cache(
  resolveGlampingIndustryOverviewPageLoad,
  [GLAMPING_OVERVIEW_CACHE_KEY],
  {
    revalidate: GLAMPING_INDUSTRY_OVERVIEW_REVALIDATE_SECONDS,
    tags: [GLAMPING_INDUSTRY_OVERVIEW_CACHE_TAG],
  }
);

/** One Postgres read + Next cache for admin page render (payload and cache-bar meta). */
export const getGlampingIndustryOverviewPageLoad = reactCache(
  async (): Promise<GlampingIndustryOverviewPageLoad> =>
    getCachedGlampingIndustryOverviewPageLoad()
);

/** Returns null when Postgres snapshot is missing and live scan is not allowed (production default). */
export async function getGlampingIndustryOverviewPageData(): Promise<GlampingIndustryOverviewPageData | null> {
  return (await getGlampingIndustryOverviewPageLoad()).pageData;
}

/** Same as getGlampingIndustryOverviewPageData but throws for API routes that require data. */
export async function requireGlampingIndustryOverviewPageData(): Promise<GlampingIndustryOverviewPageData> {
  const data = await getGlampingIndustryOverviewPageData();
  if (!data) throwGlampingOverviewSnapshotMissing();
  return data;
}

export async function recomputeGlampingIndustryOverviewPageData(): Promise<GlampingIndustryOverviewPageData> {
  const supabase = createServerClient();
  const computed = await fetchGlampingIndustryOverviewPageDataUncached(supabase);
  await writeGlampingOverviewPayloadToPg(supabase, computed);
  return computed;
}
