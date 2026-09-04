import {
  classifyInventoryUnitType,
  scoreProfessionalizedGlamping,
} from '@/lib/admin/glamping-professionalization-score';

describe('classifyInventoryUnitType', () => {
  it('credits furnished glamping types', () => {
    expect(classifyInventoryUnitType('Yurt').class).toBe('glamping');
    expect(classifyInventoryUnitType('Safari Tent').isCanonicalGlamping).toBe(true);
    expect(classifyInventoryUnitType('Cabin').class).toBe('glamping');
    expect(classifyInventoryUnitType('Airstream').class).toBe('glamping');
  });

  it('excludes RV pads, tent sites, and hotel-adjacent SKUs', () => {
    expect(classifyInventoryUnitType('RV Site').class).toBe('non_glamping');
    expect(classifyInventoryUnitType('Tent Site').class).toBe('non_glamping');
    expect(classifyInventoryUnitType('Hotel Room').class).toBe('non_glamping');
    expect(classifyInventoryUnitType('Suite').class).toBe('non_glamping');
    expect(classifyInventoryUnitType('Mobile Home').class).toBe('non_glamping');
  });

  it('does not invent a type for ambiguous tents', () => {
    expect(classifyInventoryUnitType('glamping tent').class).toBe('unclassified');
    expect(classifyInventoryUnitType(null).class).toBe('unclassified');
  });

  it('credits Other Glamping without the canonical bonus flag', () => {
    const other = classifyInventoryUnitType('Other Glamping');
    expect(other.class).toBe('glamping');
    expect(other.isCanonicalGlamping).toBe(false);
  });
});

describe('scoreProfessionalizedGlamping', () => {
  it('scores an RV Park with many Yurts high on inventory', () => {
    const result = scoreProfessionalizedGlamping([
      {
        property_type: 'RV Park',
        is_glamping_property: 'No',
        unit_type: 'RV Site',
        quantity_of_units: 100,
        property_total_sites: 115,
      },
      {
        property_type: 'RV Park',
        is_glamping_property: 'No',
        unit_type: 'Yurt',
        quantity_of_units: 15,
        property_total_sites: 115,
      },
    ]);

    expect(result.inventory).toBe(41);
    expect(result.distinctGlampingTypes).toEqual(['Yurt']);
    expect(result.glampingUnitCount).toBe(15);
    expect(result.glampingShare).toBeCloseTo(15 / 115);
    expect(result.reasons[0]).toContain('15 Yurts');
    expect(result.reasons[0]).toContain('13% of sites');
    expect(result.total).toBeGreaterThanOrEqual(41);
  });

  it('keeps RV-only inventory at 0 even when published and open', () => {
    const result = scoreProfessionalizedGlamping([
      {
        property_type: 'RV Park',
        is_glamping_property: 'No',
        unit_type: 'RV Site',
        quantity_of_units: 80,
        property_total_sites: 80,
        is_open: 'Yes',
        research_status: 'published',
        url: 'https://example.com',
        city: 'Austin',
        state: 'TX',
      },
    ]);

    expect(result.inventory).toBe(0);
    expect(result.glampingUnitCount).toBe(0);
    expect(result.reasons).toContain('no glamping units');
    expect(result.total).toBeLessThan(30);
  });

  it('scores a full professionalized glamping safari property in the 80–95 band', () => {
    const result = scoreProfessionalizedGlamping([
      {
        property_type: 'Glamping',
        is_glamping_property: 'Yes',
        unit_type: 'Safari Tent',
        quantity_of_units: 12,
        property_total_sites: 12,
        unit_private_bathroom: 'Yes',
        unit_air_conditioning: 'Yes',
        unit_wifi: 'Yes',
        glamping_service_tier: 'midscale',
        rate_avg_retail_daily_rate: 289,
        url: 'https://example.com',
        city: 'Moab',
        state: 'UT',
        lat: 38.57,
        lon: -109.55,
        is_open: 'Yes',
        research_status: 'published',
      },
    ]);

    expect(result.inventory).toBe(45);
    expect(result.experience).toBe(18);
    expect(result.completeness).toBe(15);
    expect(result.operations).toBe(10);
    expect(result.total).toBe(88);
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.total).toBeLessThanOrEqual(95);
  });

  it('gives tent-site-only glamping-typed properties no inventory credit', () => {
    const result = scoreProfessionalizedGlamping([
      {
        property_type: 'Glamping',
        unit_type: 'Tent Site',
        quantity_of_units: 20,
        property_total_sites: 20,
        is_open: 'Yes',
        research_status: 'published',
      },
    ]);

    expect(result.inventory).toBe(0);
    expect(result.glampingUnitCount).toBe(0);
  });

  it('credits ranch cabins even when is_glamping_property is No', () => {
    const result = scoreProfessionalizedGlamping([
      {
        property_type: 'Ranch & Lodge',
        is_glamping_property: 'No',
        unit_type: 'Cabin',
        quantity_of_units: 8,
        property_total_sites: 8,
      },
    ]);

    expect(result.inventory).toBe(43);
    expect(result.distinctGlampingTypes).toEqual(['Cabin']);
    expect(result.glampingUnitCount).toBe(8);
  });

  it('uses property_total_sites for share when yurt quantities are missing', () => {
    const result = scoreProfessionalizedGlamping([
      {
        unit_type: 'Yurt',
        property_total_sites: 80,
      },
      {
        unit_type: 'Yurt',
        property_total_sites: 80,
      },
    ]);

    expect(result.glampingUnitCount).toBe(2);
    expect(result.glampingShare).toBeCloseTo(2 / 80);
    expect(result.inventory).toBe(23);
    expect(result.reasons[0]).toContain('2 Yurts');
    expect(result.reasons[0]).toContain('3% of sites');
  });

  it('does not treat is_glamping_property as a gate', () => {
    const flaggedNo = scoreProfessionalizedGlamping([
      {
        is_glamping_property: 'No',
        property_type: 'Outdoor Resort',
        unit_type: 'Dome',
        quantity_of_units: 10,
        property_total_sites: 10,
      },
    ]);
    const flaggedYes = scoreProfessionalizedGlamping([
      {
        is_glamping_property: 'Yes',
        property_type: 'Outdoor Resort',
        unit_type: 'Dome',
        quantity_of_units: 10,
        property_total_sites: 10,
      },
    ]);

    expect(flaggedNo.inventory).toBe(flaggedYes.inventory);
    expect(flaggedNo.inventory).toBeGreaterThan(0);
  });

  it('scores an empty property as zero inventory without throwing', () => {
    const result = scoreProfessionalizedGlamping([]);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.inventory).toBe(0);
    expect(result.reasons).toContain('no glamping units');
  });
});
