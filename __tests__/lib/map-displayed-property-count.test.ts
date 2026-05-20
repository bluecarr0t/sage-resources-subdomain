import { computeMapDisplayedPropertyCount } from '@/lib/map-displayed-property-count';
import type { SageProperty } from '@/lib/types/sage';

describe('computeMapDisplayedPropertyCount', () => {
  it('dedupes by property name among rows with coordinates', () => {
    const rows = [
      { id: 1, property_name: 'Alpha Camp', lat: 40, lon: -105, state: 'CO', country: 'United States' },
      { id: 2, property_name: 'Alpha Camp', lat: 40.1, lon: -105.1, state: 'CO', country: 'United States', unit_type: 'Yurt' },
      { id: 3, property_name: 'Beta Lodge', lat: null, lon: null, state: 'CO', country: 'United States' },
    ] as SageProperty[];

    expect(computeMapDisplayedPropertyCount(rows)).toBe(1);
  });

  it('returns zero when no coordinates', () => {
    const rows = [
      { id: 1, property_name: 'No Coords', lat: null, lon: null },
    ] as SageProperty[];

    expect(computeMapDisplayedPropertyCount(rows)).toBe(0);
  });
});
