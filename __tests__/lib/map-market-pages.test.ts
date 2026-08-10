import {
  buildMapDeepLinkPath,
  buildMapDeepLinkQuery,
  buildMapLeadAttributionPath,
  findMapMarketPagesForFilters,
  getAllMapMarketSlugs,
  getMapMarketPage,
} from '@/lib/map-market-pages';

describe('map market pages catalog', () => {
  it('includes colorado-glamping with map deep-link state', () => {
    const page = getMapMarketPage('colorado-glamping');
    expect(page).not.toBeNull();
    expect(page!.state).toBe('Colorado');
    expect(buildMapDeepLinkQuery(page!)).toBe('state=Colorado');
    expect(buildMapDeepLinkPath('en', page!)).toBe('/en/map?state=Colorado');
  });

  it('includes unit-type deep-links for colorado-domes', () => {
    const page = getMapMarketPage('colorado-domes');
    expect(page).not.toBeNull();
    expect(buildMapDeepLinkQuery(page!)).toContain('state=Colorado');
    expect(buildMapDeepLinkQuery(page!)).toContain('unitType=Dome');
  });

  it('lists stable slugs for sitemap generation', () => {
    const slugs = getAllMapMarketSlugs();
    expect(slugs).toContain('colorado-glamping');
    expect(slugs).toContain('california-glamping');
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('buildMapLeadAttributionPath', () => {
  it('prefers market slug paths for utm_content', () => {
    expect(buildMapLeadAttributionPath({ marketSlug: 'colorado-glamping' })).toBe(
      '/markets/colorado-glamping'
    );
  });

  it('builds compact map paths from filters when no market slug', () => {
    expect(
      buildMapLeadAttributionPath({ states: ['Colorado'], unitTypes: ['Dome'] })
    ).toBe('/map/colorado+dome');
  });

  it('falls back to /map with no filters', () => {
    expect(buildMapLeadAttributionPath({})).toBe('/map');
  });
});

describe('findMapMarketPagesForFilters', () => {
  it('matches Colorado state markets', () => {
    const matches = findMapMarketPagesForFilters(['Colorado'], []);
    expect(matches.some((m) => m.slug === 'colorado-glamping')).toBe(true);
  });

  it('prefers unit-specific pages when unit filter is set', () => {
    const matches = findMapMarketPagesForFilters(['Colorado'], ['Dome']);
    expect(matches[0]?.slug).toBe('colorado-domes');
  });

  it('returns empty when no filters', () => {
    expect(findMapMarketPagesForFilters([], [])).toEqual([]);
  });
});
