/**
 * Per-chart row counts by data source (Campspot vs RoverPass) during unified fold.
 * Shown in admin UI only — excluded from JPEG export capture.
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import { parseCampspotNumber, parseCampspotOccupancyPercent } from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  regionalMapLabelDiagnostics,
  RV_MAP_REGIONAL_RATE_BANDS_DEFAULT,
  RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
  type CampspotRvMapAggRow,
  type RvMapRegionalRateBands,
} from '@/lib/rv-industry-overview/campspot-rv-map-data';
import {
  parseCampspotAdr2025FromAnnualColumn,
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
  rowPassesStandardCampspot2025Quality,
  RV_OVERVIEW_STANDARD_RATE_MIN_USD,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import { getRvIndustryRegionForStateAbbr } from '@/lib/rv-industry-overview/us-rv-regions';
import {
  classifyCampspotUnitChartBucket,
  type CampspotUnitTypeAggRow,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';
import type { CampspotTrendsAggRow } from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import type { CampspotSizeTierAggRow } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import { siteCountToSizeTier } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';
import type { CampspotSeasonRatesAggRow } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import { SEASON_RATE_KEYS } from '@/lib/rv-industry-overview/campspot-season-rates-chart-data';
import type { CampspotSurfaceRatesAggRow } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import { classifyCampspotRvSurfaceType } from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';
import type { CampspotAmenityPropertiesAggRow } from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';
import type { CampspotAmenityAdrAggRow } from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';
import type { CampspotRvParkingAggRow } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import { classifyRvParkingType } from '@/lib/rv-industry-overview/campspot-rv-parking-charts-data';
import type { RvOverviewWideRow } from '@/lib/rv-industry-overview/rv-overview-wide-row';
import type { RvOverviewUnitFilterKey } from '@/lib/rv-industry-overview/rv-overview-unit-filter';

export type RvOverviewDataSource = 'campspot' | 'roverpass';

export type RvOverviewChartTransparencyKey =
  | 'regionalMap'
  | 'stateAdrChoropleth'
  | 'trends'
  | 'resortSize'
  | 'unitTypeRate'
  | 'unitTypeDistribution'
  | 'seasonRates'
  | 'surfaceRates'
  | 'amenityPropertyPct'
  | 'amenityAdr'
  | 'rvParking';

export const RV_OVERVIEW_CHART_TRANSPARENCY_KEYS: RvOverviewChartTransparencyKey[] = [
  'regionalMap',
  'stateAdrChoropleth',
  'trends',
  'resortSize',
  'unitTypeRate',
  'unitTypeDistribution',
  'seasonRates',
  'surfaceRates',
  'amenityPropertyPct',
  'amenityAdr',
  'rvParking',
];

export type ChartSourceBreakdown = {
  rowsUsed: number;
  campspotRows: number;
  roverpassRows: number;
  campspotPct: number | null;
  roverpassPct: number | null;
};

export type RvOverviewScanTransparency = {
  unclassifiedExcluded: { campspot: number; roverpass: number; total: number };
};

export type RvOverviewChartTransparencyMap = Record<
  RvOverviewChartTransparencyKey,
  ChartSourceBreakdown
>;

type SourceCounter = { campspot: number; roverpass: number };

export type ChartTransparencyAccum = Record<RvOverviewChartTransparencyKey, SourceCounter>;

export type UnclassifiedAccum = { campspot: number; roverpass: number };

function emptyCounter(): SourceCounter {
  return { campspot: 0, roverpass: 0 };
}

export function createChartTransparencyAccum(): ChartTransparencyAccum {
  return RV_OVERVIEW_CHART_TRANSPARENCY_KEYS.reduce((acc, key) => {
    acc[key] = emptyCounter();
    return acc;
  }, {} as ChartTransparencyAccum);
}

export function createUnclassifiedAccum(): UnclassifiedAccum {
  return { campspot: 0, roverpass: 0 };
}

function bump(counter: SourceCounter, source: RvOverviewDataSource): void {
  counter[source] += 1;
}

export function finalizeChartSourceBreakdown(counter: SourceCounter): ChartSourceBreakdown {
  const rowsUsed = counter.campspot + counter.roverpass;
  if (rowsUsed === 0) {
    return {
      rowsUsed: 0,
      campspotRows: 0,
      roverpassRows: 0,
      campspotPct: null,
      roverpassPct: null,
    };
  }
  const campspotPct = Math.round((1000 * counter.campspot) / rowsUsed) / 10;
  const roverpassPct = Math.round((1000 * counter.roverpass) / rowsUsed) / 10;
  return {
    rowsUsed,
    campspotRows: counter.campspot,
    roverpassRows: counter.roverpass,
    campspotPct,
    roverpassPct,
  };
}

export function finalizeChartTransparencyAccum(
  accum: ChartTransparencyAccum
): RvOverviewChartTransparencyMap {
  return RV_OVERVIEW_CHART_TRANSPARENCY_KEYS.reduce((out, key) => {
    out[key] = finalizeChartSourceBreakdown(accum[key]);
    return out;
  }, {} as RvOverviewChartTransparencyMap);
}

export function finalizeUnclassifiedAccum(accum: UnclassifiedAccum): RvOverviewScanTransparency {
  return {
    unclassifiedExcluded: {
      campspot: accum.campspot,
      roverpass: accum.roverpass,
      total: accum.campspot + accum.roverpass,
    },
  };
}

function regionalBandsForUnitFilter(unitFilter: RvOverviewUnitFilterKey): RvMapRegionalRateBands {
  return unitFilter === 'glamping'
    ? RV_MAP_REGIONAL_RATE_BANDS_GLAMPING
    : RV_MAP_REGIONAL_RATE_BANDS_DEFAULT;
}

/** Mirrors private helper in `campspot-rv-map-data` (choropleth ADR band gate). */
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

function adr2025ForRow(row: { avg_retail_daily_rate_2025: string | null }): number | null {
  return parseCampspotAdr2025FromAnnualColumn(row);
}

function parseSiteCount(
  propertyTotalSites: string | null | undefined,
  quantityOfUnits: string | null | undefined
): number | null {
  const total = parseCampspotNumber(propertyTotalSites);
  if (total != null && total >= 1) return Math.round(total);
  const q = parseCampspotNumber(quantityOfUnits);
  if (q != null && q >= 1) return Math.round(q);
  return null;
}

function amenityPropertyGroupKey(row: CampspotAmenityPropertiesAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

function rowInUsRegion(row: { state?: string | null }): boolean {
  const stateAbbr = normalizeState(row.state);
  return Boolean(stateAbbr && getRvIndustryRegionForStateAbbr(stateAbbr));
}

function rowContributesToRegionalMap(
  row: CampspotRvMapAggRow,
  bands: RvMapRegionalRateBands
): boolean {
  if (!rowInUsRegion(row)) return false;
  return regionalMapLabelDiagnostics(row, bands).included;
}

function rowContributesToStateAdrChoropleth(
  row: CampspotRvMapAggRow,
  bands: RvMapRegionalRateBands
): boolean {
  if (!rowInUsRegion(row)) return false;
  const diag = regionalMapLabelDiagnostics(row, bands);
  return (
    diag.adr2025 != null && passesRegionalMapRetailRateUsd(diag.adr2025, bands)
  );
}

function rowContributesToTrends(row: CampspotTrendsAggRow): boolean {
  if (!rowInUsRegion(row)) return false;

  const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
  const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  const y4 =
    o4 != null &&
    a4 != null &&
    passesStandardCampspotOccupancyPercent(o4) &&
    passesStandardCampspotRetailRateUsd(a4);

  const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  const a5 = adr2025ForRow(row);
  const y5 =
    o5 != null &&
    a5 != null &&
    passesStandardCampspotOccupancyPercent(o5) &&
    passesStandardCampspotRetailRateUsd(a5);

  return y4 || y5;
}

function rowContributesToResortSize(row: CampspotSizeTierAggRow): boolean {
  const nSites = parseSiteCount(row.property_total_sites, row.quantity_of_units);
  if (nSites == null || !siteCountToSizeTier(nSites)) return false;

  const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
  const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  const y4 =
    o4 != null &&
    a4 != null &&
    passesStandardCampspotOccupancyPercent(o4) &&
    passesStandardCampspotRetailRateUsd(a4);

  const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  const a5 = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  const y5 =
    o5 != null &&
    a5 != null &&
    passesStandardCampspotOccupancyPercent(o5) &&
    passesStandardCampspotRetailRateUsd(a5);

  return y4 || y5;
}

function rowContributesToUnitTypeRate(row: CampspotUnitTypeAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (!rowPassesStandardCampspot2025Quality(row)) return false;
  if (!classifyCampspotUnitChartBucket(row)) return false;
  return adr2025ForRow(row) != null;
}

function rowContributesToUnitTypeDistribution(row: CampspotUnitTypeAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (!rowPassesStandardCampspot2025Quality(row)) return false;
  if (!classifyCampspotUnitChartBucket(row)) return false;
  const name = (row.property_name ?? '').trim();
  const st = normalizeState(row.state);
  return Boolean(name && st);
}

function rowContributesToSeasonRates(row: CampspotSeasonRatesAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  for (const key of SEASON_RATE_KEYS) {
    const n = parseCampspotNumber(row[key]);
    if (n != null && passesStandardCampspotRetailRateUsd(n)) return true;
  }
  return false;
}

function rowContributesToSurfaceRates(row: CampspotSurfaceRatesAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (!classifyCampspotRvSurfaceType(row.rv_surface_type)) return false;
  const adr = adr2025ForRow(row);
  return adr != null && passesStandardCampspotRetailRateUsd(adr);
}

function rowContributesToAmenityPropertyPct(row: CampspotAmenityPropertiesAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (!rowPassesStandardCampspot2025Quality(row)) return false;
  return amenityPropertyGroupKey(row) != null;
}

function rowContributesToAmenityAdr(row: CampspotAmenityAdrAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (classifyCampspotUnitChartBucket(row as unknown as CampspotUnitTypeAggRow) !== 'rv') {
    return false;
  }
  const adr = adr2025ForRow(row);
  return adr != null && passesStandardCampspotRetailRateUsd(adr);
}

function rowContributesToRvParking(row: CampspotRvParkingAggRow): boolean {
  if (!rowInUsRegion(row)) return false;
  if (classifyCampspotUnitChartBucket(row as unknown as CampspotUnitTypeAggRow) !== 'rv') {
    return false;
  }
  if (!rowPassesStandardCampspot2025Quality(row)) return false;
  classifyRvParkingType(row.rv_parking);
  return true;
}

/**
 * Record per-chart source counts for one classified row in a unit-filter bundle.
 */
export function recordUnitSliceChartTransparency(
  accum: ChartTransparencyAccum,
  row: RvOverviewWideRow,
  source: RvOverviewDataSource,
  unitFilter: RvOverviewUnitFilterKey
): void {
  const bands = regionalBandsForUnitFilter(unitFilter);

  if (rowContributesToRegionalMap(row, bands)) bump(accum.regionalMap, source);
  if (rowContributesToStateAdrChoropleth(row, bands)) bump(accum.stateAdrChoropleth, source);
  if (rowContributesToTrends(row)) bump(accum.trends, source);
  if (rowContributesToResortSize(row)) bump(accum.resortSize, source);
  if (rowContributesToSeasonRates(row)) bump(accum.seasonRates, source);
  if (rowContributesToSurfaceRates(row)) bump(accum.surfaceRates, source);
  if (rowContributesToAmenityPropertyPct(row)) bump(accum.amenityPropertyPct, source);
  if (rowContributesToAmenityAdr(row)) bump(accum.amenityAdr, source);
  if (rowContributesToRvParking(row)) bump(accum.rvParking, source);
}

export function recordUnitTypeComparisonChartTransparency(
  accum: ChartTransparencyAccum,
  row: RvOverviewWideRow,
  source: RvOverviewDataSource
): void {
  if (rowContributesToUnitTypeRate(row)) bump(accum.unitTypeRate, source);
  if (rowContributesToUnitTypeDistribution(row)) bump(accum.unitTypeDistribution, source);
}

export function recordUnclassifiedRow(accum: UnclassifiedAccum, source: RvOverviewDataSource): void {
  accum[source] += 1;
}
