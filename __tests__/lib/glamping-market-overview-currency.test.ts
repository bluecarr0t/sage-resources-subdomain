import {
  formatGlampingMarketOverviewRate,
  glampingMarketOverviewDisplayCurrency,
  glampingMarketOverviewRateCurrencyHint,
  glampingMarketOverviewRateFootnote,
} from '@/lib/glamping-market-overview-currency';

describe('glamping-market-overview-currency', () => {
  it('uses CAD for Canada and USD for US', () => {
    expect(glampingMarketOverviewDisplayCurrency('ca')).toBe('CAD');
    expect(glampingMarketOverviewDisplayCurrency('us')).toBe('USD');
  });

  it('formats null as an em dash', () => {
    expect(formatGlampingMarketOverviewRate(null, 'us')).toBe('—');
    expect(formatGlampingMarketOverviewRate(null, 'ca')).toBe('—');
  });

  it('formats US rates as USD and Canada rates as CAD', () => {
    expect(formatGlampingMarketOverviewRate(450, 'us')).toBe('$450');
    expect(formatGlampingMarketOverviewRate(450, 'ca')).toBe('CA $450');
  });

  it('prefixes provisional rates with a tilde', () => {
    expect(formatGlampingMarketOverviewRate(85, 'us', { provisional: true })).toBe('~$85');
    expect(formatGlampingMarketOverviewRate(85, 'ca', { provisional: true })).toBe('~CA $85');
  });

  it('returns market-specific footnotes and hints', () => {
    expect(glampingMarketOverviewRateFootnote('ca')).toMatch(/CAD/);
    expect(glampingMarketOverviewRateFootnote('us')).toMatch(/USD/);
    expect(glampingMarketOverviewRateFootnote('us')).toMatch(/all-inclusive/);
    expect(glampingMarketOverviewRateCurrencyHint('ca')).toMatch(/CAD/);
    expect(glampingMarketOverviewRateCurrencyHint('us')).not.toMatch(/CAD/);
  });
});
