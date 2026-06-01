import {
  buildRegionalMapFallbackSvg,
  buildStateAdrChoroplethFallbackSvg,
} from '@/lib/rv-industry-overview/rv-overview-map-export-svg';

describe('rv-overview-map-export-svg', () => {
  it('builds regional fallback SVG', () => {
    const svg = buildRegionalMapFallbackSvg(
      {
        west: { regionId: 'west', meanAdr: 120, meanOccupancyPct: 55, siteCount: 10 },
        southwest: { regionId: 'southwest', meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
        midwest: { regionId: 'midwest', meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
        southeast: { regionId: 'southeast', meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
        northeast: { regionId: 'northeast', meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
      },
      'Test map'
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('Test map');
  });

  it('builds choropleth table fallback SVG', () => {
    const svg = buildStateAdrChoroplethFallbackSvg(
      { TX: { meanAdr: 95, n: 12 }, CA: { meanAdr: 110, n: 20 } },
      'ADR by state'
    );
    expect(svg).toContain('TX');
    expect(svg).toContain('$110');
  });
});
