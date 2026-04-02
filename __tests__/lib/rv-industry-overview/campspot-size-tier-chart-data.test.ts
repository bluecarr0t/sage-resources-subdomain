import {
  aggregateCampspotRowsToSizeTierChart,
  siteCountToSizeTier,
  type CampspotSizeTierAggRow,
} from '@/lib/rv-industry-overview/campspot-size-tier-chart-data';

describe('siteCountToSizeTier', () => {
  it('maps site counts to tiers', () => {
    expect(siteCountToSizeTier(150)).toBe('large');
    expect(siteCountToSizeTier(100)).toBe('large');
    expect(siteCountToSizeTier(75)).toBe('medium');
    expect(siteCountToSizeTier(50)).toBe('medium');
    expect(siteCountToSizeTier(49)).toBe('small');
    expect(siteCountToSizeTier(25)).toBe('small');
    expect(siteCountToSizeTier(24)).toBe(null);
    expect(siteCountToSizeTier(99)).toBe('medium');
  });
});

describe('aggregateCampspotRowsToSizeTierChart', () => {
  it('buckets rows by property_total_sites and aggregates 2024/2025 cohorts', () => {
    const rows: CampspotSizeTierAggRow[] = [
      {
        property_total_sites: '120',
        quantity_of_units: null,
        occupancy_rate_2024: '50',
        avg_retail_daily_rate_2024: '70',
        occupancy_rate_2025: '52',
        avg_retail_daily_rate_2025: '75',
      },
      {
        property_total_sites: '100',
        quantity_of_units: null,
        occupancy_rate_2024: '60',
        avg_retail_daily_rate_2024: '80',
        occupancy_rate_2025: '58',
        avg_retail_daily_rate_2025: '85',
      },
      {
        property_total_sites: '60',
        quantity_of_units: null,
        occupancy_rate_2024: '45',
        avg_retail_daily_rate_2024: '55',
        occupancy_rate_2025: '50',
        avg_retail_daily_rate_2025: '60',
      },
      {
        property_total_sites: '30',
        quantity_of_units: null,
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '50',
        occupancy_rate_2025: '42',
        avg_retail_daily_rate_2025: '55',
      },
    ];
    const out = aggregateCampspotRowsToSizeTierChart(rows);
    const large = out.find((r) => r.tierKey === 'large')!;
    expect(large.n2024).toBe(2);
    expect(large.occ2024).toBe(55);
    expect(large.adr2024).toBe(75);
    expect(large.n2025).toBe(2);
    expect(large.occ2025).toBe(55);
    expect(large.adr2025).toBe(80);

    const med = out.find((r) => r.tierKey === 'medium')!;
    expect(med.n2024).toBe(1);
    const sm = out.find((r) => r.tierKey === 'small')!;
    expect(sm.n2024).toBe(1);
  });

  it('falls back to quantity_of_units when property_total_sites missing', () => {
    const rows: CampspotSizeTierAggRow[] = [
      {
        property_total_sites: '',
        quantity_of_units: '45',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '50',
        occupancy_rate_2025: '45',
        avg_retail_daily_rate_2025: '55',
      },
    ];
    const out = aggregateCampspotRowsToSizeTierChart(rows);
    const small = out.find((r) => r.tierKey === 'small')!;
    expect(small.n2024).toBe(1);
    expect(small.occ2024).toBe(40);
  });
});
