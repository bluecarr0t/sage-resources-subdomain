/**
 * United States scope for Glamping Industry Overview scans.
 * Restricts Hipcamp + Sage rows to US country labels (and legacy null country with US state).
 */

import { STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';

const US_STATE_KEYS_2LETTER = Object.keys(STATE_ABBR_TO_NAME);
const US_STATE_ALL_KEYS = [
  ...US_STATE_KEYS_2LETTER,
  ...US_STATE_KEYS_2LETTER.map((s) => s.toLowerCase()),
  ...Object.values(STATE_ABBR_TO_NAME),
  ...Object.values(STATE_ABBR_TO_NAME).map((s) => s.toLowerCase()),
];

/** PostgREST `.or()` — US country spellings or null country (legacy rows with US `state`). */
export const GLAMPING_OVERVIEW_US_COUNTRY_OR_FILTER = [
  'country.ilike.%United States%',
  'country.ilike.%United States of America%',
  'country.ilike.%USA%',
  'country.eq.US',
  'country.eq.USA',
  'country.is.null',
].join(',');

export function isGlampingOverviewUsCountryValue(country: unknown): boolean {
  if (country == null) return true;
  const t = String(country).trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  return GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN.some((c) => c.toLowerCase() === lower);
}

/** Apply US-only filters to a Supabase query builder (Hipcamp or Sage). */
export function applyGlampingOverviewUsScope<T extends { in: (col: string, vals: string[]) => T; or: (filter: string) => T }>(
  q: T
): T {
  return q.in('state', US_STATE_ALL_KEYS).or(GLAMPING_OVERVIEW_US_COUNTRY_OR_FILTER);
}
