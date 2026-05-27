import {
  processProperties,
  processPropertiesForMapMarkers,
} from '@/components/map/utils/propertyProcessing';

describe('processPropertiesForMapMarkers', () => {
  const rows = [
    {
      id: 1,
      property_name: 'Alpha Camp',
      lat: 40,
      lon: -105,
      state: 'CO',
      country: 'United States',
      unit_type: 'yurt',
      rate_category: '$150-$249',
    },
    {
      id: 2,
      property_name: 'Alpha Camp',
      lat: 40.01,
      lon: -105.01,
      state: 'CO',
      country: 'United States',
      unit_type: 'cabin',
      rate_category: '$250-$399',
    },
    {
      id: 3,
      property_name: 'Beta Lodge',
      lat: 34,
      lon: -118,
      state: 'CA',
      country: 'United States',
      unit_type: 'treehouse',
      rate_category: '$550+',
    },
  ] as const;

  it('dedupes by property name without unit/rate filters', () => {
    const fast = processPropertiesForMapMarkers([...rows], [], []);
    expect(fast).toHaveLength(2);
    expect(fast.map((p) => p.property_name).sort()).toEqual(['Alpha Camp', 'Beta Lodge']);
  });

  it('delegates to full processProperties when unit-type filter is active', () => {
    const fast = processPropertiesForMapMarkers([...rows], [], [], ['yurt']);
    const full = processProperties([...rows], [], [], ['yurt']);
    expect(fast).toEqual(full);
  });

  it('excludes properties with is_open Closed', () => {
    const withClosed = [
      ...rows,
      {
        id: 4,
        property_name: 'Closed Collective',
        lat: 39,
        lon: -106,
        state: 'CO',
        country: 'United States',
        unit_type: 'tent',
        rate_category: '$150-$249',
        is_open: 'Closed',
      },
    ];
    const result = processPropertiesForMapMarkers([...withClosed], [], []);
    expect(result.some((p) => p.property_name === 'Closed Collective')).toBe(false);
    expect(result).toHaveLength(2);
  });
});
