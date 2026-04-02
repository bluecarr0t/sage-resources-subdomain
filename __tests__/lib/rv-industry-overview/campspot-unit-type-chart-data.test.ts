import {
  aggregateCampspotRowsToUnitTypeByRate,
  aggregateCampspotRowsToUnitTypeDistribution,
  classifyCampspotUnitChartBucket,
  type CampspotUnitTypeAggRow,
} from '@/lib/rv-industry-overview/campspot-unit-type-chart-data';

function row(p: Partial<CampspotUnitTypeAggRow>): CampspotUnitTypeAggRow {
  return {
    unit_type: null,
    property_name: 'Test Park',
    city: 'Austin',
    state: 'TX',
    description: null,
    quantity_of_units: '1',
    retail_daily_rate_ytd: null,
    avg_retail_daily_rate_2025: '100',
    ...p,
  };
}

describe('classifyCampspotUnitChartBucket', () => {
  it('classifies RV Site as rv', () => {
    expect(classifyCampspotUnitChartBucket(row({ unit_type: 'RV Site' }))).toBe('rv');
  });

  it('classifies Tent Site as tent', () => {
    expect(classifyCampspotUnitChartBucket(row({ unit_type: 'Tent Site' }))).toBe('tent');
  });

  it('classifies yurt as glamping', () => {
    expect(classifyCampspotUnitChartBucket(row({ unit_type: 'Yurt' }))).toBe('glamping');
  });

  it('excludes vacation-rental wording', () => {
    expect(
      classifyCampspotUnitChartBucket(
        row({ unit_type: 'Cabin', description: 'airbnb whole home rental' })
      )
    ).toBe(null);
  });

  it('excludes generic campground standard site', () => {
    expect(classifyCampspotUnitChartBucket(row({ unit_type: 'Standard Site' }))).toBe(null);
  });
});

describe('aggregateCampspotRowsToUnitTypeByRate', () => {
  it('averages 2025 ARDR per bucket (full-year column)', () => {
    const rows: CampspotUnitTypeAggRow[] = [
      row({ unit_type: 'RV Site', avg_retail_daily_rate_2025: '80' }),
      row({ unit_type: 'RV Site', avg_retail_daily_rate_2025: '100' }),
      row({ unit_type: 'Yurt', avg_retail_daily_rate_2025: '200' }),
    ];
    const out = aggregateCampspotRowsToUnitTypeByRate(rows);
    const rv = out.find((r) => r.bucketKey === 'rv')!;
    const gl = out.find((r) => r.bucketKey === 'glamping')!;
    expect(rv.n).toBe(2);
    expect(rv.avgAdr2025).toBe(90);
    expect(gl.n).toBe(1);
    expect(gl.avgAdr2025).toBe(200);
  });

  it('prefers retail_daily_rate_ytd when positive', () => {
    const rows: CampspotUnitTypeAggRow[] = [
      row({
        unit_type: 'RV Site',
        retail_daily_rate_ytd: '120',
        avg_retail_daily_rate_2025: '80',
      }),
    ];
    const out = aggregateCampspotRowsToUnitTypeByRate(rows);
    expect(out.find((r) => r.bucketKey === 'rv')!.avgAdr2025).toBe(120);
  });

  it('skips rows outside RV industry regions', () => {
    const rows: CampspotUnitTypeAggRow[] = [
      row({ unit_type: 'RV Site', state: 'TX', avg_retail_daily_rate_2025: '50' }),
      row({ unit_type: 'RV Site', state: 'XX', avg_retail_daily_rate_2025: '999' }),
    ];
    const out = aggregateCampspotRowsToUnitTypeByRate(rows);
    expect(out.find((r) => r.bucketKey === 'rv')!.n).toBe(1);
    expect(out.find((r) => r.bucketKey === 'rv')!.avgAdr2025).toBe(50);
  });
});

describe('aggregateCampspotRowsToUnitTypeDistribution', () => {
  it('means property-level site mix percentages', () => {
    const rows: CampspotUnitTypeAggRow[] = [
      row({
        property_name: 'Park A',
        unit_type: 'RV Site',
        quantity_of_units: '1',
      }),
      row({
        property_name: 'Park A',
        unit_type: 'RV Site',
        quantity_of_units: '1',
      }),
      row({
        property_name: 'Park B',
        unit_type: 'RV Site',
        quantity_of_units: '1',
      }),
      row({
        property_name: 'Park B',
        unit_type: 'Yurt',
        quantity_of_units: '1',
      }),
    ];
    const out = aggregateCampspotRowsToUnitTypeDistribution(rows);
    expect(out[0].nProperties).toBe(2);
    const rv = out.find((r) => r.bucketKey === 'rv')!;
    const gl = out.find((r) => r.bucketKey === 'glamping')!;
    expect(rv.pctMean).toBe(75);
    expect(gl.pctMean).toBe(25);
    expect(out.find((r) => r.bucketKey === 'tent')!.pctMean).toBe(0);
  });

  it('weights by quantity_of_units when >= 1', () => {
    const rows: CampspotUnitTypeAggRow[] = [
      row({
        property_name: 'Solo',
        unit_type: 'RV Site',
        quantity_of_units: '3',
      }),
      row({
        property_name: 'Solo',
        unit_type: 'Tent Site',
        quantity_of_units: '1',
      }),
    ];
    const out = aggregateCampspotRowsToUnitTypeDistribution(rows);
    expect(out.find((r) => r.bucketKey === 'rv')!.pctMean).toBe(75);
    expect(out.find((r) => r.bucketKey === 'tent')!.pctMean).toBe(25);
  });
});
