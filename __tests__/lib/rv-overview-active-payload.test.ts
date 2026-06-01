import { resolveRvOverviewPayload } from '@/lib/rv-industry-overview/rv-overview-active-payload';
import type { CampspotRvOverviewPageData } from '@/lib/rv-industry-overview/campspot-rv-overview-page-data';

function emptySlice(rowsScanned: number) {
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
    error: null,
  };
  const chart = { rows: [], rowsScanned, error: null as string | null };
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
      error: null,
    },
  };
}

function minimalPageData(): CampspotRvOverviewPageData {
  const slice = emptySlice(100);
  const unitType = {
    rateRows: [],
    distributionRows: [],
    rowsScanned: 100,
    error: null,
  };
  return {
    rowsScannedTotal: 100,
    rowsScannedCampspot: 70,
    rowsScannedRoverpass: 30,
    unitTypeComparisonResult: unitType,
    byUnitFilter: { rv: slice, tent: slice, glamping: slice },
    campspotOnly: {
      rowsScannedTotal: 70,
      unitTypeComparisonResult: { ...unitType, rowsScanned: 70 },
      byUnitFilter: { rv: emptySlice(70), tent: emptySlice(70), glamping: emptySlice(70) },
    },
  };
}

describe('resolveRvOverviewPayload', () => {
  it('uses combined slice by default', () => {
    const data = minimalPageData();
    const r = resolveRvOverviewPayload(data, 'rv', 'all');
    expect(r.rowsScannedRoverpass).toBe(30);
    expect(r.campspotOnlyUnavailable).toBe(false);
  });

  it('uses campspotOnly when requested and present', () => {
    const data = minimalPageData();
    const r = resolveRvOverviewPayload(data, 'rv', 'campspot');
    expect(r.rowsScannedTotal).toBe(70);
    expect(r.rowsScannedRoverpass).toBe(0);
    expect(r.campspotOnlyUnavailable).toBe(false);
  });

  it('flags missing campspotOnly on old snapshots', () => {
    const data = minimalPageData();
    delete data.campspotOnly;
    const r = resolveRvOverviewPayload(data, 'rv', 'campspot');
    expect(r.campspotOnlyUnavailable).toBe(true);
    expect(r.rowsScannedRoverpass).toBe(30);
  });
});
