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
 *
 * Identity key: `(sourceLabel, property_name, city, state)`.
 *   - We deliberately key on `sourceLabel` (display) rather than `source`
 *     (internal) so the same physical property surfaced on, say, both Sage
 *     and Hipcamp still produces TWO rows in the table — analysts have asked
 *     to see source attribution side-by-side in past reviews.
 *   - Property name is matched case-insensitively after trimming + whitespace
 *     collapse so trivial casing/spacing differences don't split a property.
 */

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
}

function normalizeName(name: string | null | undefined): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function groupPropertySample(rows: PropertySampleRow[]): GroupedPropertyRow[] {
  const map = new Map<string, GroupedPropertyRow>();
  for (const row of rows) {
    const idKey = [
      row.sourceLabel ?? '',
      normalizeName(row.property_name),
      normalizeName(row.city),
      normalizeName(row.state),
    ].join('::');
    const existing = map.get(idKey);
    const ut = String(row.unit_type ?? '').trim();
    if (existing) {
      if (ut && !existing.unitTypes.includes(ut)) existing.unitTypes.push(ut);
    } else {
      map.set(idKey, {
        key: idKey,
        rep: row,
        unitTypes: ut ? [ut] : [],
      });
    }
  }
  return Array.from(map.values());
}
