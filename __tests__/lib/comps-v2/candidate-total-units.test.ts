/**
 * @jest-environment node
 */

import { candidateTotalUnitsOrSites } from '@/lib/comps-v2/candidate-total-units';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function base(overrides: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: 'x',
    property_name: 'P',
    city: 'A',
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
    distance_miles: 1,
    source_table: 'hipcamp',
    ...overrides,
  };
}

describe('candidateTotalUnitsOrSites', () => {
  it('prefers property_total_sites when positive', () => {
    expect(
      candidateTotalUnitsOrSites(
        base({ property_total_sites: 12, quantity_of_units: 3 })
      )
    ).toBe(12);
  });

  it('falls back to quantity_of_units', () => {
    expect(candidateTotalUnitsOrSites(base({ quantity_of_units: 5 }))).toBe(5);
  });

  it('returns null when neither is usable', () => {
    expect(candidateTotalUnitsOrSites(base({}))).toBeNull();
  });
});
