import {
  aggregateCampspotRowsToAmenityAdrChart,
  type CampspotAmenityAdrAggRow,
} from '@/lib/rv-industry-overview/campspot-amenity-adr-chart-data';

function row(p: Partial<CampspotAmenityAdrAggRow>): CampspotAmenityAdrAggRow {
  return {
    state: 'TX',
    city: 'Austin',
    unit_type: 'RV Site',
    description: null,
    property_name: 'Park',
    quantity_of_units: null,
    avg_retail_daily_rate_2025: '60',
    sewer_hook_up: null,
    water_hookup: null,
    hot_tub_sauna: null,
    pool: null,
    ...p,
  };
}

describe('aggregateCampspotRowsToAmenityAdrChart', () => {
  it('splits RV rows by amenity presence and averages ADR', () => {
    const rows: CampspotAmenityAdrAggRow[] = [
      row({ sewer_hook_up: 'yes', avg_retail_daily_rate_2025: '70' }),
      row({ sewer_hook_up: 'no', avg_retail_daily_rate_2025: '50' }),
      row({ sewer_hook_up: null, avg_retail_daily_rate_2025: '60' }),
    ];
    const out = aggregateCampspotRowsToAmenityAdrChart(rows);
    const sewer = out.find((r) => r.amenityKey === 'sewer_hook_up')!;
    expect(sewer.nWith).toBe(1);
    expect(sewer.nWithout).toBe(2);
    expect(sewer.avgWith).toBe(70);
    expect(sewer.avgWithout).toBe(55);
    expect(sewer.diffRounded).toBe(15);
  });

  it('excludes non-RV classified rows', () => {
    const rows: CampspotAmenityAdrAggRow[] = [
      row({ unit_type: 'Tent Site', sewer_hook_up: 'yes', avg_retail_daily_rate_2025: '999' }),
      row({ unit_type: 'RV Site', sewer_hook_up: 'yes', avg_retail_daily_rate_2025: '40' }),
    ];
    const out = aggregateCampspotRowsToAmenityAdrChart(rows);
    const sewer = out.find((r) => r.amenityKey === 'sewer_hook_up')!;
    expect(sewer.nWith).toBe(1);
    expect(sewer.avgWith).toBe(40);
  });

  it('skips rows outside RV regions', () => {
    const rows: CampspotAmenityAdrAggRow[] = [
      row({ state: 'TX', unit_type: 'RV Site', avg_retail_daily_rate_2025: '50' }),
      row({ state: 'XX', unit_type: 'RV Site', avg_retail_daily_rate_2025: '99' }),
    ];
    const out = aggregateCampspotRowsToAmenityAdrChart(rows);
    const sewer = out.find((r) => r.amenityKey === 'sewer_hook_up')!;
    expect(sewer.nWith + sewer.nWithout).toBe(1);
  });
});
