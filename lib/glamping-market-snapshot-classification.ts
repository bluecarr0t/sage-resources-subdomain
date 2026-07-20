import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import {
  glampingMarketUsStatesCacheKey,
  regionMatchingStates,
  statesForRegion,
  type GlampingMarketUsRegionFilter,
  type GlampingMarketUsRegionId,
} from '@/lib/glamping-market-snapshot-us-regions';
import {
  GLAMPING_SERVICE_TIERS,
  isGlampingServiceTier,
  tierDisplayLabel,
  type GlampingServiceTier,
} from '@/lib/glamping-service-tier';

export type GlampingMarketSnapshotTierFilter = 'all' | GlampingServiceTier;

export function parseGlampingMarketSnapshotTierFilter(
  raw: string | string[] | undefined
): GlampingMarketSnapshotTierFilter {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s?.trim()) return 'all';
  const t = s.trim().toLowerCase();
  return isGlampingServiceTier(t) ? t : 'all';
}

export type GlampingMarketOverviewPathOptions = {
  /** Selected USPS states; null/empty = national US. Cleared when market is CA. */
  states?: string[] | null;
  /**
   * Region hint when selection exactly matches a region.
   * Ignored for CA. When `states` is omitted and region is set, path expands to that region’s states.
   */
  region?: GlampingMarketUsRegionFilter | GlampingMarketUsRegionId | null;
};

/**
 * Build Market Overview URL. Canada clears geographic params.
 * Prefer passing `states` as the source of truth; `region` is written when the set matches.
 */
export function glampingMarketOverviewPath(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  options?: GlampingMarketOverviewPathOptions
): string {
  const params = new URLSearchParams();
  if (market === 'ca') {
    params.set('market', 'ca');
    if (tier !== 'all') params.set('tier', tier);
    const qs = params.toString();
    return qs ? `/glamping-market-overview?${qs}` : '/glamping-market-overview';
  }

  if (tier !== 'all') params.set('tier', tier);

  let states = options?.states ?? null;
  if ((states == null || states.length === 0) && options?.region && options.region !== 'all') {
    states = [...statesForRegion(options.region)];
  }

  if (states != null && states.length > 0) {
    const sorted = [...states].map((s) => s.toUpperCase()).sort();
    params.set('states', sorted.join(','));
    const matched = regionMatchingStates(sorted);
    if (matched) params.set('region', matched);
  }

  const qs = params.toString();
  return qs ? `/glamping-market-overview?${qs}` : '/glamping-market-overview';
}

/** Path for a region preset (expands to that region’s full state set). */
export function glampingMarketOverviewPathForRegion(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  region: GlampingMarketUsRegionFilter
): string {
  if (market === 'ca' || region === 'all') {
    return glampingMarketOverviewPath(market, tier);
  }
  return glampingMarketOverviewPath(market, tier, {
    states: [...statesForRegion(region)],
    region,
  });
}

/** Toggle a USPS abbr in/out of the selection and build the overview path. */
export function glampingMarketOverviewPathToggleState(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  currentStates: string[] | null,
  abbr: string
): string {
  const upper = abbr.toUpperCase();
  const set = new Set((currentStates ?? []).map((s) => s.toUpperCase()));
  if (set.has(upper)) set.delete(upper);
  else set.add(upper);
  const next = [...set].sort();
  return glampingMarketOverviewPath(market, tier, {
    states: next.length > 0 ? next : null,
  });
}

export function glampingMarketOverviewStatesKey(states: string[] | null): string {
  return glampingMarketUsStatesCacheKey(states);
}

export const GLAMPING_MARKET_CLASSIFICATION_FILTER_OPTIONS: {
  value: GlampingMarketSnapshotTierFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  ...GLAMPING_SERVICE_TIERS.map((tier) => ({
    value: tier,
    label: tierDisplayLabel(tier, 'short'),
  })),
];

/** Apply property-level service tier filter when not "All". */
export function applyGlampingMarketSnapshotTierToQuery<
  T extends { eq: (column: string, value: string) => T },
>(query: T, tier: GlampingMarketSnapshotTierFilter): T {
  if (tier !== 'all') return query.eq('glamping_service_tier', tier);
  return query;
}
