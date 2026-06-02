import { buildGeoMapDataFromTuples } from '@/lib/comps-unified/build-geo-map-data';
import { clusterCountBounds } from '@/lib/comps-unified/comps-map-marker-layer';
import { compsMapViewportRenderKey } from '@/lib/comps-unified/comps-map-viewport';
import { createCompsMapRenderScheduler } from '@/lib/comps-unified/schedule-comps-map-render';

describe('buildGeoMapDataFromTuples', () => {
  it('parses tuples once into features and radius rows', () => {
    const tuple = [
      34.15,
      -99.28,
      0,
      'id-1',
      'Test Camp',
      120,
      'https://example.com',
      10,
      8,
      1,
      'Tent\x1eYurt',
      null,
      '2024',
    ];
    const { features, allGeoPoints, radiusIndex } = buildGeoMapDataFromTuples([tuple]);
    expect(features).toHaveLength(1);
    expect(features[0].properties.name).toBe('Test Camp');
    expect(features[0].geometry.coordinates).toEqual([-99.28, 34.15]);
    expect(allGeoPoints[0].leaf.unitTypes).toEqual(['Tent', 'Yurt']);
    expect(radiusIndex.size).toBe(1);
  });
});

describe('clusterCountBounds', () => {
  it('returns min/max cluster counts from cluster features only', () => {
    const items = [
      {
        type: 'Feature' as const,
        id: 1,
        properties: { cluster: true, point_count: 5 },
        geometry: { type: 'Point' as const, coordinates: [0, 0] },
      },
      {
        type: 'Feature' as const,
        id: 2,
        properties: { cluster: true, point_count: 50 },
        geometry: { type: 'Point' as const, coordinates: [1, 1] },
      },
      {
        type: 'Feature' as const,
        properties: { id: 'x', name: 'Leaf', sourceIdx: 0 },
        geometry: { type: 'Point' as const, coordinates: [2, 2] },
      },
    ];
    expect(clusterCountBounds(items)).toEqual({ minCluster: 5, maxCluster: 50 });
  });
});

describe('compsMapViewportRenderKey', () => {
  it('returns null when bounds are missing', () => {
    const map = {
      getBounds: () => null,
      getZoom: () => 4,
    } as unknown as google.maps.Map;
    expect(compsMapViewportRenderKey(map)).toBeNull();
  });
});

describe('createCompsMapRenderScheduler', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('debounces scheduled runs', () => {
    const run = jest.fn();
    const scheduler = createCompsMapRenderScheduler(run);
    scheduler.schedule();
    scheduler.schedule();
    expect(run).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('flush runs immediately', () => {
    const run = jest.fn();
    const scheduler = createCompsMapRenderScheduler(run);
    scheduler.schedule();
    scheduler.flush();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
