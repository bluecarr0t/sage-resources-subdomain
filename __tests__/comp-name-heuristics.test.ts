import {
  looksLikeMarketingOrInventoryCompName,
  maybeSwapCompNameAndOverview,
} from '@/lib/feasibility-utils';

describe('looksLikeMarketingOrInventoryCompName', () => {
  it('flags travel and review marketing copy', () => {
    expect(looksLikeMarketingOrInventoryCompName('1.5 hours from NYC, close to vineyards')).toBe(true);
    expect(looksLikeMarketingOrInventoryCompName('20 miles from Myrtle Beach with ocean access')).toBe(true);
    expect(looksLikeMarketingOrInventoryCompName('4.9 stars of 437 Google reviews')).toBe(true);
    expect(looksLikeMarketingOrInventoryCompName('3.6 stars of 45 Google review')).toBe(true);
  });

  it('flags unit-inventory style lines', () => {
    expect(looksLikeMarketingOrInventoryCompName('13 cabins, 5 yurts, 2 tiny homes')).toBe(true);
    expect(looksLikeMarketingOrInventoryCompName('5 airstream trailers')).toBe(true);
    expect(looksLikeMarketingOrInventoryCompName('19 high quality safari-style tents')).toBe(true);
  });

  it('does not flag real property names', () => {
    expect(looksLikeMarketingOrInventoryCompName('Mountain View Glamping')).toBe(false);
    expect(looksLikeMarketingOrInventoryCompName('3 Bears Lodge')).toBe(false);
    expect(looksLikeMarketingOrInventoryCompName('4 Seasons Glamping Resort')).toBe(false);
  });
});

describe('maybeSwapCompNameAndOverview', () => {
  it('swaps when name is marketing and overview is a short label', () => {
    const r = maybeSwapCompNameAndOverview('1.5 hours from NYC, close to vineyards', 'Hudson Valley Hideaway');
    expect(r.comp_name).toBe('Hudson Valley Hideaway');
    expect(r.overview).toContain('1.5 hours from NYC');
  });

  it('does not swap when overview is also marketing', () => {
    const r = maybeSwapCompNameAndOverview('10 vintage campers', '5 miles from downtown');
    expect(r.comp_name).toBe('10 vintage campers');
    expect(r.overview).toBe('5 miles from downtown');
  });

  it('does not swap when overview is a long vague sentence', () => {
    const long =
      'Close to beaches and hiking trails with great reviews and lots of amenities for families';
    const r = maybeSwapCompNameAndOverview('1.5 hours from NYC, close to vineyards', long);
    expect(r.comp_name).toBe('1.5 hours from NYC, close to vineyards');
    expect(r.overview).toBe(long);
  });

  it('swaps for City, ST style overview', () => {
    const r = maybeSwapCompNameAndOverview('20 miles from Austin', 'Pine Ridge Glamping, TX');
    expect(r.comp_name).toBe('Pine Ridge Glamping, TX');
    expect(r.overview).toBe('20 miles from Austin');
  });
});
