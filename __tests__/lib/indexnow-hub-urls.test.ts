import {
  buildIndexNowHubUrls,
  parseIndexNowHubs,
} from '@/lib/indexnow-hub-urls';
import { getAllJourneyCaseSlugs } from '@/lib/journey-case-pages';
import { getAllMapMarketSlugs } from '@/lib/map-market-pages';

describe('indexnow-hub-urls', () => {
  it('parses hub flags', () => {
    expect(parseIndexNowHubs('all')).toEqual(['markets', 'journeys']);
    expect(parseIndexNowHubs('markets')).toEqual(['markets']);
    expect(parseIndexNowHubs('journeys,markets')).toEqual(['journeys', 'markets']);
    expect(() => parseIndexNowHubs('blog')).toThrow(/Unknown IndexNow hub/);
  });

  it('builds locale × hub index + slug URLs', () => {
    const urls = buildIndexNowHubUrls(['markets', 'journeys'], 'https://example.com');
    const marketSlugs = getAllMapMarketSlugs();
    const journeySlugs = getAllJourneyCaseSlugs();

    // 4 locales × (1 index + N slugs) per hub
    const expected =
      4 * (1 + marketSlugs.length) + 4 * (1 + journeySlugs.length);
    expect(urls).toHaveLength(expected);

    expect(urls).toContain('https://example.com/en/markets');
    expect(urls).toContain('https://example.com/en/markets/colorado-glamping');
    expect(urls).toContain('https://example.com/de/journeys');
    expect(urls).toContain(
      'https://example.com/en/journeys/from-comps-map-to-financed-study'
    );
  });
});
