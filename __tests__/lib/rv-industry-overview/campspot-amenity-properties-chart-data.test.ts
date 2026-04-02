import {
  aggregateCampspotRowsToAmenityPropertyPcts,
  campspotFiftyAmpPresent,
  type CampspotAmenityPropertiesAggRow,
} from '@/lib/rv-industry-overview/campspot-amenity-properties-chart-data';

describe('campspotFiftyAmpPresent', () => {
  it('detects 50 amp in text', () => {
    expect(campspotFiftyAmpPresent('50 amp')).toBe(true);
    expect(campspotFiftyAmpPresent('50-amp service')).toBe(true);
    expect(campspotFiftyAmpPresent('yes')).toBe(true);
  });

  it('rejects 30 amp only', () => {
    expect(campspotFiftyAmpPresent('30 amp')).toBe(false);
    expect(campspotFiftyAmpPresent('')).toBe(false);
  });
});

describe('aggregateCampspotRowsToAmenityPropertyPcts', () => {
  function row(p: Partial<CampspotAmenityPropertiesAggRow>): CampspotAmenityPropertiesAggRow {
    return {
      property_name: 'Park A',
      city: 'Austin',
      state: 'TX',
      hot_tub_sauna: null,
      pool: null,
      electrical_hook_up: null,
      sewer_hook_up: null,
      water_hookup: null,
      ...p,
    };
  }

  it('counts distinct properties and ORs rows per property', () => {
    const rows: CampspotAmenityPropertiesAggRow[] = [
      row({ property_name: 'P1', pool: 'yes', water_hookup: 'no' }),
      row({ property_name: 'P1', pool: 'no', water_hookup: 'yes' }),
      row({ property_name: 'P2', pool: 'no', water_hookup: 'no' }),
    ];
    const out = aggregateCampspotRowsToAmenityPropertyPcts(rows);
    const pool = out.find((r) => r.amenityKey === 'pool')!;
    const water = out.find((r) => r.amenityKey === 'water_hookup')!;
    expect(pool.nProperties).toBe(2);
    expect(pool.nWithAmenity).toBe(1);
    expect(pool.pct).toBe(50);
    expect(water.nWithAmenity).toBe(1);
    expect(water.pct).toBe(50);
  });

  it('skips rows outside RV regions', () => {
    const rows: CampspotAmenityPropertiesAggRow[] = [
      row({ state: 'TX', property_name: 'P1', pool: 'yes' }),
      row({ state: 'XX', property_name: 'P2', pool: 'yes' }),
    ];
    const out = aggregateCampspotRowsToAmenityPropertyPcts(rows);
    const pool = out.find((r) => r.amenityKey === 'pool')!;
    expect(pool.nProperties).toBe(1);
    expect(pool.pct).toBe(100);
  });
});
