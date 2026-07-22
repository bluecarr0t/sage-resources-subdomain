import {
  MARKET_OVERVIEW_PROMO_CAMPAIGN,
  MARKET_OVERVIEW_PROMO_HREF,
  MARKET_OVERVIEW_PROMO_STORAGE_KEY,
  hashVisitorIp,
  marketOverviewPromoRedisKey,
  shouldShowMarketOverviewPromoOnPath,
} from '@/lib/promo-market-overview';

describe('promo-market-overview', () => {
  it('exports a stable campaign storage key', () => {
    expect(MARKET_OVERVIEW_PROMO_CAMPAIGN).toBe('gmo-2026');
    expect(MARKET_OVERVIEW_PROMO_STORAGE_KEY).toContain('gmo_2026');
    expect(MARKET_OVERVIEW_PROMO_HREF).toBe('/glamping-market-overview');
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
});
