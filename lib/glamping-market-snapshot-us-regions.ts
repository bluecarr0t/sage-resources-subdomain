/**
 * Five-region US split for Glamping Market Overview geographic filters.
 * MD / DE / DC are placed in Southeast (product decision).
 * Do not reuse RV Industry or comps-v2 region constants — those differ.
 */

import { US_STATES } from '@/lib/us-states';

export const GLAMPING_MARKET_US_REGION_IDS = [
  'northeast',
  'southeast',
  'midwest',
  'southwest',
  'west',
] as const;

export type GlampingMarketUsRegionId = (typeof GLAMPING_MARKET_US_REGION_IDS)[number];

/** `all` = national US (no state restriction). */
export type GlampingMarketUsRegionFilter = 'all' | GlampingMarketUsRegionId;

export const GLAMPING_MARKET_US_REGIONS: Record<
  GlampingMarketUsRegionId,
  readonly string[]
> = {
  northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  southeast: [
    'AL',
    'AR',
    'FL',
    'GA',
    'KY',
    'LA',
    'MS',
    'NC',
    'SC',
    'TN',
    'VA',
    'WV',
    'MD',
    'DE',
    'DC',
  ],
  midwest: [
    'IL',
    'IN',
    'IA',
    'KS',
    'MI',
    'MN',
    'MO',
    'NE',
    'ND',
    'OH',
    'SD',
    'WI',
  ],
  southwest: ['AZ', 'NM', 'OK', 'TX'],
  west: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
};

export const GLAMPING_MARKET_US_REGION_LABELS: Record<GlampingMarketUsRegionId, string> = {
  northeast: 'Northeast',
  southeast: 'Southeast',
  midwest: 'Midwest',
  southwest: 'Southwest',
  west: 'West',
};

export const GLAMPING_MARKET_US_REGION_SHORT_LABELS: Record<GlampingMarketUsRegionId, string> = {
  northeast: 'NE',
  southeast: 'SE',
  midwest: 'MW',
  southwest: 'SW',
  west: 'West',
};

export const GLAMPING_MARKET_US_REGION_FILTER_OPTIONS: {
  value: GlampingMarketUsRegionFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All US' },
  ...GLAMPING_MARKET_US_REGION_IDS.map((id) => ({
    value: id as GlampingMarketUsRegionFilter,
    label: GLAMPING_MARKET_US_REGION_LABELS[id],
  })),
];

const USPS = new Set<string>(US_STATES);
USPS.add('DC');

const ABBR_TO_REGION = new Map<string, GlampingMarketUsRegionId>();
for (const id of GLAMPING_MARKET_US_REGION_IDS) {
  for (const abbr of GLAMPING_MARKET_US_REGIONS[id]) {
    ABBR_TO_REGION.set(abbr, id);
  }
}

export function isGlampingMarketUsRegionId(value: string): value is GlampingMarketUsRegionId {
  return (GLAMPING_MARKET_US_REGION_IDS as readonly string[]).includes(value);
}

export function parseGlampingMarketUsRegionFilter(
  raw: string | string[] | undefined
): GlampingMarketUsRegionFilter {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s?.trim()) return 'all';
  const t = s.trim().toLowerCase();
  return isGlampingMarketUsRegionId(t) ? t : 'all';
}

/**
 * Parse comma-separated USPS codes from `?states=FL,GA,NC`.
 * Returns null when empty / invalid (national US).
 */
export function parseGlampingMarketUsStatesFilter(
  raw: string | string[] | undefined
): string[] | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s?.trim()) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of s.split(',')) {
    const abbr = part.trim().toUpperCase();
    if (!abbr || !USPS.has(abbr) || seen.has(abbr)) continue;
    seen.add(abbr);
    out.push(abbr);
  }
  return out.length > 0 ? out : null;
}

export function statesForRegion(region: GlampingMarketUsRegionId): readonly string[] {
  return GLAMPING_MARKET_US_REGIONS[region];
}

export function stateAbbrToRegion(abbr: string): GlampingMarketUsRegionId | null {
  return ABBR_TO_REGION.get(abbr.toUpperCase()) ?? null;
}

/** Stable cache / URL key for a state set (`national` when unrestricted). */
export function glampingMarketUsStatesCacheKey(states: string[] | null): string {
  if (states == null || states.length === 0) return 'national';
  return [...states].sort().join(',');
}

/**
 * When `states` is set it wins; otherwise expand `region`; otherwise national (null).
 */
export function resolveGlampingMarketUsStatesFilter(opts: {
  statesRaw?: string | string[] | undefined;
  regionRaw?: string | string[] | undefined;
}): string[] | null {
  const fromStates = parseGlampingMarketUsStatesFilter(opts.statesRaw);
  if (fromStates) return fromStates;
  const region = parseGlampingMarketUsRegionFilter(opts.regionRaw);
  if (region === 'all') return null;
  return [...statesForRegion(region)];
}

/**
 * If `selected` exactly matches a region's state set (order-independent), return that id.
 */
export function regionMatchingStates(
  selected: string[] | null | undefined
): GlampingMarketUsRegionId | null {
  if (selected == null || selected.length === 0) return null;
  const set = new Set(selected.map((s) => s.toUpperCase()));
  for (const id of GLAMPING_MARKET_US_REGION_IDS) {
    const regionStates = GLAMPING_MARKET_US_REGIONS[id];
    if (regionStates.length !== set.size) continue;
    if (regionStates.every((abbr) => set.has(abbr))) return id;
  }
  return null;
}

/** Whether a normalized USPS abbr is included in the active geographic filter. */
export function rowPassesGlampingMarketUsStatesFilter(
  uspsAbbr: string | null,
  states: string[] | null
): boolean {
  if (states == null || states.length === 0) return true;
  if (uspsAbbr == null) return false;
  return states.includes(uspsAbbr);
}
