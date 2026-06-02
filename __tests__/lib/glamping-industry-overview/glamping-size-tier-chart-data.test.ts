import {
  createGlampingSizeTierFoldState,
  finalizeGlampingSizeTierFoldState,
  foldGlampingSizeTierRows,
  glampingSiteCountToSizeTier,
  parseGlampingPropertySiteCount,
} from '@/lib/glamping-industry-overview/glamping-size-tier-chart-data';

describe('parseGlampingPropertySiteCount', () => {
  it('uses the higher of property_total_sites and quantity_of_units', () => {
    expect(parseGlampingPropertySiteCount('2', '10')).toBe(10);
    expect(parseGlampingPropertySiteCount('9', '1')).toBe(9);
  });

  it('does not treat quantity 1 as resort size when property_total_sites is missing', () => {
    expect(parseGlampingPropertySiteCount(null, '1')).toBe(1);
    expect(parseGlampingPropertySiteCount('', '1')).toBe(1);
  });
});

describe('glampingSiteCountToSizeTier', () => {
  it('uses glamping breakpoints not RV thresholds', () => {
    expect(glampingSiteCountToSizeTier(1)).toBeNull();
    expect(glampingSiteCountToSizeTier(2)).toBeNull();
    expect(glampingSiteCountToSizeTier(3)).toBe('small');
    expect(glampingSiteCountToSizeTier(8)).toBe('small');
    expect(glampingSiteCountToSizeTier(9)).toBe('small');
    expect(glampingSiteCountToSizeTier(10)).toBe('medium');
    expect(glampingSiteCountToSizeTier(15)).toBe('medium');
    expect(glampingSiteCountToSizeTier(30)).toBe('large');
    expect(glampingSiteCountToSizeTier(24)).toBe('medium');
    expect(glampingSiteCountToSizeTier(25)).toBe('large');
    expect(glampingSiteCountToSizeTier(100)).toBe('large');
    expect(glampingSiteCountToSizeTier(0)).toBeNull();
  });
});

describe('foldGlampingSizeTierRows', () => {
  it('counts 2025 ARDR without occupancy when adrOnly2025', () => {
    const state = createGlampingSizeTierFoldState();
    foldGlampingSizeTierRows(
      state,
      [
        {
          property_name: 'Big Ranch',
          state: 'MT',
          city: 'Bozeman',
          property_total_sites: '60',
          quantity_of_units: null,
          occupancy_rate_2024: null,
          avg_retail_daily_rate_2024: null,
          occupancy_rate_2025: null,
          avg_retail_daily_rate_2025: '220',
        },
      ],
      { adrOnly2025: true }
    );
    const rows = finalizeGlampingSizeTierFoldState(state);
    const large = rows.find((r) => r.tierKey === 'large');
    expect(large?.adr2025).toBe(220);
    expect(large?.occ2025).toBeNull();
    expect(large?.n2025).toBe(0);
  });

  it('excludes 1–2 unit properties from size tiers', () => {
    const state = createGlampingSizeTierFoldState();
    foldGlampingSizeTierRows(
      state,
      [
        {
          property_name: 'Tiny Camp',
          state: 'OR',
          city: 'Bend',
          property_total_sites: '2',
          quantity_of_units: null,
          occupancy_rate_2024: null,
          avg_retail_daily_rate_2024: null,
          occupancy_rate_2025: null,
          avg_retail_daily_rate_2025: '150',
        },
      ],
      { adrOnly2025: true }
    );
    const rows = finalizeGlampingSizeTierFoldState(state);
    expect(rows.every((r) => r.adr2025 == null && r.occ2025 == null)).toBe(true);
  });

  it('moves resorts to medium when quantity_of_units exceeds small tier', () => {
    const state = createGlampingSizeTierFoldState();
    foldGlampingSizeTierRows(
      state,
      [
        {
          property_name: 'Mustang Monument',
          state: 'NV',
          city: 'Wells',
          property_total_sites: '2',
          quantity_of_units: '10',
          occupancy_rate_2024: null,
          avg_retail_daily_rate_2024: null,
          occupancy_rate_2025: null,
          avg_retail_daily_rate_2025: '2600',
        },
      ],
      { adrOnly2025: true }
    );
    const rows = finalizeGlampingSizeTierFoldState(state);
    expect(rows.find((r) => r.tierKey === 'small')?.adr2025).toBeNull();
    expect(rows.find((r) => r.tierKey === 'medium')?.adr2025).toBe(2600);
  });

  it('counts each property once when duplicate site rows share the same rate', () => {
    const state = createGlampingSizeTierFoldState();
    const row = {
      property_name: 'Savannah Sunset Resort and Spa',
      state: 'NJ',
      city: 'Hammonton',
      property_total_sites: '9',
      quantity_of_units: '1',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
      occupancy_rate_2025: null,
      avg_retail_daily_rate_2025: '1099',
    };
    for (let i = 0; i < 6; i++) {
      foldGlampingSizeTierRows(state, [row], { adrOnly2025: true });
    }
    const small = finalizeGlampingSizeTierFoldState(state).find((r) => r.tierKey === 'small');
    expect(small?.adr2025).toBe(1099);
  });

  it('counts 2024 ARDR without occupancy when adrOnly2024', () => {
    const state = createGlampingSizeTierFoldState();
    foldGlampingSizeTierRows(
      state,
      [
        {
          property_name: 'Big Ranch',
          state: 'MT',
          city: 'Bozeman',
          property_total_sites: '60',
          quantity_of_units: null,
          occupancy_rate_2024: null,
          avg_retail_daily_rate_2024: '180',
          occupancy_rate_2025: null,
          avg_retail_daily_rate_2025: null,
        },
      ],
      { adrOnly2024: true }
    );
    const rows = finalizeGlampingSizeTierFoldState(state);
    const large = rows.find((r) => r.tierKey === 'large');
    expect(large?.adr2024).toBe(180);
    expect(large?.occ2024).toBeNull();
  });
});
