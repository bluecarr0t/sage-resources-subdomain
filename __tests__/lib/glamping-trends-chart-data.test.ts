import {
  aggregateCampspotRowsToTrendsChart,
} from '@/lib/rv-industry-overview/campspot-trends-chart-data';
import {
  aggregateGlampingRowsToTrendsChart,
  rowContributesToGlampingTrends,
  type CampspotTrendsAggRow,
} from '@/lib/glamping-industry-overview/glamping-trends-chart-data';

describe('aggregateGlampingRowsToTrendsChart', () => {
  it('includes Sage-style 2025 ARDR without occupancy', () => {
    const sageOnly: CampspotTrendsAggRow = {
      state: 'CO',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
      occupancy_rate_2025: null,
      avg_retail_daily_rate_2025: '200',
    };
    expect(rowContributesToGlampingTrends(sageOnly)).toBe(true);

    const out = aggregateGlampingRowsToTrendsChart([sageOnly]);
    const west = out.find((r) => r.categoryKey === 'west')!;
    expect(west.adr2025).toBe(200);
    expect(west.occ2025).toBeNull();
    expect(west.n2025).toBe(0);
  });

  it('still pairs Hipcamp 2024/2025 occupancy with ARDR', () => {
    const hipcamp: CampspotTrendsAggRow = {
      state: 'CA',
      occupancy_rate_2024: '50',
      avg_retail_daily_rate_2024: '100',
      occupancy_rate_2025: '55',
      avg_retail_daily_rate_2025: '110',
    };
    const glamping = aggregateGlampingRowsToTrendsChart([hipcamp]);
    const rv = aggregateCampspotRowsToTrendsChart([hipcamp]);
    const gWest = glamping.find((r) => r.categoryKey === 'west')!;
    const rWest = rv.find((r) => r.categoryKey === 'west')!;
    expect(gWest).toEqual(rWest);
  });

  it('does not double-count 2025 ARDR when Hipcamp row is paired', () => {
    const hipcamp: CampspotTrendsAggRow = {
      state: 'TX',
      occupancy_rate_2025: '45',
      avg_retail_daily_rate_2025: '85',
      occupancy_rate_2024: null,
      avg_retail_daily_rate_2024: null,
    };
    const mixed = aggregateGlampingRowsToTrendsChart([
      hipcamp,
      {
        state: 'TX',
        occupancy_rate_2025: null,
        avg_retail_daily_rate_2025: '300',
        occupancy_rate_2024: null,
        avg_retail_daily_rate_2024: null,
      },
    ]);
    const sw = mixed.find((r) => r.categoryKey === 'southwest')!;
    expect(sw.adr2025).toBe((85 + 300) / 2);
    expect(sw.occ2025).toBe(45);
  });
});
