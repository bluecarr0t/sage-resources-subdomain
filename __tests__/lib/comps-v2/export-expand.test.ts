/**
 * @jest-environment node
 */

import { expandCandidatesForSiteExport, siteCountForPropertyExport } from '@/lib/comps-v2/export-expand';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

function baseCandidate(overrides: Partial<CompsV2Candidate>): CompsV2Candidate {
  return {
    stable_id: 'abc',
    property_name: 'Test',
    city: 'Austin',
    state: 'TX',
    unit_type: 'yurt',
    property_total_sites: null,
    quantity_of_units: null,
    avg_retail_daily_rate: 100,
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
    distance_miles: 5,
    source_table: 'hipcamp',
    ...overrides,
  };
}

describe('siteCountForPropertyExport', () => {
  it('returns 1 for web research', () => {
    expect(siteCountForPropertyExport(baseCandidate({ source_table: 'tavily_gap_fill' }))).toBe(1);
  });

  it('uses quantity_of_units for hipcamp when set', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({ source_table: 'hipcamp', quantity_of_units: 4, property_total_sites: 99 })
      )
    ).toBe(4);
  });

  it('hipcamp/campspot: one row per DB record when quantity missing (ignore property_total_sites)', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({ source_table: 'campspot', quantity_of_units: null, property_total_sites: 486 })
      )
    ).toBe(1);
  });

  it('glamping: falls back to property_total_sites when quantity missing', () => {
    expect(
      siteCountForPropertyExport(
        baseCandidate({
          source_table: 'all_glamping_properties',
          quantity_of_units: null,
          property_total_sites: 3,
        })
      )
    ).toBe(3);
  });
});

describe('expandCandidatesForSiteExport', () => {
  it('emits one row per property for web', () => {
    const rows = expandCandidatesForSiteExport([
      baseCandidate({ source_table: 'tavily_gap_fill', stable_id: 'w1' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].export_stable_id).toBe('w1');
    expect(rows[0].sites_in_property_record).toBe(1);
  });

  it('emits N rows for hipcamp with quantity N', () => {
    const rows = expandCandidatesForSiteExport([
      baseCandidate({ source_table: 'hipcamp', stable_id: 'h1', quantity_of_units: 2 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].site_index).toBe(1);
    expect(rows[1].site_index).toBe(2);
    expect(rows[0].export_stable_id).toBe('h1_site1');
    expect(rows[1].export_stable_id).toBe('h1_site2');
  });
});
