import { normalizeHipcampRowToGlampingOverviewWide } from '@/lib/glamping-industry-overview/glamping-overview-wide-row';

describe('normalizeHipcampRowToGlampingOverviewWide occupancy', () => {
  it('keeps both years when Hipcamp has 2024 and 2025 occupancy columns', () => {
    const wide = normalizeHipcampRowToGlampingOverviewWide({
      state: 'CA',
      occupancy_rate_2024: 0.62,
      occupancy_rate_2025: 0.71,
      avg_retail_daily_rate_2024: 180,
      avg_retail_daily_rate_2025: 195,
    });

    expect(wide.occupancy_rate_2024).toBe('0.62');
    expect(wide.occupancy_rate_2025).toBe('0.71');
  });

  it('maps 2026 to 2025 while preserving 2024 occupancy', () => {
    const wide = normalizeHipcampRowToGlampingOverviewWide({
      state: 'OR',
      occupancy_rate_2024: 55,
      occupancy_rate_2026: 0.68,
    });

    expect(wide.occupancy_rate_2024).toBe('55');
    expect(wide.occupancy_rate_2025).toBe('0.68');
  });

  it('leaves 2025 null when only 2024 occupancy is present', () => {
    const wide = normalizeHipcampRowToGlampingOverviewWide({
      state: 'TX',
      occupancy_rate_2024: 48,
    });

    expect(wide.occupancy_rate_2024).toBe('48');
    expect(wide.occupancy_rate_2025).toBeNull();
  });
});
