/**
 * Glamping size-tier fold: Sage rows may contribute 2025 ARDR without occupancy (same as trends).
 * Resort size uses max(property_total_sites, quantity_of_units); tier means are one ADR per property
 * (median across site rows) so duplicate inventory rows do not overweight the same resort.
 */

import { normalizeState } from '@/lib/anchor-point-insights/utils';
import {
  parseCampspotNumber,
  parseCampspotOccupancyPercent,
} from '@/lib/rv-industry-overview/campspot-field-parse';
import {
  passesStandardCampspotOccupancyPercent,
  passesStandardCampspotRetailRateUsd,
} from '@/lib/rv-industry-overview/campspot-rv-overview-standard-filters';
import {
  createSizeTierFoldState,
  finalizeSizeTierFoldState,
  type CampspotSizeTierAggRow as BaseCampspotSizeTierAggRow,
  type SizeTierChartRow,
  type SizeTierKey,
} from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';

export type { SizeTierChartRow } from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';

/** Size-tier fold input: annual rate fields plus property key for per-resort aggregation. */
export type CampspotSizeTierAggRow = BaseCampspotSizeTierAggRow & {
  property_name?: string | null;
  city?: string | null;
  state?: string | null;
};

/** Glamping small tier: 3–9 units/sites. */
export const GLAMPING_SIZE_TIER_SMALL_MIN = 3;
export const GLAMPING_SIZE_TIER_SMALL_MAX = 9;
export const GLAMPING_SIZE_TIER_MEDIUM_MIN = 10;
export const GLAMPING_SIZE_TIER_MEDIUM_MAX = 24;
export const GLAMPING_SIZE_TIER_LARGE_MIN = 25;

type SizeTierBucket = ReturnType<typeof createSizeTierFoldState>;

type PropertySizeSlot = {
  nSitesMax: number;
  tier: SizeTierKey;
  adr2024: number[];
  adr2025: number[];
  occ2024: number[];
  occ2025: number[];
};

export type GlampingSizeTierFoldState = {
  buckets: SizeTierBucket;
  byProperty: Map<string, PropertySizeSlot>;
};

export function createGlampingSizeTierFoldState(): GlampingSizeTierFoldState {
  return {
    buckets: createSizeTierFoldState(),
    byProperty: new Map(),
  };
}

export function finalizeGlampingSizeTierFoldState(
  state: GlampingSizeTierFoldState
): SizeTierChartRow[] {
  for (const slot of state.byProperty.values()) {
    const b = state.buckets[slot.tier];
    const adr4 = medianRounded(slot.adr2024);
    const adr5 = medianRounded(slot.adr2025);
    const occ4 = medianRounded(slot.occ2024);
    const occ5 = medianRounded(slot.occ2025);
    if (adr4 != null) b.adr2024.push(adr4);
    if (adr5 != null) b.adr2025.push(adr5);
    if (occ4 != null) b.occ2024.push(occ4);
    if (occ5 != null) b.occ2025.push(occ5);
  }
  return finalizeSizeTierFoldState(state.buckets);
}

/**
 * Site count for tier assignment: higher of property_total_sites and quantity_of_units.
 * Per-site Hipcamp rows almost always have quantity_of_units = 1; do not treat that as
 * resort size when property_total_sites is missing (matches comps export rules).
 */
export function parseGlampingPropertySiteCount(
  propertyTotal: unknown,
  quantity: unknown
): number | null {
  const pts = parseCampspotNumber(propertyTotal);
  const qty = parseCampspotNumber(quantity);
  const candidates: number[] = [];
  if (pts != null && pts >= 1) candidates.push(Math.round(pts));
  if (qty != null && qty > 1) candidates.push(Math.round(qty));
  if (candidates.length === 0) {
    if (qty != null && qty >= 1) return Math.round(qty);
    return null;
  }
  return Math.max(...candidates);
}

/**
 * Glamping resort size tiers (unit / site count). RV overview uses 25–49 / 50–99 / 100+.
 */
export function glampingSiteCountToSizeTier(sites: number): SizeTierKey | null {
  if (sites >= GLAMPING_SIZE_TIER_LARGE_MIN) return 'large';
  if (sites >= GLAMPING_SIZE_TIER_MEDIUM_MIN && sites <= GLAMPING_SIZE_TIER_MEDIUM_MAX) {
    return 'medium';
  }
  if (sites >= GLAMPING_SIZE_TIER_SMALL_MIN && sites <= GLAMPING_SIZE_TIER_SMALL_MAX) {
    return 'small';
  }
  return null;
}

function glampingPropertyKey(row: CampspotSizeTierAggRow): string | null {
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const st = normalizeState(row.state);
  if (!name || !st) return null;
  return `${name}|${st}|${city}`;
}

function medianRounded(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(median * 100) / 100;
}

function mergePropertySlot(
  slot: PropertySizeSlot,
  nSites: number,
  tier: SizeTierKey
): void {
  if (nSites > slot.nSitesMax) {
    slot.nSitesMax = nSites;
    slot.tier = tier;
  }
}

export function rowContributesToGlampingResortSize(
  row: CampspotSizeTierAggRow,
  options?: { adrOnly2025?: boolean; adrOnly2024?: boolean }
): boolean {
  const nSites = parseGlampingPropertySiteCount(row.property_total_sites, row.quantity_of_units);
  if (nSites == null || !glampingSiteCountToSizeTier(nSites)) return false;

  const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
  const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  const paired2024 =
    o4 != null &&
    a4 != null &&
    passesStandardCampspotOccupancyPercent(o4) &&
    passesStandardCampspotRetailRateUsd(a4);
  const adrOnly2024 =
    options?.adrOnly2024 === true &&
    a4 != null &&
    passesStandardCampspotRetailRateUsd(a4);

  const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  const a5 = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  const paired2025 =
    o5 != null &&
    a5 != null &&
    passesStandardCampspotOccupancyPercent(o5) &&
    passesStandardCampspotRetailRateUsd(a5);
  const adrOnly2025 =
    options?.adrOnly2025 === true &&
    a5 != null &&
    passesStandardCampspotRetailRateUsd(a5);

  return paired2024 || adrOnly2024 || paired2025 || adrOnly2025;
}

function foldSizeTierRow(
  state: GlampingSizeTierFoldState,
  row: CampspotSizeTierAggRow,
  options: { adrOnly2025: boolean; adrOnly2024: boolean }
): void {
  const nSites = parseGlampingPropertySiteCount(row.property_total_sites, row.quantity_of_units);
  if (nSites == null) return;
  const tier = glampingSiteCountToSizeTier(nSites);
  if (!tier) return;

  const pk = glampingPropertyKey(row);
  if (!pk) return;

  let slot = state.byProperty.get(pk);
  if (!slot) {
    slot = {
      nSitesMax: nSites,
      tier,
      adr2024: [],
      adr2025: [],
      occ2024: [],
      occ2025: [],
    };
    state.byProperty.set(pk, slot);
  } else {
    mergePropertySlot(slot, nSites, tier);
  }

  const o4 = parseCampspotOccupancyPercent(row.occupancy_rate_2024);
  const a4 = parseCampspotNumber(row.avg_retail_daily_rate_2024);
  const paired2024 =
    o4 != null &&
    a4 != null &&
    passesStandardCampspotOccupancyPercent(o4) &&
    passesStandardCampspotRetailRateUsd(a4);

  if (paired2024) {
    slot.occ2024.push(o4);
    slot.adr2024.push(a4);
  } else if (options.adrOnly2024 && a4 != null && passesStandardCampspotRetailRateUsd(a4)) {
    slot.adr2024.push(a4);
  }

  const o5 = parseCampspotOccupancyPercent(row.occupancy_rate_2025);
  const a5 = parseCampspotNumber(row.avg_retail_daily_rate_2025);
  const paired2025 =
    o5 != null &&
    a5 != null &&
    passesStandardCampspotOccupancyPercent(o5) &&
    passesStandardCampspotRetailRateUsd(a5);

  if (paired2025) {
    slot.occ2025.push(o5);
    slot.adr2025.push(a5);
  } else if (options.adrOnly2025 && a5 != null && passesStandardCampspotRetailRateUsd(a5)) {
    slot.adr2025.push(a5);
  }
}

export function foldGlampingSizeTierRows(
  state: GlampingSizeTierFoldState,
  rows: CampspotSizeTierAggRow[],
  options?: { adrOnly2025?: boolean; adrOnly2024?: boolean }
): void {
  const adrOnly2025 = options?.adrOnly2025 === true;
  const adrOnly2024 = options?.adrOnly2024 === true;
  for (const row of rows) {
    foldSizeTierRow(state, row, { adrOnly2025, adrOnly2024 });
  }
}
