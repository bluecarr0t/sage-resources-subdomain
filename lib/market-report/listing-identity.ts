import type { CohortPropertyRow } from '@/lib/market-report/types';

/** Normalize name / city / state for stable listing identity keys. */
export function normalizeListingToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * One listing = one `(source, property_name, city, state)` after normalization.
 * Same physical site on Sage vs Hipcamp yields two keys (different `source`).
 */
export function cohortListingIdentityKey(row: CohortPropertyRow): string {
  return [
    row.source,
    normalizeListingToken(row.property_name),
    normalizeListingToken(row.city),
    normalizeListingToken(row.state),
  ].join('::');
}

/** Distinct listings across the full cohort (see {@link cohortListingIdentityKey}). */
export function countDistinctListings(rows: CohortPropertyRow[]): number {
  if (rows.length === 0) return 0;
  return new Set(rows.map(cohortListingIdentityKey)).size;
}

/**
 * Distinct listings for which `pred` is true on at least one cohort row
 * (same key grain as {@link cohortListingIdentityKey}).
 */
export function countDistinctListingsWhere(
  rows: CohortPropertyRow[],
  pred: (r: CohortPropertyRow) => boolean,
): number {
  if (rows.length === 0) return 0;
  const keys = new Set<string>();
  for (const r of rows) {
    if (pred(r)) keys.add(cohortListingIdentityKey(r));
  }
  return keys.size;
}

/**
 * Distinct listings within one source’s row list (ignores `row.source` diversity;
 * pass only rows that already share the same `source`).
 */
export function countDistinctListingsInSourceSlice(rows: CohortPropertyRow[]): number {
  if (rows.length === 0) return 0;
  const keys = rows.map(
    (r) =>
      `${normalizeListingToken(r.property_name)}|${normalizeListingToken(r.city)}|${normalizeListingToken(r.state)}`,
  );
  return new Set(keys).size;
}
