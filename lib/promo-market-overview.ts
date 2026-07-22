/**
 * First-visit promo for the 2026 Glamping Market Overview.
 * Seen state is stored per IP (Upstash) with a browser localStorage fallback.
 */

import { createHash } from 'crypto';

export const MARKET_OVERVIEW_PROMO_CAMPAIGN = 'gmo-2026';
export const MARKET_OVERVIEW_PROMO_STORAGE_KEY = 'sage_promo_gmo_2026_seen';
export const MARKET_OVERVIEW_PROMO_HREF = '/glamping-market-overview';

/** Paths where the promo must not interrupt the user. */
const PROMO_EXCLUDED_PREFIXES = [
  '/admin',
  '/login',
  '/auth',
  '/api',
  '/glamping-market-overview',
  '/outdoor-hospitality-pipeline',
  '/glamping-pipeline-quarterly',
] as const;

export function shouldShowMarketOverviewPromoOnPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const path = pathname.split('?')[0] || pathname;
  return !PROMO_EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function marketOverviewPromoRedisKey(ipHash: string): string {
  return `promo:seen:${MARKET_OVERVIEW_PROMO_CAMPAIGN}:${ipHash}`;
}

/** Stable, non-reversible IP key for Redis (never store the raw IP). */
export function hashVisitorIp(ip: string): string {
  return createHash('sha256')
    .update(`sage-promo:${MARKET_OVERVIEW_PROMO_CAMPAIGN}:${ip.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
}
