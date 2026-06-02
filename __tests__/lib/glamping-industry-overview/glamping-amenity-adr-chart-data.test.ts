import {
  aggregateGlampingRowsToAmenityAdrChart,
  type GlampingAmenityAdrAggRow,
} from '@/lib/glamping-industry-overview/glamping-amenity-adr-chart-data';

function row(p: Partial<GlampingAmenityAdrAggRow>): GlampingAmenityAdrAggRow {
  return {
    property_name: 'Alpine',
    city: 'Bend',
    state: 'OR',
    occupancy_rate_2025: null,
    avg_retail_daily_rate_2025: '200',
    unit_hot_tub: null,
    property_hot_tub: null,
    unit_sauna: null,
    property_sauna: null,
    pool: null,
    hot_tub_sauna: null,
    ...p,
  };
}

describe('aggregateGlampingRowsToAmenityAdrChart', () => {
  it('splits rows by unit hot tub and shows ADR change', () => {
    const out = aggregateGlampingRowsToAmenityAdrChart([
      row({ unit_hot_tub: 'Yes', avg_retail_daily_rate_2025: '300' }),
      row({ unit_hot_tub: 'No', avg_retail_daily_rate_2025: '200' }),
      row({ unit_hot_tub: 'No', avg_retail_daily_rate_2025: '220' }),
    ]);
    const tub = out.find((r) => r.amenityKey === 'unit_hot_tub')!;
    expect(tub.nWith).toBe(1);
    expect(tub.nWithout).toBe(2);
    expect(tub.avgWith).toBe(300);
    expect(tub.avgWithout).toBe(210);
    expect(tub.diffRounded).toBe(90);
  });

  it('tracks property sauna separately from unit sauna', () => {
    const out = aggregateGlampingRowsToAmenityAdrChart([
      row({ property_sauna: 'Yes', avg_retail_daily_rate_2025: '400' }),
      row({ property_sauna: 'No', avg_retail_daily_rate_2025: '250' }),
    ]);
    const propSauna = out.find((r) => r.amenityKey === 'property_sauna')!;
    expect(propSauna.avgWith).toBe(400);
    expect(propSauna.avgWithout).toBe(250);
    expect(propSauna.diffRounded).toBe(150);
    expect(out.find((r) => r.amenityKey === 'unit_sauna')!.nWith).toBe(0);
  });

  it('includes Hipcamp hot_tub_sauna key without affecting unit hot tub', () => {
    const out = aggregateGlampingRowsToAmenityAdrChart([
      row({
        hot_tub_sauna: 'Yes',
        avg_retail_daily_rate_2025: '180',
        occupancy_rate_2025: '50',
      }),
      row({
        hot_tub_sauna: 'No',
        avg_retail_daily_rate_2025: '160',
        occupancy_rate_2025: '50',
      }),
    ]);
    expect(out.find((r) => r.amenityKey === 'hot_tub_sauna')!.diffRounded).toBe(20);
    expect(out.find((r) => r.amenityKey === 'unit_hot_tub')!.nWith).toBe(0);
  });

  it('excludes rows outside US regions', () => {
    const out = aggregateGlampingRowsToAmenityAdrChart([
      row({ state: 'XX', pool: 'Yes', avg_retail_daily_rate_2025: '999' }),
      row({ state: 'OR', pool: 'Yes', avg_retail_daily_rate_2025: '200' }),
    ]);
    const pool = out.find((r) => r.amenityKey === 'pool')!;
    expect(pool.nWith).toBe(1);
    expect(pool.avgWith).toBe(200);
  });
});
