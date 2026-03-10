/**
 * Aggregation logic for Anchor Point Insights
 */

import {
  calculateDistance,
  getDistanceBandFromBands,
  getBandLabelsFromThresholds,
  estimateDriveTimeHours,
  DEFAULT_BAND_THRESHOLDS,
} from '@/lib/proximity-utils';
import type {
  NormalizedProperty,
  PropertyWithProximity,
  Anchor,
  PropertySource,
} from './types';
import {
  DEGREES_PRE_FILTER,
  COORD_PRECISION,
  MAX_PROPERTY_SAMPLE,
  MAX_ANCHORS_WITH_COUNTS,
  MAX_STATE_ROWS,
  MAP_MARKER_LIMIT,
  MAP_DISTANCE_MI,
} from './constants';
import { normalizeState } from './utils';
import type { CountyLookups } from './fetch-county-data';

function toOccupancyPct(v: number | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function coordKey(p: { lat: number; lon: number }): string {
  return `${Math.round(p.lat * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION},${Math.round(p.lon * 10 ** COORD_PRECISION) / 10 ** COORD_PRECISION}`;
}

function winterRate(p: NormalizedProperty): number {
  const r = p.winter_weekday ?? p.winter_weekend;
  return r != null && !isNaN(r) ? r : -1;
}

/**
 * Hipcamp has one row per unit type (Tent Site, Cabin, Yurt, etc.). Multiple rows
 * at the same location = same property. Use the MAX winter rate per property so
 * we represent the premium product (e.g. Cabin $200) rather than a random or
 * low-rate unit (e.g. Tent Site $50) which was pulling the average down.
 */
export function aggregateHipcampByPropertyMaxRate(properties: NormalizedProperty[]): NormalizedProperty[] {
  const hipcamp = properties.filter((p) => p.source === 'hipcamp');
  const nonHipcamp = properties.filter((p) => p.source !== 'hipcamp');
  const byCoord = new Map<string, NormalizedProperty[]>();
  for (const p of hipcamp) {
    const key = coordKey(p);
    if (!byCoord.has(key)) byCoord.set(key, []);
    byCoord.get(key)!.push(p);
  }
  const aggregated: NormalizedProperty[] = [];
  for (const group of byCoord.values()) {
    const best = group.reduce((a, b) => (winterRate(b) > winterRate(a) ? b : a));
    aggregated.push(best);
  }
  return [...nonHipcamp, ...aggregated];
}

/** Deduplicate properties by rounded coordinates (keeps first seen) */
export function deduplicateByCoords(properties: NormalizedProperty[]): NormalizedProperty[] {
  const seenCoords = new Set<string>();
  const deduped: NormalizedProperty[] = [];
  for (const p of properties) {
    const key = coordKey(p);
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);
    deduped.push(p);
  }
  return deduped;
}

/** Normalize property name for cross-source deduplication: lowercase, trim, collapse spaces */
function normalizeNameForDedup(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '');
}

/** Cross-source deduplication by normalized name + state. Keeps one per (name, state) across sources. */
export function deduplicateByNameAndState(properties: NormalizedProperty[]): NormalizedProperty[] {
  const byKey = new Map<string, NormalizedProperty>();
  const noName: NormalizedProperty[] = [];
  for (const p of properties) {
    const normName = normalizeNameForDedup(p.property_name);
    if (!normName || normName === 'unknown') {
      noName.push(p);
      continue;
    }
    const stateKey = (normalizeState(p.state) ?? 'unknown').toUpperCase();
    const key = `${normName}|${stateKey}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, p);
      continue;
    }
    // Prefer property with winter rate; then prefer hipcamp (has year-specific occupancy)
    const pHasRate = (p.winter_weekday ?? p.winter_weekend) != null;
    const existingHasRate = (existing.winter_weekday ?? existing.winter_weekend) != null;
    if (pHasRate && !existingHasRate) byKey.set(key, p);
    else if (pHasRate === existingHasRate && p.source === 'hipcamp' && existing.source === 'sage_glamping')
      byKey.set(key, p);
  }
  const coordsSeen = new Set<string>();
  const deduped = Array.from(byKey.values()).filter((p) => {
    const k = coordKey(p);
    if (coordsSeen.has(k)) return false;
    coordsSeen.add(k);
    return true;
  });
  for (const p of noName) {
    const k = coordKey(p);
    if (!coordsSeen.has(k)) {
      coordsSeen.add(k);
      deduped.push(p);
    }
  }
  return deduped;
}

/** Add distance, band, drive time, nearest anchor to each property */
export function computeProximity(
  properties: NormalizedProperty[],
  anchors: Anchor[],
  distanceBandThresholds?: number[] | null
): PropertyWithProximity[] {
  const thresholds = distanceBandThresholds && distanceBandThresholds.length > 0
    ? distanceBandThresholds
    : DEFAULT_BAND_THRESHOLDS;
  const withProximity: PropertyWithProximity[] = [];
  for (const p of properties) {
    const nearbyAnchors = anchors.filter(
      (a) =>
        Math.abs(a.lat - p.lat) <= DEGREES_PRE_FILTER &&
        Math.abs(a.lon - p.lon) <= DEGREES_PRE_FILTER
    );
    const anchorsToCheck = nearbyAnchors.length > 0 ? nearbyAnchors : anchors;
    let minDist = Infinity;
    let nearestName = '';
    for (const anchor of anchorsToCheck) {
      const d = calculateDistance(p.lat, p.lon, anchor.lat, anchor.lon);
      if (d < minDist) {
        minDist = d;
        nearestName = anchor.name;
      }
    }
    if (minDist === Infinity) continue;
    const band = getDistanceBandFromBands(minDist, thresholds);
    withProximity.push({
      ...p,
      distance_miles: Math.round(minDist * 10) / 10,
      distance_band: band,
      drive_time_hours: Math.round(estimateDriveTimeHours(minDist) * 10) / 10,
      nearest_anchor: nearestName,
    });
  }
  return withProximity;
}

/** Filter to properties nearest the selected anchor */
export function applyAnchorFilter(
  withProximity: PropertyWithProximity[],
  anchors: Anchor[],
  anchorId: number | null,
  anchorSlug: string | null,
  isNationalParks: boolean
): {
  proximityForAggregation: PropertyWithProximity[];
  selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null;
} {
  let selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null = null;
  let proximityForAggregation = withProximity;

  if (isNationalParks && anchorSlug) {
    const match = anchors.find((a) => a.slug === anchorSlug);
    if (match) {
      selectedAnchor = { id: match.id, name: match.name, lat: match.lat, lon: match.lon, slug: match.slug };
      proximityForAggregation = withProximity.filter((p) => p.nearest_anchor === match.name);
    }
  } else if (!isNationalParks && anchorId != null && !isNaN(anchorId)) {
    const match = anchors.find((a) => a.id === anchorId);
    if (match) {
      selectedAnchor = { id: match.id, name: match.name, lat: match.lat, lon: match.lon };
      proximityForAggregation = withProximity.filter((p) => p.nearest_anchor === match.name);
    }
  }

  return { proximityForAggregation, selectedAnchor };
}

type BandEntry = {
  sumWd: number; sumWe: number; countWd: number; countWe: number;
  sumSpringWd: number; sumSpringWe: number; countSpringWd: number; countSpringWe: number;
  sumSummerWd: number; sumSummerWe: number; countSummerWd: number; countSummerWe: number;
  sumFallWd: number; sumFallWe: number; countFallWd: number; countFallWe: number;
  count: number;
  sumOcc2024: number; countOcc2024: number;
  sumOcc2025: number; countOcc2025: number;
  sumOcc2026: number; countOcc2026: number;
};

export function aggregateByBand(
  proximityForAggregation: PropertyWithProximity[],
  distanceBandThresholds?: number[] | null
) {
  const thresholds = distanceBandThresholds && distanceBandThresholds.length > 0
    ? distanceBandThresholds
    : DEFAULT_BAND_THRESHOLDS;
  const bandLabels = getBandLabelsFromThresholds(thresholds);
  const bandMap = new Map<string, BandEntry>();
  for (const b of bandLabels) {
    bandMap.set(b, {
      sumWd: 0, sumWe: 0, countWd: 0, countWe: 0,
      sumSpringWd: 0, sumSpringWe: 0, countSpringWd: 0, countSpringWe: 0,
      sumSummerWd: 0, sumSummerWe: 0, countSummerWd: 0, countSummerWe: 0,
      sumFallWd: 0, sumFallWe: 0, countFallWd: 0, countFallWe: 0,
      count: 0,
      sumOcc2024: 0, countOcc2024: 0, sumOcc2025: 0, countOcc2025: 0, sumOcc2026: 0, countOcc2026: 0,
    });
  }
  for (const p of proximityForAggregation) {
    const entry = bandMap.get(p.distance_band);
    if (!entry) continue;
    entry.count++;
    if (p.winter_weekday !== null) { entry.sumWd += p.winter_weekday; entry.countWd++; }
    if (p.winter_weekend !== null) { entry.sumWe += p.winter_weekend; entry.countWe++; }
    if (p.spring_weekday !== null) { entry.sumSpringWd += p.spring_weekday; entry.countSpringWd++; }
    if (p.spring_weekend !== null) { entry.sumSpringWe += p.spring_weekend; entry.countSpringWe++; }
    if (p.summer_weekday !== null) { entry.sumSummerWd += p.summer_weekday; entry.countSummerWd++; }
    if (p.summer_weekend !== null) { entry.sumSummerWe += p.summer_weekend; entry.countSummerWe++; }
    if (p.fall_weekday !== null) { entry.sumFallWd += p.fall_weekday; entry.countFallWd++; }
    if (p.fall_weekend !== null) { entry.sumFallWe += p.fall_weekend; entry.countFallWe++; }
    const occ2024 = toOccupancyPct(p.occupancy_2024);
    if (occ2024 !== null) { entry.sumOcc2024 += occ2024; entry.countOcc2024++; }
    const occ2025 = toOccupancyPct(p.occupancy_2025);
    if (occ2025 !== null) { entry.sumOcc2025 += occ2025; entry.countOcc2025++; }
    const occ2026 = toOccupancyPct(p.occupancy_2026);
    if (occ2026 !== null) { entry.sumOcc2026 += occ2026; entry.countOcc2026++; }
  }
  return bandLabels.map((band) => {
    const e = bandMap.get(band)!;
    return {
      band,
      count: e.count,
      avg_winter_weekday: e.countWd > 0 ? Math.round(e.sumWd / e.countWd) : null,
      avg_winter_weekend: e.countWe > 0 ? Math.round(e.sumWe / e.countWe) : null,
      avg_spring_weekday: e.countSpringWd > 0 ? Math.round(e.sumSpringWd / e.countSpringWd) : null,
      avg_spring_weekend: e.countSpringWe > 0 ? Math.round(e.sumSpringWe / e.countSpringWe) : null,
      avg_summer_weekday: e.countSummerWd > 0 ? Math.round(e.sumSummerWd / e.countSummerWd) : null,
      avg_summer_weekend: e.countSummerWe > 0 ? Math.round(e.sumSummerWe / e.countSummerWe) : null,
      avg_fall_weekday: e.countFallWd > 0 ? Math.round(e.sumFallWd / e.countFallWd) : null,
      avg_fall_weekend: e.countFallWe > 0 ? Math.round(e.sumFallWe / e.countFallWe) : null,
      avg_occupancy_2024: e.countOcc2024 > 0 ? Math.round(e.sumOcc2024 / e.countOcc2024) : null,
      avg_occupancy_2025: e.countOcc2025 > 0 ? Math.round(e.sumOcc2025 / e.countOcc2025) : null,
      avg_occupancy_2026: e.countOcc2026 > 0 ? Math.round(e.sumOcc2026 / e.countOcc2026) : null,
    };
  });
}

function toUnits(p: PropertyWithProximity): number {
  const u = p.quantity_of_units ?? p.property_total_sites ?? null;
  return typeof u === 'number' && !isNaN(u) ? u : 0;
}

export function aggregateBySource(proximityForAggregation: PropertyWithProximity[]) {
  const sources: PropertySource[] = ['hipcamp', 'sage_glamping'];
  const sourceMap = new Map<PropertySource, { count: number; units: number; sumRate: number; rateCount: number }>();
  for (const s of sources) sourceMap.set(s, { count: 0, units: 0, sumRate: 0, rateCount: 0 });
  for (const p of proximityForAggregation) {
    const e = sourceMap.get(p.source)!;
    e.count++;
    e.units += toUnits(p);
    const rate = p.winter_weekday ?? p.winter_weekend;
    if (rate !== null) { e.sumRate += rate; e.rateCount++; }
  }
  return sources.map((source) => {
    const e = sourceMap.get(source)!;
    return {
      source: source === 'hipcamp' ? 'Hipcamp' : 'Sage Glamping',
      count: e.count,
      units: e.units,
      count_with_winter_rates: e.rateCount,
      avg_winter_rate: e.rateCount > 0 ? Math.round(e.sumRate / e.rateCount) : null,
    };
  });
}

function getPropertyRateForState(p: PropertyWithProximity, useYearAvg: boolean): number | null {
  if (useYearAvg) {
    const rates = [
      p.winter_weekday, p.winter_weekend,
      p.spring_weekday, p.spring_weekend,
      p.summer_weekday, p.summer_weekend,
      p.fall_weekday, p.fall_weekend,
    ].filter((v): v is number => v != null && !isNaN(v));
    if (rates.length === 0) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }
  return p.winter_weekday ?? p.winter_weekend ?? null;
}

export function aggregateByState(
  proximityForAggregation: PropertyWithProximity[],
  { statePopulationLookup, stateGDPLookup }: CountyLookups,
  useYearAvgRate: boolean = false
) {
  const stateMap = new Map<string, { count: number; sumRate: number; rateCount: number }>();
  for (const p of proximityForAggregation) {
    const state = normalizeState(p.state) ?? 'Unknown';
    let e = stateMap.get(state);
    if (!e) { e = { count: 0, sumRate: 0, rateCount: 0 }; stateMap.set(state, e); }
    e.count++;
    const rate = getPropertyRateForState(p, useYearAvgRate);
    if (rate !== null) { e.sumRate += rate; e.rateCount++; }
  }
  return Array.from(stateMap.entries())
    .map(([state, e]) => {
      const pop = state !== 'Unknown' ? statePopulationLookup[state.toUpperCase()] : null;
      const gdp = state !== 'Unknown' ? stateGDPLookup[state.toUpperCase()] : null;
      const avgRate = e.rateCount > 0 ? Math.round(e.sumRate / e.rateCount) : null;
      return {
        state,
        count: e.count,
        avg_winter_rate: useYearAvgRate ? null : avgRate,
        avg_rate: useYearAvgRate ? avgRate : null,
        population_2020: pop?.population_2020 ?? null,
        gdp_2023: gdp?.gdp_2023 ?? null,
      };
    })
    .sort((a, b) => {
      const ra = (a.avg_rate ?? a.avg_winter_rate) ?? -1;
      const rb = (b.avg_rate ?? b.avg_winter_rate) ?? -1;
      return rb - ra;
    })
    .slice(0, MAX_STATE_ROWS);
}

export function buildTrends(proximityForAggregation: PropertyWithProximity[]) {
  // Use only properties with BOTH 2024 and 2025 rates for apples-to-apples YoY comparison
  const withBothYears = proximityForAggregation.filter((p) => {
    const r24 = p.avg_rate_2024;
    const r25 = p.avg_rate_2025;
    return r24 != null && r25 != null && !isNaN(r24) && !isNaN(r25);
  });
  if (withBothYears.length === 0) return null;

  const trendRates: { year: number; avg: number; count: number }[] = [];
  for (const y of [2024, 2025]) {
    const key = `avg_rate_${y}` as keyof PropertyWithProximity;
    const vals = withBothYears.map((p) => p[key] as number).filter((v) => !isNaN(v));
    if (vals.length > 0) {
      trendRates.push({
        year: y,
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length,
      });
    }
  }
  return trendRates.length >= 2 ? trendRates.sort((a, b) => a.year - b.year) : null;
}

export function buildPropertySample(
  proximityForAggregation: PropertyWithProximity[],
  { statePopulationLookup, stateGDPLookup }: CountyLookups,
  withinMiThreshold: number = 30
) {
  const within = proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold);
  return within
    .filter((p) => (p.winter_weekday ?? p.winter_weekend) !== null)
    .sort((a, b) => {
      const ra = a.winter_weekend ?? a.winter_weekday ?? 0;
      const rb = b.winter_weekend ?? b.winter_weekday ?? 0;
      return rb - ra;
    })
    .slice(0, MAX_PROPERTY_SAMPLE)
    .map((p) => {
      const stateKey = normalizeState(p.state);
      const pop = stateKey ? statePopulationLookup[stateKey] : null;
      const gdp = stateKey ? stateGDPLookup[stateKey] : null;
      return {
        property_name: p.property_name,
        source: p.source,
        state: stateKey ?? p.state,
        distance_miles: p.distance_miles,
        drive_time_hours: p.drive_time_hours,
        winter_weekday: p.winter_weekday,
        winter_weekend: p.winter_weekend,
        nearest_anchor: p.nearest_anchor,
        state_population_2020: pop?.population_2020 ?? null,
        state_gdp_2023: gdp?.gdp_2023 ?? null,
      };
    });
}

export function buildAnchorsWithCounts(
  anchors: Anchor[],
  withProximityAll: PropertyWithProximity[]
) {
  const anchorsWithCounts = anchors.map((anchor) => {
    const within15 = withProximityAll.filter((p) => {
      const d = calculateDistance(p.lat, p.lon, anchor.lat, anchor.lon);
      return d <= 15;
    });
    const units = within15.reduce((sum, p) => sum + toUnits(p), 0);
    return {
      anchor_id: anchor.id,
      anchor_name: anchor.name,
      anchor_slug: anchor.slug,
      property_count_15_mi: within15.length,
      units_count_15_mi: units,
    };
  });
  return anchorsWithCounts
    .filter((s) => s.units_count_15_mi > 0)
    .sort((a, b) => b.units_count_15_mi - a.units_count_15_mi)
    .slice(0, MAX_ANCHORS_WITH_COUNTS);
}

export function buildMapData(
  proximityForAggregation: PropertyWithProximity[],
  anchors: Anchor[],
  selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null,
  withinMiThreshold: number = 30
) {
  const mapDistanceMi = withinMiThreshold !== 30 ? withinMiThreshold : MAP_DISTANCE_MI;
  const mapProperties = proximityForAggregation
    .filter((p) => p.distance_miles <= mapDistanceMi)
    .slice(0, MAP_MARKER_LIMIT)
    .map((p) => ({
      lat: p.lat,
      lon: p.lon,
      property_name: p.property_name,
      source: p.source,
      state: p.state,
      distance_miles: p.distance_miles,
      drive_time_hours: p.drive_time_hours,
      nearest_anchor: p.nearest_anchor,
      property_type: p.property_type,
      unit_type: p.unit_type,
      property_total_sites: p.property_total_sites,
      quantity_of_units: p.quantity_of_units,
      winter_weekday: p.winter_weekday,
      winter_weekend: p.winter_weekend,
      spring_weekday: p.spring_weekday,
      spring_weekend: p.spring_weekend,
      summer_weekday: p.summer_weekday,
      summer_weekend: p.summer_weekend,
      fall_weekday: p.fall_weekday,
      fall_weekend: p.fall_weekend,
      occupancy_2024: p.occupancy_2024,
      occupancy_2025: p.occupancy_2025,
    }));
  const mapAnchors = selectedAnchor
    ? [{ id: selectedAnchor.id, name: selectedAnchor.name, lat: selectedAnchor.lat, lon: selectedAnchor.lon, slug: selectedAnchor.slug }]
    : anchors.map((a) => ({ id: a.id, name: a.name, lat: a.lat, lon: a.lon, slug: a.slug }));
  return { mapProperties, mapAnchors };
}

export function buildSummary(
  proximityForAggregation: PropertyWithProximity[],
  anchors: Anchor[],
  selectedAnchor: { id: number; name: string; lat: number; lon: number; slug?: string } | null,
  { statePopulationLookup, stateGDPLookup }: CountyLookups,
  withinMiThreshold: number = 30
) {
  const allRates = proximityForAggregation
    .map((p) => p.winter_weekday ?? p.winter_weekend)
    .filter((v): v is number => v !== null);
  const statesWithProps = new Set(
    proximityForAggregation.map((p) => normalizeState(p.state)).filter((s): s is string => s != null)
  );
  let totalStatePop = 0;
  let totalStateGDP = 0;
  let popCount = 0;
  let gdpCount = 0;
  for (const st of statesWithProps) {
    const pop = st ? statePopulationLookup[st] : null;
    const gdp = st ? stateGDPLookup[st] : null;
    if (pop?.population_2020) { totalStatePop += pop.population_2020; popCount++; }
    if (gdp?.gdp_2023) { totalStateGDP += gdp.gdp_2023; gdpCount++; }
  }
  const propertiesWithWinterRates = allRates.length;
  const withinCount = proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold).length;
  const totalUnits = proximityForAggregation.reduce((sum, p) => sum + toUnits(p), 0);
  const withinProps = proximityForAggregation.filter((p) => p.distance_miles <= withinMiThreshold);
  const unitsWithinXMi = withinProps.reduce((sum, p) => sum + toUnits(p), 0);
  const unitsWithWinterRates = proximityForAggregation.reduce((sum, p) => {
    const hasRate = (p.winter_weekday ?? p.winter_weekend) != null;
    return sum + (hasRate ? toUnits(p) : 0);
  }, 0);
  return {
    total_properties: proximityForAggregation.length,
    total_units: totalUnits,
    properties_within_30_mi: withinCount,
    units_within_x_mi: unitsWithinXMi,
    within_mi_threshold: withinMiThreshold,
    properties_with_winter_rates: propertiesWithWinterRates,
    units_with_winter_rates: unitsWithWinterRates,
    anchors_count: selectedAnchor ? 1 : anchors.length,
    avg_winter_rate: propertiesWithWinterRates > 0 ? Math.round(allRates.reduce((a, b) => a + b, 0) / propertiesWithWinterRates) : null,
    data_sources: 2,
    avg_state_population_2020: popCount > 0 ? Math.round(totalStatePop / popCount) : null,
    combined_state_gdp_2023: gdpCount > 0 ? Math.round(totalStateGDP) : null,
  };
}
