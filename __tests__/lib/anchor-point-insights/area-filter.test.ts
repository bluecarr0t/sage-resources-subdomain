import {
  clampAreaRadiusMi,
  defaultAreaRadiusMi,
  filterPropertiesByArea,
  formatLocationForGeocode,
  parseRadiusMiParam,
  type ProximityAreaFilter,
} from '@/lib/anchor-point-insights/area-filter';

describe('proximity area filter', () => {
  const area: ProximityAreaFilter = {
    lat: 44.058,
    lng: -121.315,
    radiusMi: 30,
    label: 'Bend, OR',
  };

  it('formats ZIP for geocoding', () => {
    expect(formatLocationForGeocode('97701')).toBe('97701, USA');
  });

  it('appends USA to city lines', () => {
    expect(formatLocationForGeocode('Bend, OR')).toBe('Bend, OR, USA');
  });

  it('clamps radius', () => {
    expect(clampAreaRadiusMi(0)).toBe(1);
    expect(clampAreaRadiusMi(999)).toBe(250);
  });

  it('defaults radius from distance bands', () => {
    expect(defaultAreaRadiusMi([10, 25, 50])).toBe(50);
    expect(defaultAreaRadiusMi(null)).toBe(30);
  });

  it('parses radius param', () => {
    expect(parseRadiusMiParam('42')).toBe(42);
    expect(parseRadiusMiParam('')).toBeNull();
  });

  it('filters properties within radius', () => {
    const near = { lat: 44.06, lon: -121.32 };
    const far = { lat: 45.5, lon: -122.5 };
    const out = filterPropertiesByArea([near, far], area);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(near);
  });
});
