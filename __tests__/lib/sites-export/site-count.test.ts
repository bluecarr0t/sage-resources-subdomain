import { siteCountForPropertyExport } from '@/lib/comps-v2/export-expand';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function baseCandidate(over: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    property_name: 'P',
    city: 'C',
    state: 'TX',
    unit_type: null,
    property_total_sites: null,
    quantity_of_units: null,
    avg_retail_daily_rate: null,
    high_rate: null,
    low_rate: null,
    seasonal_rates: {
      winter_weekday: null,
      winter_weekend: null,
      spring_weekday: null,
      spring_weekend: null,
      summer_weekday: null,
      summer_weekend: null,
      fall_weekday: null,
      fall_weekend: null,
    },
    operating_season_months: null,
    url: null,
    description: null,
    distance_miles: null,
    source_table: 'hipcamp',
    stable_id: 's1',
    ...over,
  };
}

describe('siteCountForPropertyExport (sites export sources)', () => {
  it('uses quantity_of_units for hipcamp', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({ source_table: 'hipcamp', quantity_of_units: 5, property_total_sites: 100 })
      )
    ).toBe(5);
  });

  it('falls back to property_total_sites', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({ source_table: 'campspot', quantity_of_units: null, property_total_sites: 3 })
      )
    ).toBe(3);
  });

  it('is 1 for roverpass', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({
          source_table: 'all_roverpass_data_new',
          quantity_of_units: 99,
          property_total_sites: 99,
        })
      )
    ).toBe(1);
  });
});
