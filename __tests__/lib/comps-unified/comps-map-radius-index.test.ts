import { CompsMapRadiusSpatialIndex } from '@/lib/comps-unified/comps-map-radius-index';
import type { CompsMapGeoPointRow } from '@/lib/comps-unified/comps-map-types';

function row(
  lat: number,
  lng: number,
  overrides: Partial<CompsMapGeoPointRow['leaf']> = {}
): CompsMapGeoPointRow {
  return {
    lat,
    lng,
    leaf: {
      id: overrides.id ?? `${lat},${lng}`,
      name: overrides.name ?? 'Test',
      sourceIdx: overrides.sourceIdx ?? 0,
      avgAdr: overrides.avgAdr ?? null,
      website: null,
      totalSites: overrides.totalSites ?? null,
      numUnits: overrides.numUnits ?? null,
      isGlamping: overrides.isGlamping ?? true,
      unitTypes: [],
      studyId: null,
      reportYear: null,
    },
  };
}

describe('CompsMapRadiusSpatialIndex', () => {
  const sources = ['all_sage_data', 'reports'];

  it('counts only points within radius', () => {
    const index = CompsMapRadiusSpatialIndex.fromGeoRows([
      row(34.15, -99.28, { id: 'near', numUnits: 2, totalSites: 5, avgAdr: 100 }),
      row(35.5, -100, { id: 'far', numUnits: 10 }),
    ]);
    const stats = index.query(34.15, -99.28, 25, sources);
    expect(stats.count).toBe(1);
    expect(stats.sumUnits).toBe(2);
    expect(stats.sumSites).toBe(5);
    expect(stats.avgAdr).toBe(100);
    expect(stats.bySource.all_sage_data).toBe(1);
  });

  it('exportRowsInRadius returns matching ids', () => {
    const index = CompsMapRadiusSpatialIndex.fromGeoRows([
      row(34.15, -99.28, { id: 'a', name: 'A' }),
      row(36, -100, { id: 'b', name: 'B' }),
    ]);
    const exported = index.exportRowsInRadius(34.15, -99.28, 25, sources);
    expect(exported.map((r) => r.id)).toEqual(['a']);
  });
});
