import { GLAMPING_PROPERTY_AMENITY_COLUMNS, GLAMPING_RV_SITE_COLUMNS } from '@/lib/market-report/amenity-columns';
import { isExcludedGlampingUnitType } from '@/lib/market-report/load-cohort';
import {
  humanizeColumnKey,
  isAffirmative,
  mean,
  medianSorted,
  percentileSorted,
} from '@/lib/market-report/normalize';
import {
  countDistinctListings,
  countDistinctListingsInSourceSlice,
  countDistinctListingsWhere,
} from '@/lib/market-report/listing-identity';
import { isOmittedUnitTypeForCharts } from '@/lib/market-report/dedupe';
import { marketReportSourceLabel } from '@/lib/market-report/source-labels';
import type { CountyMetricsResult } from '@/lib/market-report/county-metrics';
import type { DemandDriversResult } from '@/lib/market-report/demand-drivers';
import type { OpportunityScore } from '@/lib/market-report/opportunity-score';
import type {
  AmenityAnalysisSection,
  CohortPropertyRow,
  MarketReportSections,
  MarketReportSegment,
  MarketReportSourceBreakdownRow,
  MarketSummarySection,
  MarketSummaryTopUnitTypeDetailRow,
  MarketSummaryTopUnitTypeRow,
  PropertyAnalysisSection,
  RateAnalysisSection,
  SiteUnitAnalysisSection,
} from '@/lib/market-report/types';

const PREMIUM_COHORT_ADR_THRESHOLD = 300;
const TOP_UNIT_TYPES_FOR_SUMMARY = 5;
/** Max cohort rows shipped per top unit type for expandable UI (payload guard). */
const TOP_UNIT_TYPE_COHORT_DETAIL_CAP = 200;

const SAMPLE_CAP = 25;
const SOURCE_BREAKDOWN_ORDER: CohortPropertyRow['source'][] = [
  'all_sage_data',
  'hipcamp',
  'all_roverpass_data_new',
  'campspot',
];
const TOP_TYPES = 8;
const TOP_UNIT_TYPES = 12;
const TOP_AMENITIES = 24;

function countBy<T extends string | null>(rows: CohortPropertyRow[], pick: (r: CohortPropertyRow) => T): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const raw = pick(r);
    const k = String(raw ?? '').trim() || 'Unknown';
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function topFromMap(m: Map<string, number>, limit: number): { key: string; count: number }[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function buildSourceBreakdown(rows: CohortPropertyRow[]): MarketReportSourceBreakdownRow[] {
  const bySource = new Map<string, CohortPropertyRow[]>();
  for (const r of rows) {
    const list = bySource.get(r.source) ?? [];
    list.push(r);
    bySource.set(r.source, list);
  }
  const keys = [...bySource.keys()].sort((a, b) => {
    const ia = SOURCE_BREAKDOWN_ORDER.indexOf(a as CohortPropertyRow['source']);
    const ib = SOURCE_BREAKDOWN_ORDER.indexOf(b as CohortPropertyRow['source']);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    return ra - rb;
  });
  return keys.map((source) => {
    const list = bySource.get(source)!;
    let totalSites = 0;
    let totalUnits = 0;
    let anySites = false;
    let anyUnits = false;
    for (const r of list) {
      if (r.property_total_sites != null && r.property_total_sites > 0) {
        totalSites += r.property_total_sites;
        anySites = true;
      }
      if (r.quantity_of_units != null && r.quantity_of_units > 0) {
        totalUnits += r.quantity_of_units;
        anyUnits = true;
      }
    }
    const rates = list.map((r) => r.rate_avg).filter((n): n is number => n != null && n > 0);
    const occs = list.map((r) => r.occupancy).filter((n): n is number => n != null && Number.isFinite(n));
    return {
      source,
      sourceLabel: marketReportSourceLabel(source),
      inventoryRowCount: list.length,
      distinctListingCount: countDistinctListingsInSourceSlice(list),
      totalSites: anySites ? totalSites : null,
      totalUnits: anyUnits ? totalUnits : null,
      avgRetailDailyRate: mean(rates),
      avgOccupancy: mean(occs),
    };
  });
}

function buildTopUnitTypeDetailRow(
  unit_type: string,
  rowIndex: number,
  r: CohortPropertyRow,
): MarketSummaryTopUnitTypeDetailRow {
  const rateOk =
    r.rate_avg != null && r.rate_avg > 0 && Number.isFinite(r.rate_avg) ? r.rate_avg : null;
  return {
    key: `${unit_type}|${rowIndex}|${r.source}|${r.sourceId ?? 'noid'}|${r.distance_miles}|${rateOk ?? 'na'}`,
    property_name: r.property_name,
    city: r.city,
    state: r.state,
    source: r.source,
    sourceLabel: marketReportSourceLabel(r.source),
    distance_miles: r.distance_miles,
    site_name:
      r.site_name != null && String(r.site_name).trim().length > 0
        ? String(r.site_name).trim()
        : null,
    rate_avg: rateOk,
    quantity_of_units: r.quantity_of_units,
    property_total_sites: r.property_total_sites,
    url: r.url ?? null,
  };
}

function buildTopUnitTypesWithAdr(
  rows: CohortPropertyRow[],
  segment: MarketReportSegment,
): MarketSummaryTopUnitTypeRow[] {
  const cohortRows =
    segment === 'glamping'
      ? rows.filter((r) => !isExcludedGlampingUnitType(r.unit_type))
      : rows;
  const rowLists = new Map<string, CohortPropertyRow[]>();
  for (const r of cohortRows) {
    const key = (r.unit_type ?? '').trim() || 'Unknown';
    if (isOmittedUnitTypeForCharts(key)) continue;
    const list = rowLists.get(key) ?? [];
    list.push(r);
    rowLists.set(key, list);
  }
  const sortedTypes = [...rowLists.entries()].sort((a, b) => b[1].length - a[1].length);
  return sortedTypes.slice(0, TOP_UNIT_TYPES_FOR_SUMMARY).map(([unit_type, list]) => {
    const rates = list
      .map((r) => r.rate_avg)
      .filter((n): n is number => n != null && n > 0 && Number.isFinite(n));
    const sorted = [...rates].sort((a, b) => a - b);
    let unitCount = 0;
    let hasUnitData = false;
    for (const r of list) {
      if (r.quantity_of_units != null && r.quantity_of_units > 0) {
        unitCount += r.quantity_of_units;
        hasUnitData = true;
      }
    }
    const capped = list.slice(0, TOP_UNIT_TYPE_COHORT_DETAIL_CAP);
    const details = capped.map((r, i) => buildTopUnitTypeDetailRow(unit_type, i, r));
    return {
      unit_type,
      count: list.length,
      unitCount: hasUnitData ? unitCount : null,
      meanAdr: mean(rates),
      medianAdr: medianSorted(sorted),
      details,
      detailsTruncated: list.length > TOP_UNIT_TYPE_COHORT_DETAIL_CAP,
    };
  });
}

/**
 * Sum of `property_total_sites` across cohort rows where the value is present and
 * greater than zero (same definition as {@link MarketSummarySection.totalSites}).
 */
export function sumCohortPropertyTotalSites(rows: CohortPropertyRow[]): number | null {
  let total: number | null = null;
  for (const r of rows) {
    if (r.property_total_sites != null && r.property_total_sites > 0) {
      total = (total ?? 0) + r.property_total_sites;
    }
  }
  return total;
}

export function buildMarketSummary(
  segment: MarketReportSegment,
  radiusMiles: number,
  rows: CohortPropertyRow[]
): MarketSummarySection {
  const distinctListingCount = countDistinctListings(rows);
  const inventoryRowCount = rows.length;
  const sourceMap = new Map<string, number>();
  for (const r of rows) {
    sourceMap.set(r.source, (sourceMap.get(r.source) ?? 0) + 1);
  }
  const sourceCounts = [...sourceMap.entries()].map(([source, count]) => ({
    source,
    sourceLabel: marketReportSourceLabel(source),
    count,
  }));
  const sourceBreakdown = buildSourceBreakdown(rows);
  const stateMap = countBy(rows, (r) => r.state);
  const topStates = topFromMap(stateMap, 10).map(({ key: state, count }) => ({ state, count }));

  const totalSites = sumCohortPropertyTotalSites(rows);

  return {
    distinctListingCount,
    inventoryRowCount,
    radiusMiles,
    segment,
    sourceCounts,
    sourceBreakdown,
    topStates,
    totalSites,
    topUnitTypesWithAdr: buildTopUnitTypesWithAdr(rows, segment),
  };
}

/** Number of cohort rows priced at or above the premium threshold ($300/night). */
/** Distinct listings with at least one row priced at or above the premium threshold. */
export function countPremiumCohortListings(rows: CohortPropertyRow[]): number {
  return countDistinctListingsWhere(
    rows,
    (r) =>
      r.rate_avg != null &&
      Number.isFinite(r.rate_avg) &&
      r.rate_avg >= PREMIUM_COHORT_ADR_THRESHOLD,
  );
}

export function buildPropertyAnalysis(rows: CohortPropertyRow[]): PropertyAnalysisSection {
  const sites = rows
    .map((r) => r.property_total_sites)
    .filter((n): n is number => n != null && n > 0);
  const sortedSites = [...sites].sort((a, b) => a - b);
  const typeMap = countBy(rows, (r) => r.property_type);
  const topPropertyTypes = topFromMap(typeMap, TOP_TYPES).map(({ key: property_type, count }) => ({
    property_type,
    count,
  }));
  const sample = rows.slice(0, SAMPLE_CAP).map((r, i) => ({
    key: `${r.source}:${r.sourceId ?? 'noid'}:${i}:${r.distance_miles}:${Math.round(r.geo_lat * 1e5)}:${Math.round(r.geo_lng * 1e5)}`,
    property_name: r.property_name,
    city: r.city,
    state: r.state,
    distance_miles: r.distance_miles,
    property_total_sites: r.property_total_sites,
    property_type: r.property_type,
    unit_type: r.unit_type,
    source: r.source,
    sourceLabel: marketReportSourceLabel(r.source),
    rate_avg:
      r.rate_avg != null && r.rate_avg > 0 && Number.isFinite(r.rate_avg)
        ? r.rate_avg
        : null,
    url: r.url ?? null,
  }));
  return {
    meanTotalSites: mean(sites),
    medianTotalSites: medianSorted(sortedSites),
    topPropertyTypes,
    sample,
  };
}

export function buildRateAnalysis(rows: CohortPropertyRow[]): RateAnalysisSection {
  const rates = rows.map((r) => r.rate_avg).filter((n): n is number => n != null && n > 0);
  const sorted = [...rates].sort((a, b) => a - b);
  const avgSeason = (pick: (r: CohortPropertyRow) => number | null) => {
    const vals = rows.map(pick).filter((n): n is number => n != null && n > 0);
    return mean(vals);
  };

  const occRaw = rows.map((r) => r.occupancy).filter((n): n is number => n != null && Number.isFinite(n));
  const occSorted = [...occRaw].sort((a, b) => a - b);
  const occupancySummary =
    occRaw.length > 0
      ? {
          countWithOccupancy: occRaw.length,
          meanOccupancy: mean(occRaw),
          medianOccupancy: medianSorted(occSorted),
        }
      : undefined;

  return {
    propertiesWithPrimaryRate: rates.length,
    meanAdr: mean(rates),
    medianAdr: medianSorted(sorted),
    p25: percentileSorted(sorted, 0.25),
    p75: percentileSorted(sorted, 0.75),
    minAdr: sorted.length ? sorted[0]! : null,
    maxAdr: sorted.length ? sorted[sorted.length - 1]! : null,
    seasonalAverages: [
      { key: 'winter_weekday', average: avgSeason((r) => r.winter_weekday) },
      { key: 'winter_weekend', average: avgSeason((r) => r.winter_weekend) },
      { key: 'spring_weekday', average: avgSeason((r) => r.spring_weekday) },
      { key: 'spring_weekend', average: avgSeason((r) => r.spring_weekend) },
      { key: 'summer_weekday', average: avgSeason((r) => r.summer_weekday) },
      { key: 'summer_weekend', average: avgSeason((r) => r.summer_weekend) },
      { key: 'fall_weekday', average: avgSeason((r) => r.fall_weekday) },
      { key: 'fall_weekend', average: avgSeason((r) => r.fall_weekend) },
    ],
    occupancySummary,
  };
}

function hasMeaningfulCell(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim();
  return s.length > 0;
}

/** Minimum affirmative rows with a valid rate before we trust a rate impact delta. */
const RATE_IMPACT_MIN_SAMPLE = 3;

export function buildAmenityAnalysis(segment: MarketReportSegment, rows: CohortPropertyRow[]): AmenityAnalysisSection {
  if (segment !== 'glamping') {
    return { mode: 'rv_limited' };
  }
  const glampingRows = rows.filter((r) => r.raw);
  const cohortSize = countDistinctListings(glampingRows);
  const cohortRates = glampingRows
    .map((r) => r.rate_avg)
    .filter((n): n is number => n != null && n > 0);
  const cohortMeanAdr = mean(cohortRates);

  const amenityRates: AmenityAnalysisSection['amenityRates'] = [];
  for (const col of GLAMPING_PROPERTY_AMENITY_COLUMNS) {
    if (cohortSize === 0) break;
    const withKnownValue = countDistinctListingsWhere(glampingRows, (r) =>
      hasMeaningfulCell(r.raw?.[col]),
    );
    if (withKnownValue === 0) continue;
    const affirmativeRows = glampingRows.filter((r) => isAffirmative(r.raw?.[col]));
    const yesListings = countDistinctListingsWhere(glampingRows, (r) =>
      isAffirmative(r.raw?.[col]),
    );
    const affirmativeRates = affirmativeRows
      .map((r) => r.rate_avg)
      .filter((n): n is number => n != null && n > 0);
    const meanAdrWith = mean(affirmativeRates);
    const rateImpactUsd =
      meanAdrWith != null &&
      cohortMeanAdr != null &&
      affirmativeRates.length >= RATE_IMPACT_MIN_SAMPLE
        ? Math.round(meanAdrWith - cohortMeanAdr)
        : null;
    amenityRates.push({
      column: col,
      label: humanizeColumnKey(col),
      pctOfCohort: Math.round((yesListings / cohortSize) * 1000) / 10,
      pctOfKnown: Math.round((yesListings / withKnownValue) * 1000) / 10,
      withKnownValue,
      yesCount: yesListings,
      rateImpactUsd,
      rateImpactSampleSize: affirmativeRates.length,
    });
  }
  const withAnyYesAmongKnown = amenityRates.filter((a) => a.pctOfKnown > 0);
  withAnyYesAmongKnown.sort((a, b) => b.pctOfCohort - a.pctOfCohort);
  return {
    mode: 'glamping',
    cohortSize,
    amenityRates: withAnyYesAmongKnown.slice(0, TOP_AMENITIES),
  };
}

function bucketTotalSites(n: number | null): string {
  if (n == null || n <= 0) return 'Unknown';
  if (n <= 25) return '1–25';
  if (n <= 75) return '26–75';
  if (n <= 150) return '76–150';
  return '151+';
}

export function buildSiteUnitAnalysis(segment: MarketReportSegment, rows: CohortPropertyRow[]): SiteUnitAnalysisSection {
  const rowsForUnitRollup =
    segment === 'glamping'
      ? rows.filter((r) => !isExcludedGlampingUnitType(r.unit_type))
      : rows;
  const unitMap = countBy(rowsForUnitRollup, (r) => r.unit_type);
  for (const k of [...unitMap.keys()]) {
    if (isOmittedUnitTypeForCharts(k)) unitMap.delete(k);
  }
  // Build a parallel rate index so we can attach mean/median ARDR per unit type
  // for the dual-axis chart in the Site/Unit section. Same key normalization
  // as `buildTopUnitTypesWithAdr` to keep the two surfaces consistent.
  const rateBuckets = new Map<string, number[]>();
  for (const r of rowsForUnitRollup) {
    const key = (r.unit_type ?? '').trim() || 'Unknown';
    if (isOmittedUnitTypeForCharts(key)) continue;
    if (r.rate_avg != null && r.rate_avg > 0) {
      const list = rateBuckets.get(key) ?? [];
      list.push(r.rate_avg);
      rateBuckets.set(key, list);
    }
  }
  const topUnitTypes = topFromMap(unitMap, TOP_UNIT_TYPES).map(({ key, count }) => {
    const lookupKey = (key ?? '').trim() || 'Unknown';
    const rates = rateBuckets.get(lookupKey) ?? [];
    const sorted = [...rates].sort((a, b) => a - b);
    return {
      unit_type: key,
      count,
      meanAdr: mean(rates),
      medianAdr: medianSorted(sorted),
      minAdr: sorted.length ? sorted[0]! : null,
      maxAdr: sorted.length ? sorted[sorted.length - 1]! : null,
    };
  });
  const bucketMap = new Map<string, number>();
  for (const r of rows) {
    const label = bucketTotalSites(r.property_total_sites);
    bucketMap.set(label, (bucketMap.get(label) ?? 0) + 1);
  }
  const order = ['1–25', '26–75', '76–150', '151+'];
  const siteBuckets = order
    .filter((label) => bucketMap.has(label))
    .map((label) => ({ label, count: bucketMap.get(label) ?? 0 }));

  if (segment !== 'glamping') {
    return { topUnitTypes, siteBuckets };
  }
  const glampingRows = rows.filter((r) => r.raw);
  const total = glampingRows.length;
  const rvFieldPresence: NonNullable<SiteUnitAnalysisSection['rvFieldPresence']> = [];
  if (total > 0) {
    for (const field of GLAMPING_RV_SITE_COLUMNS) {
      const filled = glampingRows.filter((r) => hasMeaningfulCell(r.raw?.[field])).length;
      if (filled === 0) continue;
      rvFieldPresence.push({
        field,
        label: humanizeColumnKey(field),
        pct: Math.round((filled / total) * 1000) / 10,
        withData: total,
      });
    }
  }
  return { topUnitTypes, siteBuckets, rvFieldPresence };
}

export interface MarketReportSectionsEnrichment {
  demandDrivers?: DemandDriversResult | null;
  countyMetrics?: CountyMetricsResult | null;
  opportunityScore?: OpportunityScore | null;
}

export function buildMarketReportSections(
  segment: MarketReportSegment,
  radiusMiles: number,
  rows: CohortPropertyRow[],
  enrichment: MarketReportSectionsEnrichment = {}
): MarketReportSections {
  const summary = buildMarketSummary(segment, radiusMiles, rows);
  const enrichedSummary: MarketSummarySection = {
    ...summary,
    demandDrivers: enrichment.demandDrivers ?? null,
    countyMetrics: enrichment.countyMetrics ?? null,
    opportunityScore: enrichment.opportunityScore ?? null,
  };
  return {
    marketSummary: enrichedSummary,
    propertyAnalysis: buildPropertyAnalysis(rows),
    rateAnalysis: buildRateAnalysis(rows),
    amenityAnalysis: buildAmenityAnalysis(segment, rows),
    siteUnitAnalysis: buildSiteUnitAnalysis(segment, rows),
  };
}
