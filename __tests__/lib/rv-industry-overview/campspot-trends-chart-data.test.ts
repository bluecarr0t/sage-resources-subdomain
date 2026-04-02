import {
  aggregateCampspotRowsToTrendsChart,
  type CampspotTrendsAggRow,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';

describe('aggregateCampspotRowsToTrendsChart', () => {
  it('aggregates 2024 and 2025 cohorts per region and U.S.', () => {
    const rows: CampspotTrendsAggRow[] = [
      {
        state: 'CA',
        occupancy_rate_2024: '50',
        avg_retail_daily_rate_2024: '100',
        occupancy_rate_2025: '55',
        avg_retail_daily_rate_2025: '110',
        retail_daily_rate_ytd: '',
      },
      {
        state: 'CA',
        occupancy_rate_2024: '60',
        avg_retail_daily_rate_2024: '120',
        occupancy_rate_2025: '0.56',
        avg_retail_daily_rate_2025: '90',
        retail_daily_rate_ytd: '95',
      },
      {
        state: 'TX',
        occupancy_rate_2024: '40',
        avg_retail_daily_rate_2024: '80',
        occupancy_rate_2025: '45',
        avg_retail_daily_rate_2025: '85',
        retail_daily_rate_ytd: '',
      },
    ];
    const out = aggregateCampspotRowsToTrendsChart(rows);
    const us = out.find((r) => r.categoryKey === 'us')!;
    expect(us.n2024).toBe(3);
    expect(us.occ2024).toBe(50);
    expect(us.adr2024).toBe(100);
    expect(us.n2025).toBe(3);
    expect(us.occ2025).toBeCloseTo(52, 5);
    expect(us.adr2025).toBe(96.67);

    const west = out.find((r) => r.categoryKey === 'west')!;
    expect(west.n2024).toBe(2);
    const sw = out.find((r) => r.categoryKey === 'southwest')!;
    expect(sw.n2024).toBe(1);
    expect(sw.occ2024).toBe(40);
  });

  it('prefers retail_daily_rate_ytd for 2025 ADR when valid', () => {
    const rows: CampspotTrendsAggRow[] = [
      {
        state: 'FL',
        occupancy_rate_2024: '50',
        avg_retail_daily_rate_2024: '70',
        occupancy_rate_2025: '52',
        avg_retail_daily_rate_2025: '999',
        retail_daily_rate_ytd: '72',
      },
    ];
    const out = aggregateCampspotRowsToTrendsChart(rows);
    const se = out.find((r) => r.categoryKey === 'southeast')!;
    expect(se.adr2025).toBe(72);
  });
});
