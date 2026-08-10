/**
 * First-visit promo for the 2026 Glamping Market Overview.
 * Seen state is stored per IP (Upstash) with a browser localStorage fallback.
 * Both suppress re-shows for {@link MARKET_OVERVIEW_PROMO_SEEN_DAYS} days.
 */

import { createHash } from 'crypto';

export const MARKET_OVERVIEW_PROMO_CAMPAIGN = 'gmo-2026';
export const MARKET_OVERVIEW_PROMO_STORAGE_KEY = 'sage_promo_gmo_2026_seen';
export const MARKET_OVERVIEW_PROMO_HREF = '/glamping-market-overview';

/** Re-show cadence for Redis IP mark and browser localStorage. */
export const MARKET_OVERVIEW_PROMO_SEEN_DAYS = 60;
export const MARKET_OVERVIEW_PROMO_SEEN_TTL_SECONDS =
  60 * 60 * 24 * MARKET_OVERVIEW_PROMO_SEEN_DAYS;

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
  return `promo:seen:${MARKET_OVERVIEW_PROMO_CAMPAIGN}:${MARKET_OVERVIEW_PROMO_SEEN_DAYS}d:${ipHash}`;
}

/** Stable, non-reversible IP key for Redis (never store the raw IP). */
export function hashVisitorIp(ip: string): string {
  return createHash('sha256')
    .update(`sage-promo:${MARKET_OVERVIEW_PROMO_CAMPAIGN}:${ip.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Whether a stored localStorage value still suppresses the promo.
 * Expects an epoch-ms timestamp. Legacy `"1"` is treated as expired so those
 * browsers re-enter the 60-day cadence.
 */
export function isMarketOverviewPromoLocalSeen(
  raw: string | null,
  nowMs: number = Date.now()
): boolean {
  if (raw == null || raw === '' || raw === '1') return false;

  const seenAtMs = Number(raw);
  if (!Number.isFinite(seenAtMs) || seenAtMs <= 0) return false;

  const ageMs = nowMs - seenAtMs;
  if (ageMs < 0) return true;
  return ageMs < MARKET_OVERVIEW_PROMO_SEEN_TTL_SECONDS * 1000;
}
