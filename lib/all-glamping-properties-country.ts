/**
 * Canonical `country` value for US rows in `public.all_sage_data`.
 * Do not store "USA" — use "United States" (see `.cursor/rules/all-glamping-properties-country.mdc`).
 */
export const ALL_GLAMPING_US_COUNTRY_CANONICAL = 'United States' as const;

/**
 * Maps legacy US labels (e.g. "USA", "usa", "U.S.A.") to {@link ALL_GLAMPING_US_COUNTRY_CANONICAL}.
 * Other values are returned unchanged (including "United States", "Canada", null).
 */
export function normalizeAllGlampingPropertiesCountryForDb(raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw !== 'string') return raw;
  const collapsed = raw.trim().replace(/\./g, '').toUpperCase();
  if (collapsed === 'USA') return ALL_GLAMPING_US_COUNTRY_CANONICAL;
  return raw;
}
