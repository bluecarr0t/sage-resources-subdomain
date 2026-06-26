/**
 * @jest-environment node
 */
import {
  countUniqueProperties,
  isOtaPlaceholderRate,
  mapOtaMonthlyRowsToExport,
  OTA_MONTHLY_EXPORT_COLUMNS,
} from '@/lib/ota-monthly-radius-export';

describe('ota-monthly-radius-export', () => {
  it('flags known placeholder rates', () => {
    expect(isOtaPlaceholderRate('1011.50')).toBe(true);
    expect(isOtaPlaceholderRate('120.00')).toBe(false);
  });

  it('maps raw rows to the canonical export column set', () => {
    const rows = mapOtaMonthlyRowsToExport('hipcamp', [
      {
        name: 'Test Camp',
        link: 'https://example.com',
        city: 'Sarasota',
        state: 'FL',
        property_id: 'abc-123',
        year: '2025',
        month: '3',
        month_name: 'March',
        avg_occupancy_rate_pct: '72.50',
        median_retail_daily_rate: '95.00',
        mean_retail_daily_rate: '98.00',
        revpar: '68.88',
        min_price: '80.00',
        max_price: '120.00',
        site_count: '4',
        sites_with_occ_above_5: '4',
        high_month: 'February',
        low_month: 'January',
        distance_miles: '12.3',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual([...OTA_MONTHLY_EXPORT_COLUMNS].sort());
    expect(rows[0]).toMatchObject({
      source: 'hipcamp',
      property_name: 'Test Camp',
      property_url: 'https://example.com',
      year: '2025',
      month_name: 'March',
      median_retail_daily_rate: '95.00',
      avg_occupancy_rate_pct: '72.50',
      distance_miles: '12.3',
    });
  });

  it('counts unique properties per source', () => {
    const rows = mapOtaMonthlyRowsToExport('campspot', [
      {
        name: 'A',
        link: '',
        city: '',
        state: '',
        property_id: '1',
        year: '2025',
        month: '1',
        month_name: 'January',
        avg_occupancy_rate_pct: '10',
        median_retail_daily_rate: '',
        mean_retail_daily_rate: '',
        revpar: '',
        min_price: '',
        max_price: '',
        site_count: '1',
        sites_with_occ_above_5: '0',
        high_month: '',
        low_month: '',
        distance_miles: '1',
      },
      {
        name: 'A',
        link: '',
        city: '',
        state: '',
        property_id: '1',
        year: '2025',
        month: '2',
        month_name: 'February',
        avg_occupancy_rate_pct: '20',
        median_retail_daily_rate: '',
        mean_retail_daily_rate: '',
        revpar: '',
        min_price: '',
        max_price: '',
        site_count: '1',
        sites_with_occ_above_5: '0',
        high_month: '',
        low_month: '',
        distance_miles: '1',
      },
    ]);
    expect(countUniqueProperties(rows)).toBe(1);
  });
});
