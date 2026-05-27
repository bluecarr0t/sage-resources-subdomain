/**
 * Stored values for `all_glamping_properties.is_open` (admin UI + PostgREST).
 * Order matches Property Edit modal and list filters.
 */
export const GLAMPING_IS_OPEN_VALUES = [
  'Yes',
  'Under Construction',
  'Proposed Development',
  'Temporarily closed',
  'Closed',
] as const;

export type GlampingIsOpenValue = (typeof GLAMPING_IS_OPEN_VALUES)[number];

/** Buckets for market-overview / industry metrics aggregates. */
export type GlampingIsOpenMetricsBucket =
  | 'yes'
  | 'under_construction'
  | 'proposed_development'
  | 'closed'
  | 'other';

/** Public-facing label for `is_open` (DB stores `Yes` for operating sites). */
export function formatGlampingIsOpenPublicLabel(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (v.toLowerCase() === 'yes') return 'Open';
  return v;
}

/** Classify `is_open` for published-property counts on /glamping-market-overview. */
export function bucketGlampingIsOpenForMetrics(
  raw: string | null | undefined
): GlampingIsOpenMetricsBucket {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'yes') return 'yes';
  if (v === 'under construction') return 'under_construction';
  if (v === 'proposed development') return 'proposed_development';
  if (v === 'closed' || v === 'no' || v === 'temporarily closed') return 'closed';
  return 'other';
}

/** `is_open` values hidden from the public `/map` marker layer. */
export const PUBLIC_MAP_EXCLUDED_IS_OPEN = [
  'Closed',
  'Temporarily closed',
  'Under Construction',
  'Proposed Development',
] as const satisfies readonly GlampingIsOpenValue[];

/**
 * True when a property may appear on the public glamping map (operating sites only).
 */
export function isGlampingVisibleOnPublicMap(isOpen: string | null | undefined): boolean {
  return isGlampingOperatingForAnalytics(isOpen);
}

/** True when `is_open` is stored as not operating (Closed or legacy No). */
export function isGlampingClosedIsOpenStatus(isOpen: string | null | undefined): boolean {
  const v = (isOpen ?? '').trim().toLowerCase();
  return v === 'closed' || v === 'no';
}

/** Drop rows with `is_open` = Closed (or legacy No) from public brand pages and map lists. */
export function excludeClosedGlampingRows<T extends { is_open?: string | null }>(
  rows: readonly T[]
): T[] {
  return rows.filter((row) => !isGlampingClosedIsOpenStatus(row.is_open));
}

/**
 * True when a row should be treated as **operating** for analytics, market cohorts,
 * and nearby-property tooling (excludes closed, pre-opening, and proposed sites).
 */
export function isGlampingOperatingForAnalytics(isOpen: string | null | undefined): boolean {
  const v = (isOpen ?? '').trim().toLowerCase();
  if (!v) return true;
  if (v === 'yes') return true;
  if (
    v === 'no' ||
    v === 'closed' ||
    v === 'temporarily closed' ||
    v === 'under construction' ||
    v === 'proposed development'
  ) {
    return false;
  }
  return true;
}
