import { filterPropertiesWithCoordinates } from '@/lib/types/sage';

describe('filterPropertiesWithCoordinates', () => {
  it('includes European coordinates, not only USA/Canada', () => {
    const belgium = {
      id: 1,
      property_name: 'Test Glamping',
      lat: 50.85,
      lon: 4.35,
      state: 'Flanders',
      country: 'Belgium',
    } as any;

    const out = filterPropertiesWithCoordinates([belgium]);
    expect(out).toHaveLength(1);
    expect(out[0].coordinates).toEqual([50.85, 4.35]);
  });

  it('still excludes invalid coordinates', () => {
    const bad = { id: 2, property_name: 'Bad', lat: null, lon: null } as any;
    expect(filterPropertiesWithCoordinates([bad])).toHaveLength(0);
  });
});
