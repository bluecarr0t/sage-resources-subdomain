import {
  aggregateCampspotRowsToSurfaceRates,
  classifyCampspotRvSurfaceType,
  type CampspotSurfaceRatesAggRow,
} from '@/lib/rv-industry-overview/campspot-surface-rates-chart-data';

describe('classifyCampspotRvSurfaceType', () => {
  it('maps concrete wording to concrete_pad', () => {
    expect(classifyCampspotRvSurfaceType('Concrete Pad')).toBe('concrete_pad');
    expect(classifyCampspotRvSurfaceType('Paved Roads')).toBe('concrete_pad');
    expect(classifyCampspotRvSurfaceType('Asphalt')).toBe('concrete_pad');
  });

  it('maps gravel and dirt to loose_gravel', () => {
    expect(classifyCampspotRvSurfaceType('Loose Gravel')).toBe('loose_gravel');
    expect(classifyCampspotRvSurfaceType('Gravel Roads')).toBe('loose_gravel');
    expect(classifyCampspotRvSurfaceType('Dirt Roads')).toBe('loose_gravel');
  });

  it('maps grass and field to grass_or_field', () => {
    expect(classifyCampspotRvSurfaceType('Grass or Field')).toBe('grass_or_field');
    expect(classifyCampspotRvSurfaceType('Turf lawn')).toBe('grass_or_field');
  });

  it('returns null for empty or mixed', () => {
    expect(classifyCampspotRvSurfaceType('')).toBe(null);
    expect(classifyCampspotRvSurfaceType('Mixed surfaces')).toBe(null);
  });
});

describe('aggregateCampspotRowsToSurfaceRates', () => {
  function row(p: Partial<CampspotSurfaceRatesAggRow>): CampspotSurfaceRatesAggRow {
    return {
      state: 'TX',
      rv_surface_type: null,
      retail_daily_rate_ytd: null,
      avg_retail_daily_rate_2025: '100',
      ...p,
    };
  }

  it('averages 2025 ADR per surface bucket', () => {
    const rows: CampspotSurfaceRatesAggRow[] = [
      row({ rv_surface_type: 'Concrete Pad', avg_retail_daily_rate_2025: '70' }),
      row({ rv_surface_type: 'Concrete', avg_retail_daily_rate_2025: '80' }),
      row({ rv_surface_type: 'Gravel', avg_retail_daily_rate_2025: '62' }),
    ];
    const out = aggregateCampspotRowsToSurfaceRates(rows);
    const conc = out.find((r) => r.bucketKey === 'concrete_pad')!;
    const grav = out.find((r) => r.bucketKey === 'loose_gravel')!;
    expect(conc.n).toBe(2);
    expect(conc.avgAdr2025).toBe(75);
    expect(grav.n).toBe(1);
    expect(grav.avgAdr2025).toBe(62);
  });

  it('prefers retail_daily_rate_ytd when positive', () => {
    const rows: CampspotSurfaceRatesAggRow[] = [
      row({
        rv_surface_type: 'Grass',
        retail_daily_rate_ytd: '50',
        avg_retail_daily_rate_2025: '90',
      }),
    ];
    const out = aggregateCampspotRowsToSurfaceRates(rows);
    expect(out.find((r) => r.bucketKey === 'grass_or_field')!.avgAdr2025).toBe(50);
  });

  it('skips rows outside RV industry regions', () => {
    const rows: CampspotSurfaceRatesAggRow[] = [
      row({ state: 'TX', rv_surface_type: 'Gravel', avg_retail_daily_rate_2025: '40' }),
      row({ state: 'XX', rv_surface_type: 'Gravel', avg_retail_daily_rate_2025: '999' }),
    ];
    const out = aggregateCampspotRowsToSurfaceRates(rows);
    expect(out.find((r) => r.bucketKey === 'loose_gravel')!.n).toBe(1);
    expect(out.find((r) => r.bucketKey === 'loose_gravel')!.avgAdr2025).toBe(40);
  });
});
