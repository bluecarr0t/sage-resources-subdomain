import {
  normalizeRoverpassRowToOverviewWide,
} from '@/lib/rv-industry-overview/rv-overview-wide-row';

describe('normalizeRoverpassRowToOverviewWide', () => {
  it('maps unified RoverPass columns to overview wide shape', () => {
    const wide = normalizeRoverpassRowToOverviewWide({
      state: 'TX',
      city: 'Austin',
      property_name: 'Test RV Park',
      unit_type: 'RV Site',
      rate_avg_retail_daily_rate: 85,
      roverpass_occupancy_rate: 0.72,
      roverpass_occupancy_year: 2025,
      rate_summer_weekday: 120,
      rv_parking: 'Pull-Thru',
      rv_surface_type: 'Gravel',
      property_pool: 'Yes',
      rv_electrical_hook_up: '50 Amp',
      rv_sewer_hook_up: 'Yes',
      rv_water_hookup: 'Yes',
      property_hot_tub: 'Yes',
    });

    expect(wide.state).toBe('TX');
    expect(wide.avg_retail_daily_rate_2025).toBe('85');
    expect(wide.avg_retail_daily_rate_2024).toBeNull();
    expect(wide.occupancy_rate_2025).toBe('0.72');
    expect(wide.occupancy_rate_2024).toBeNull();
    expect(wide.summer_weekday).toBe('120');
    expect(wide.rv_parking).toBe('Pull-Thru');
    expect(wide.pool).toBe('Yes');
    expect(wide.hot_tub_sauna).toBe('Yes');
    expect(wide.electrical_hook_up).toBe('50 Amp');
  });

  it('mirrors 2024-tagged RoverPass occupancy to 2025 for regional map and trends', () => {
    const wide = normalizeRoverpassRowToOverviewWide({
      state: 'CO',
      roverpass_occupancy_rate: 55,
      roverpass_occupancy_year: 2024,
      rate_avg_retail_daily_rate: 90,
    });

    expect(wide.occupancy_rate_2024).toBe('55');
    expect(wide.occupancy_rate_2025).toBe('55');
  });
});
