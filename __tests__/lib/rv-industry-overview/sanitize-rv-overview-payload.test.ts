import { sanitizeRvOverviewPageDataPayload } from '@/lib/rv-industry-overview/sanitize-rv-overview-payload';
import type { CampspotRvOverviewPageData } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';

function emptySlice(rowsScanned: number, error: string | null) {
  const emptyMap = {
    byRegion: {
      west: { regionId: 'west' as const, meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
      southwest: { regionId: 'southwest' as const, meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
      midwest: { regionId: 'midwest' as const, meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
      southeast: { regionId: 'southeast' as const, meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
      northeast: { regionId: 'northeast' as const, meanAdr: null, meanOccupancyPct: null, siteCount: 0 },
    },
    byState: {},
    stateAdrChoropleth: {},
    rowsScanned,
    error,
  };
  const chart = { rows: [], rowsScanned, error };
  return {
    mapResult: emptyMap,
    trendsResult: chart,
    sizeResult: chart,
    seasonRatesResult: chart,
    surfaceRatesResult: chart,
    amenityPropsResult: chart,
    amenityAdrResult: chart,
    rvParkingChartsResult: {
      distribution: [],
      rateBars: [],
      totalRvRows: 0,
      rowsScanned,
      error,
    },
  };
}

describe('sanitizeRvOverviewPageDataPayload', () => {
  it('redacts sensitive error strings in all chart results', () => {
    const leak =
      'postgres://user:secret@db.example.com:5432/postgres\n    at Object.handler (/app/route.ts:1:1)';
    const payload: CampspotRvOverviewPageData = {
      rowsScannedTotal: 10,
      rowsScannedCampspot: 10,
      rowsScannedRoverpass: 0,
      unitTypeComparisonResult: {
        rateRows: [],
        distributionRows: [],
        rowsScanned: 10,
        error: leak,
      },
      byUnitFilter: {
        rv: emptySlice(10, leak),
        tent: emptySlice(10, null),
        glamping: emptySlice(10, null),
      },
    };

    const out = sanitizeRvOverviewPageDataPayload(payload);
    expect(out.unitTypeComparisonResult.error).not.toContain('postgres://');
    expect(out.unitTypeComparisonResult.error).not.toContain('at Object.handler');
    expect(out.byUnitFilter.rv.mapResult.error).not.toContain('postgres://');
  });
});
