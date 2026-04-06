import {
  aggregateCampspotRowsToRegions,
  type CampspotAggRow,
} from '@/lib/rv-industry-overview/campspot-regional-aggregates';

describe('aggregateCampspotRowsToRegions', () => {
  it('groups rows by region and computes means (percent occupancy)', () => {
    const rows: CampspotAggRow[] = [
      { state: 'CA', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '50' },
      { state: 'CA', avg_retail_daily_rate_2025: '120', occupancy_rate_2025: '60' },
      { state: 'TX', avg_retail_daily_rate_2025: '80', occupancy_rate_2025: '40' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.west.siteCount).toBe(2);
    expect(by.west.meanAdr).toBe(110);
    expect(by.west.meanOccupancyPct).toBe(55);
    expect(by.southwest.siteCount).toBe(1);
    expect(by.southwest.meanAdr).toBe(80);
    expect(by.southwest.meanOccupancyPct).toBe(40);
  });

  it('accepts fractional occupancy 0–1', () => {
    const rows: CampspotAggRow[] = [
      { state: 'FL', avg_retail_daily_rate_2025: '90', occupancy_rate_2025: '0.5' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.southeast.siteCount).toBe(1);
    expect(by.southeast.meanOccupancyPct).toBe(50);
  });

  it('skips rows with missing or invalid metrics', () => {
    const rows: CampspotAggRow[] = [
      { state: 'NY', avg_retail_daily_rate_2025: '', occupancy_rate_2025: '50' },
      { state: 'NY', avg_retail_daily_rate_2025: '70', occupancy_rate_2025: 'no data' },
      { state: 'NY', avg_retail_daily_rate_2025: '70', occupancy_rate_2025: '55' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.northeast.siteCount).toBe(1);
    expect(by.northeast.meanAdr).toBe(70);
  });

  it('normalizes full state names', () => {
    const rows: CampspotAggRow[] = [
      { state: 'California', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '10' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.west.siteCount).toBe(1);
  });

  it('excludes occupancy below 10%, at 100%, or above 100%', () => {
    const rows: CampspotAggRow[] = [
      { state: 'CA', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '9' },
      { state: 'CA', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '100' },
      { state: 'CA', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '100.1' },
      { state: 'CA', avg_retail_daily_rate_2025: '100', occupancy_rate_2025: '50' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.west.siteCount).toBe(1);
  });

  it('excludes ARDR outside $10–$3,000', () => {
    const rows: CampspotAggRow[] = [
      { state: 'CA', avg_retail_daily_rate_2025: '9', occupancy_rate_2025: '50' },
      { state: 'CA', avg_retail_daily_rate_2025: '3001', occupancy_rate_2025: '50' },
      { state: 'CA', avg_retail_daily_rate_2025: '80', occupancy_rate_2025: '50' },
    ];
    const by = aggregateCampspotRowsToRegions(rows);
    expect(by.west.siteCount).toBe(1);
    expect(by.west.meanAdr).toBe(80);
  });
});
