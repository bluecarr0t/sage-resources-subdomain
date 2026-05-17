/**
 * Stored values for `all_glamping_properties.is_open` (admin UI + PostgREST).
 * "Closed" = not operating for guests; "Under Construction" = pre-opening (still in Sage pipeline).
 */
export const GLAMPING_IS_OPEN_VALUES = ['Yes', 'Closed', 'Under Construction'] as const;

export type GlampingIsOpenValue = (typeof GLAMPING_IS_OPEN_VALUES)[number];

/**
 * True when a row should be treated as **operating** for analytics, market cohorts,
 * and nearby-property tooling (excludes closed and pre-opening).
 */
export function isGlampingOperatingForAnalytics(isOpen: string | null | undefined): boolean {
  const v = (isOpen ?? '').trim().toLowerCase();
  if (!v) return true;
  if (v === 'yes') return true;
  if (v === 'no' || v === 'closed' || v === 'under construction') return false;
  return true;
}
