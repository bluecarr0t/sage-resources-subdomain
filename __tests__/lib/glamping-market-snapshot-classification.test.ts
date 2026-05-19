import {
  glampingMarketOverviewPath,
  parseGlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';

describe('glamping-market-snapshot-classification', () => {
  it('defaults to all when tier param is missing or invalid', () => {
    expect(parseGlampingMarketSnapshotTierFilter(undefined)).toBe('all');
    expect(parseGlampingMarketSnapshotTierFilter('')).toBe('all');
    expect(parseGlampingMarketSnapshotTierFilter('boutique')).toBe('all');
  });

  it('parses valid tier keys', () => {
    expect(parseGlampingMarketSnapshotTierFilter('luxury')).toBe('luxury');
    expect(parseGlampingMarketSnapshotTierFilter('MIDSCALE')).toBe('midscale');
  });

  it('builds overview URLs preserving market and tier', () => {
    expect(glampingMarketOverviewPath('us', 'all')).toBe('/glamping-market-overview');
    expect(glampingMarketOverviewPath('ca', 'all')).toBe('/glamping-market-overview?market=ca');
    expect(glampingMarketOverviewPath('us', 'rustic')).toBe(
      '/glamping-market-overview?tier=rustic'
    );
    expect(glampingMarketOverviewPath('ca', 'upscale')).toBe(
      '/glamping-market-overview?market=ca&tier=upscale'
    );
  });
});
