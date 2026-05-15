/**
 * Collapse the per-(property × unit_type) rows in `propertyAnalysis.sample`
 * down to one row per property for the Property Analysis table, while
 * preserving every distinct unit_type for that property.
 *
 * Why grouping happens at the UI layer (not in the aggregator):
 *   - The DOCX export and CSV ZIP currently consume the per-unit-type rows
 *     and rely on each row having a single `unit_type`. Grouping in
 *     `aggregate.ts` would force a coordinated change across all consumers.
 *   - The cohort-CSV row-level export is the canonical "every row" surface;
 *     the on-page table is a property-level scan, so collapsing here matches
 *     analyst expectations.
 *   - `property_total_sites` for the grouped row is the max across merged
 *     sample lines (aligned with per-row MAX semantics when one property has
 *     multiple Sage inventory lines).
 *
 * Identity key: `(sourceLabel, property_name, city, state)`.
 *   - We deliberately key on `sourceLabel` (display) rather than `source`
 *     (internal) so the same physical property surfaced on, say, both Sage
 *     and Hipcamp still produces TWO rows in the table — analysts have asked
 *     to see source attribution side-by-side in past reviews.
 *   - Property name is matched case-insensitively after trimming + whitespace
 *     collapse so trivial casing/spacing differences don't split a property.
 */

import { mean } from '@/lib/market-report/normalize';
import type { PropertyAnalysisSection } from '@/lib/market-report/types';

export type PropertySampleRow = PropertyAnalysisSection['sample'][number];

export interface GroupedPropertyRow {
  /** Stable React key. */
  key: string;
  /** A representative row — first occurrence wins, so the closest-by-distance
   *  comes through (sample is sorted ascending by distance upstream). */
  rep: PropertySampleRow;
  /** Distinct unit types observed for this property, in first-seen order. */
  unitTypes: string[];
  /**
   * Mean of positive `rate_avg` values across merged sample rows for this
   * listing (one row per unit type in the cohort sample).
   */
  avgRetailDailyRate: number | null;
  /**
   * Sites for the property: max of `property_total_sites` across merged sample
   * rows (same property × multiple unit types can repeat the column; MAX matches
   * cohort dedupe and avoids losing a value when the closest row has null).
   */
  propertyTotalSites: number | null;
}

function normalizeName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePropertyTotalSites(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return n;
}

function mergePropertyTotalSites(
  current: number | null,
  candidate: number | null | undefined
): number | null {
  const v = normalizePropertyTotalSites(candidate);
  if (v == null) return current;
  if (current == null) return v;
  return Math.max(current, v);
}

type MutableGroup = {
  key: string;
  rep: PropertySampleRow;
  unitTypes: string[];
  rates: number[];
  propertyTotalSites: number | null;
};

export function groupPropertySample(rows: PropertySampleRow[]): GroupedPropertyRow[] {
  const map = new Map<string, MutableGroup>();
  for (const row of rows) {
    const idKey = [
      row.sourceLabel ?? '',
      normalizeName(row.property_name),
      normalizeName(row.city),
      normalizeName(row.state),
    ].join('::');
    const existing = map.get(idKey);
    const ut = String(row.unit_type ?? '').trim();
    const rate = row.rate_avg != null && row.rate_avg > 0 && Number.isFinite(row.rate_avg) ? row.rate_avg : null;
    if (existing) {
      if (ut && !existing.unitTypes.includes(ut)) existing.unitTypes.push(ut);
      if (rate != null) existing.rates.push(rate);
      existing.propertyTotalSites = mergePropertyTotalSites(existing.propertyTotalSites, row.property_total_sites);
    } else {
      map.set(idKey, {
        key: idKey,
        rep: row,
        unitTypes: ut ? [ut] : [],
        rates: rate != null ? [rate] : [],
        propertyTotalSites: normalizePropertyTotalSites(row.property_total_sites),
      });
    }
  }
  return Array.from(map.values()).map((g) => ({
    key: g.key,
    rep: g.rep,
    unitTypes: g.unitTypes,
    avgRetailDailyRate: mean(g.rates),
    propertyTotalSites: g.propertyTotalSites,
  }));
}
