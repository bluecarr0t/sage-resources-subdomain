import {
  GLAMPING_MARKET_METHODOLOGY_NOTES,
  glampingMarketOverviewFooterDisclaimer,
} from '@/lib/glamping-market-overview-scope';

describe('glamping-market-overview-scope disclaimer', () => {
  it('includes currency and estimates disclaimer in the footer line', () => {
    const us = glampingMarketOverviewFooterDisclaimer('us');
    expect(us).toMatch(/USD/);
    expect(us).toMatch(/Estimates only/i);
    expect(us).toMatch(/not financial or investment advice/i);
    expect(us).not.toMatch(/Last Updated/);

    const ca = glampingMarketOverviewFooterDisclaimer('ca');
    expect(ca).toMatch(/CAD/);
    expect(ca).not.toMatch(/rates in USD/i);
  });

  it('documents methodology notes for the modal', () => {
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.length).toBeGreaterThanOrEqual(4);
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.join(' ')).toMatch(/CAD/);
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.join(' ')).toMatch(/not financial/i);
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.join(' ')).toMatch(/Brand rankings/i);
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.join(' ')).toMatch(/property-median/i);
    expect(GLAMPING_MARKET_METHODOLOGY_NOTES.join(' ')).toMatch(/Classification/i);
  });
});
