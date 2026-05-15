/**
 * Collapse rate-tier / duplicate rows to one canonical row per (source, property, unit_type).
 *
 * Rationale: tables like `all_glamping_properties` average 1.62 rows per property — many
 * "extra" rows are different rate tiers of the same unit type (e.g. 7 Tiny Home rows
 * for Camp Fimfo at $162–$499) or near-duplicates (43 vs 44 total_sites). Counting them
 * as separate properties overstates competitor density and confuses ADR rollups.
 *
 * Dedupe rules per group:
 *   - rate_avg          → MEDIAN of non-null rates           (canonical)
 *   - rate_low/high     → MIN / MAX of non-null rates        (preserves rate range)
 *   - quantity_of_units → MAX of non-null values             (avoids inflating from rate-tier rows)
 *   - property_total_sites → MAX of non-null values          (deals with 43-vs-44 dupes)
 *   - seasonal rates    → MEDIAN of non-null per-season values
 *   - occupancy         → MEDIAN of non-null
 *   - distance_miles    → MIN (closest representative)
 *   - lat/lng           → from the row with the smallest distance_miles
 *   - city/state/url/operating_season_months/property_type → first non-empty
 *   - raw               → first non-null `raw` blob (amenity columns are property-wide)
 *
 * Keeps the existing `CohortPropertyRow` shape so downstream aggregation in
 * {@link buildMarketReportSections} is unchanged.
 *
 * **Sage (`all_glamping_properties`):** cohort assembly uses
 * {@link dedupeCohortRowsPreservingSage} instead of this function alone, so every
 * Supabase row is kept (no rate-tier collapse) while other sources still dedupe here.
 */

import { medianSorted, parseNum } from "@/lib/market-report/normalize";
import type { CohortPropertyRow } from "@/lib/market-report/types";

const UNSPECIFIED_UNIT_TYPE = "Unspecified";

/** Hide this bucket from unit-type charts and ranked unit-type tables (not operator-useful). */
export function isOmittedUnitTypeForCharts(unitType: string | null | undefined): boolean {
  return String(unitType ?? "").trim().toLowerCase() === UNSPECIFIED_UNIT_TYPE.toLowerCase();
}

/** Stable canonical key. Source is included so a property listed in two tables stays separate. */
export function dedupeKey(row: CohortPropertyRow): string {
  const name = String(row.property_name ?? "")
    .trim()
    .toLowerCase();
  const state = String(row.state ?? "")
    .trim()
    .toUpperCase();
  const unit =
    String(row.unit_type ?? "")
      .trim()
      .toLowerCase() || UNSPECIFIED_UNIT_TYPE.toLowerCase();
  return `${row.source}|${name}|${state}|${unit}`;
}

function medianOf(values: (number | null | undefined)[]): number | null {
  const sorted = values
    .map((v) => parseNum(v))
    .filter((n): n is number => n != null && Number.isFinite(n))
    .sort((a, b) => a - b);
  return medianSorted(sorted);
}

function maxOf(values: (number | null | undefined)[]): number | null {
  let max: number | null = null;
  for (const v of values) {
    const n = parseNum(v);
    if (n == null || !Number.isFinite(n)) continue;
    if (max == null || n > max) max = n;
  }
  return max;
}

function minOf(values: (number | null | undefined)[]): number | null {
  let min: number | null = null;
  for (const v of values) {
    const n = parseNum(v);
    if (n == null || !Number.isFinite(n)) continue;
    if (min == null || n < min) min = n;
  }
  return min;
}

function minDistanceMiles(group: CohortPropertyRow[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const g of group) {
    const d = g.distance_miles;
    if (typeof d === "number" && Number.isFinite(d) && d < min) min = d;
  }
  return Number.isFinite(min) ? min : 0;
}

function firstNonEmptyString(values: (string | null | undefined)[]): string {
  for (const v of values) {
    if (v != null && String(v).trim().length > 0) return String(v);
  }
  return "";
}

function firstNonNullString(
  values: (string | null | undefined)[],
): string | null {
  const v = firstNonEmptyString(values);
  return v.length > 0 ? v : null;
}

function pickClosestCoords(group: CohortPropertyRow[]): {
  lat: number;
  lng: number;
} {
  const closest = [...group].sort(
    (a, b) => a.distance_miles - b.distance_miles,
  )[0]!;
  return { lat: closest.geo_lat, lng: closest.geo_lng };
}

export interface DedupedCohortRow extends CohortPropertyRow {
  /** Number of raw rows collapsed into this canonical row. */
  rateTierRows: number;
  /** Min ADR among the rate-tier rows that fed this canonical row. */
  rateLow: number | null;
  /** Max ADR among the rate-tier rows that fed this canonical row. */
  rateHigh: number | null;
}

export interface DedupeStats {
  rawRowCount: number;
  collapsedRowCount: number;
  distinctProperties: number;
  bySource: Record<string, { raw: number; collapsed: number }>;
}

export interface DedupeResult {
  rows: DedupedCohortRow[];
  stats: DedupeStats;
}

/**
 * Collapse a flat list of `CohortPropertyRow` to one canonical row per
 * (source, property, state, unit_type). See module docstring for the per-field rules.
 */
export function dedupeCohortRows(rows: CohortPropertyRow[]): DedupeResult {
  const groups = new Map<string, CohortPropertyRow[]>();
  const rawBySource = new Map<string, number>();
  for (const r of rows) {
    rawBySource.set(r.source, (rawBySource.get(r.source) ?? 0) + 1);
    const key = dedupeKey(r);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const collapsed: DedupedCohortRow[] = [];
  const collapsedBySource = new Map<string, number>();
  const distinctProps = new Set<string>();

  for (const [, group] of groups) {
    const head = group[0]!;
    const { lat, lng } = pickClosestCoords(group);
    const minDistance = minDistanceMiles(group);
    const rateValues = group.map((g) => g.rate_avg);
    const canonical: DedupedCohortRow = {
      source: head.source,
      sourceId: firstNonNullString(group.map((g) => g.sourceId)),
      property_name: head.property_name,
      city: firstNonEmptyString(group.map((g) => g.city)),
      state: head.state,
      property_type: firstNonNullString(group.map((g) => g.property_type)),
      unit_type:
        firstNonNullString(group.map((g) => g.unit_type)) ??
        UNSPECIFIED_UNIT_TYPE,
      property_total_sites: maxOf(group.map((g) => g.property_total_sites)),
      quantity_of_units: maxOf(group.map((g) => g.quantity_of_units)),
      distance_miles: Math.round(minDistance * 10) / 10,
      geo_lat: lat,
      geo_lng: lng,
      rate_avg: medianOf(rateValues),
      winter_weekday: medianOf(group.map((g) => g.winter_weekday)),
      winter_weekend: medianOf(group.map((g) => g.winter_weekend)),
      spring_weekday: medianOf(group.map((g) => g.spring_weekday)),
      spring_weekend: medianOf(group.map((g) => g.spring_weekend)),
      summer_weekday: medianOf(group.map((g) => g.summer_weekday)),
      summer_weekend: medianOf(group.map((g) => g.summer_weekend)),
      fall_weekday: medianOf(group.map((g) => g.fall_weekday)),
      fall_weekend: medianOf(group.map((g) => g.fall_weekend)),
      occupancy: medianOf(group.map((g) => g.occupancy)),
      operating_season_months: firstNonNullString(
        group.map((g) => g.operating_season_months),
      ),
      url: firstNonNullString(group.map((g) => g.url)),
      raw: group.find((g) => g.raw != null)?.raw ?? null,
      rateTierRows: group.length,
      rateLow: minOf(rateValues),
      rateHigh: maxOf(rateValues),
    };
    collapsed.push(canonical);
    collapsedBySource.set(
      canonical.source,
      (collapsedBySource.get(canonical.source) ?? 0) + 1,
    );
    distinctProps.add(
      `${canonical.source}|${String(canonical.property_name ?? "").toLowerCase()}|${String(canonical.state ?? "")}`,
    );
  }

  collapsed.sort((a, b) => a.distance_miles - b.distance_miles);

  const bySource: DedupeStats["bySource"] = {};
  const allSources = new Set([
    ...rawBySource.keys(),
    ...collapsedBySource.keys(),
  ]);
  for (const src of allSources) {
    bySource[src] = {
      raw: rawBySource.get(src) ?? 0,
      collapsed: collapsedBySource.get(src) ?? 0,
    };
  }

  return {
    rows: collapsed,
    stats: {
      rawRowCount: rows.length,
      collapsedRowCount: collapsed.length,
      distinctProperties: distinctProps.size,
      bySource,
    },
  };
}

const SAGE_GLAMPING_SOURCE: CohortPropertyRow['source'] = 'all_glamping_properties';

function sageRowAsDedupedShape(r: CohortPropertyRow): DedupedCohortRow {
  return {
    ...r,
    rateTierRows: 1,
    rateLow: r.rate_avg,
    rateHigh: r.rate_avg,
  };
}

function distinctPropertyTriples(rows: DedupedCohortRow[]): number {
  const set = new Set<string>();
  for (const r of rows) {
    set.add(
      `${r.source}|${String(r.property_name ?? '').toLowerCase()}|${String(r.state ?? '')}`,
    );
  }
  return set.size;
}

/**
 * Like {@link dedupeCohortRows}, but **`all_glamping_properties` rows are not merged** —
 * every Sage table row is emitted as its own `DedupedCohortRow` (each with
 * `rateTierRows: 1` and `rateLow`/`rateHigh` = that row’s `rate_avg`). All other
 * sources are deduped normally.
 */
export function dedupeCohortRowsPreservingSage(rows: CohortPropertyRow[]): DedupeResult {
  const sage: CohortPropertyRow[] = [];
  const nonSage: CohortPropertyRow[] = [];
  for (const r of rows) {
    if (r.source === SAGE_GLAMPING_SOURCE) sage.push(r);
    else nonSage.push(r);
  }

  const { rows: dedupedNonSage, stats: nonSageStats } = dedupeCohortRows(nonSage);
  const sageOut = sage.map(sageRowAsDedupedShape);
  const combined = [...sageOut, ...dedupedNonSage];
  combined.sort((a, b) => a.distance_miles - b.distance_miles);

  const bySource: DedupeStats['bySource'] = { ...nonSageStats.bySource };
  if (sage.length > 0) {
    bySource[SAGE_GLAMPING_SOURCE] = {
      raw: sage.length,
      collapsed: sageOut.length,
    };
  }

  return {
    rows: combined,
    stats: {
      rawRowCount: rows.length,
      collapsedRowCount: sageOut.length + nonSageStats.collapsedRowCount,
      distinctProperties: distinctPropertyTriples(combined),
      bySource,
    },
  };
}
