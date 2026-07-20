import {
  glampingMarketOverviewPath,
  glampingMarketOverviewPathForRegion,
  glampingMarketOverviewPathToggleState,
  parseGlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import {
  GLAMPING_MARKET_US_REGIONS,
  parseGlampingMarketUsRegionFilter,
  parseGlampingMarketUsStatesFilter,
  regionMatchingStates,
  resolveGlampingMarketUsStatesFilter,
  rowPassesGlampingMarketUsStatesFilter,
  stateAbbrToRegion,
  statesForRegion,
} from '@/lib/glamping-market-snapshot-us-regions';

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

  it('clears geographic params for Canada', () => {
    expect(
      glampingMarketOverviewPath('ca', 'luxury', {
        states: ['FL', 'GA'],
        region: 'southeast',
      })
    ).toBe('/glamping-market-overview?market=ca&tier=luxury');
  });

  it('writes states and matching region to the URL', () => {
    const href = glampingMarketOverviewPathForRegion('us', 'all', 'southwest');
    expect(href).toContain('region=southwest');
    expect(href).toContain('states=');
    expect(href).toContain('AZ');
    expect(href).toContain('TX');
  });

  it('toggles a state in and out of the selection', () => {
    const withFl = glampingMarketOverviewPathToggleState('us', 'all', null, 'FL');
    expect(withFl).toContain('states=FL');
    const withoutFl = glampingMarketOverviewPathToggleState('us', 'all', ['FL'], 'FL');
    expect(withoutFl).toBe('/glamping-market-overview');
  });
});

describe('glamping-market-snapshot-us-regions', () => {
  it('places MD, DE, and DC in Southeast', () => {
    expect(stateAbbrToRegion('MD')).toBe('southeast');
    expect(stateAbbrToRegion('DE')).toBe('southeast');
    expect(stateAbbrToRegion('DC')).toBe('southeast');
    expect(GLAMPING_MARKET_US_REGIONS.southeast).toEqual(
      expect.arrayContaining(['MD', 'DE', 'DC', 'FL', 'VA'])
    );
  });

  it('parses region and states filters', () => {
    expect(parseGlampingMarketUsRegionFilter('Southeast')).toBe('southeast');
    expect(parseGlampingMarketUsRegionFilter('nope')).toBe('all');
    expect(parseGlampingMarketUsStatesFilter('fl, ga, FL')).toEqual(['FL', 'GA']);
    expect(parseGlampingMarketUsStatesFilter('')).toBeNull();
  });

  it('resolves states from region when states param is absent', () => {
    const states = resolveGlampingMarketUsStatesFilter({ regionRaw: 'midwest' });
    expect(states).toEqual([...statesForRegion('midwest')]);
  });

  it('prefers explicit states over region', () => {
    expect(
      resolveGlampingMarketUsStatesFilter({
        statesRaw: 'TX,OK',
        regionRaw: 'west',
      })
    ).toEqual(['TX', 'OK']);
  });

  it('matches a full region set and rejects custom subsets', () => {
    expect(regionMatchingStates([...statesForRegion('west')])).toBe('west');
    expect(regionMatchingStates(['CA', 'OR'])).toBeNull();
  });

  it('filters rows by USPS membership', () => {
    expect(rowPassesGlampingMarketUsStatesFilter('FL', null)).toBe(true);
    expect(rowPassesGlampingMarketUsStatesFilter('FL', ['FL', 'GA'])).toBe(true);
    expect(rowPassesGlampingMarketUsStatesFilter('NY', ['FL', 'GA'])).toBe(false);
    expect(rowPassesGlampingMarketUsStatesFilter(null, ['FL'])).toBe(false);
  });
});
