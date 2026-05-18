/**
 * Stored values for `all_glamping_properties.is_open` (admin UI + PostgREST).
 * Order matches Property Edit modal and list filters.
 */
export const GLAMPING_IS_OPEN_VALUES = [
  'Yes',
  'Under Construction',
  'Proposed Development',
  'Closed',
] as const;

export type GlampingIsOpenValue = (typeof GLAMPING_IS_OPEN_VALUES)[number];

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
    v === 'under construction' ||
    v === 'proposed development'
  ) {
    return false;
  }
  return true;
}
