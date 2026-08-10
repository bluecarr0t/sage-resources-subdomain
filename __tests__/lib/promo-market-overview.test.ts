import {
  isMarketOverviewPromoLocalSeen,
  MARKET_OVERVIEW_PROMO_CAMPAIGN,
  MARKET_OVERVIEW_PROMO_HREF,
  MARKET_OVERVIEW_PROMO_SEEN_DAYS,
  MARKET_OVERVIEW_PROMO_SEEN_TTL_SECONDS,
  MARKET_OVERVIEW_PROMO_STORAGE_KEY,
  hashVisitorIp,
  marketOverviewPromoRedisKey,
  shouldShowMarketOverviewPromoOnPath,
} from '@/lib/promo-market-overview';

describe('promo-market-overview', () => {
  it('exports a stable campaign storage key and 60-day cadence', () => {
    expect(MARKET_OVERVIEW_PROMO_CAMPAIGN).toBe('gmo-2026');
    expect(MARKET_OVERVIEW_PROMO_STORAGE_KEY).toContain('gmo_2026');
    expect(MARKET_OVERVIEW_PROMO_HREF).toBe('/glamping-market-overview');
    expect(MARKET_OVERVIEW_PROMO_SEEN_DAYS).toBe(60);
    expect(MARKET_OVERVIEW_PROMO_SEEN_TTL_SECONDS).toBe(60 * 60 * 24 * 60);
  });

  it('hides on admin, auth, and market-overview routes', () => {
    expect(shouldShowMarketOverviewPromoOnPath('/admin/dashboard')).toBe(false);
    expect(shouldShowMarketOverviewPromoOnPath('/login')).toBe(false);
    expect(shouldShowMarketOverviewPromoOnPath('/auth/callback')).toBe(false);
    expect(shouldShowMarketOverviewPromoOnPath('/glamping-market-overview')).toBe(false);
    expect(shouldShowMarketOverviewPromoOnPath('/glamping-market-overview/brands')).toBe(
      false
    );
  });

  it('shows on public content pages', () => {
    expect(shouldShowMarketOverviewPromoOnPath('/en')).toBe(true);
    expect(shouldShowMarketOverviewPromoOnPath('/en/property/scruffy-buffalo')).toBe(true);
    expect(shouldShowMarketOverviewPromoOnPath('/en/map')).toBe(true);
    expect(shouldShowMarketOverviewPromoOnPath('/')).toBe(true);
  });

  it('hashes IPs consistently without leaking the raw address', () => {
    const a = hashVisitorIp('203.0.113.10');
    const b = hashVisitorIp('203.0.113.10');
    const c = hashVisitorIp('203.0.113.11');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain('203');
    expect(marketOverviewPromoRedisKey(a)).toContain(a);
  });

  it('treats localStorage timestamps as seen for 60 days', () => {
    const now = Date.UTC(2026, 7, 4);
    const dayMs = 24 * 60 * 60 * 1000;

    expect(isMarketOverviewPromoLocalSeen(null, now)).toBe(false);
    expect(isMarketOverviewPromoLocalSeen('1', now)).toBe(false);
    expect(isMarketOverviewPromoLocalSeen(String(now - 10 * dayMs), now)).toBe(true);
    expect(isMarketOverviewPromoLocalSeen(String(now - 59 * dayMs), now)).toBe(true);
    expect(isMarketOverviewPromoLocalSeen(String(now - 60 * dayMs), now)).toBe(false);
    expect(isMarketOverviewPromoLocalSeen(String(now - 90 * dayMs), now)).toBe(false);
  });
});
