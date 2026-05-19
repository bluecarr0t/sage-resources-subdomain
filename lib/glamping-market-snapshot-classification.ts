import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
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

export function glampingMarketOverviewPath(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter
): string {
  const params = new URLSearchParams();
  if (market === 'ca') params.set('market', 'ca');
  if (tier !== 'all') params.set('tier', tier);
  const qs = params.toString();
  return qs ? `/glamping-market-overview?${qs}` : '/glamping-market-overview';
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
  if (tier === 'all') return query;
  return query.eq('glamping_service_tier', tier);
}
