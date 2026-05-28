import { describe, expect, it } from '@jest/globals';
import { findBestRowMatch, matchScore } from '@/lib/glamping-hot-tub-research/normalize';
import type { HotTubCohortRow } from '@/lib/glamping-hot-tub-research/types';

function row(partial: Partial<HotTubCohortRow>): HotTubCohortRow {
  return {
    id: partial.id ?? 1,
    property_id: partial.property_id ?? 'pid',
    property_name: partial.property_name ?? 'Test',
    site_name: partial.site_name ?? null,
    unit_type: partial.unit_type ?? null,
    url: null,
    ota_url_hipcamp: null,
    ota_url_airbnb: null,
    description: null,
    amenities_raw: null,
    unit_hot_tub: null,
    property_hot_tub: null,
    unit_hot_tub_or_sauna: null,
    unit_sauna: null,
    discovery_source: null,
    notes: null,
    quantity_of_units: 1,
  };
}

describe('glamping-hot-tub-research normalize', () => {
  it('prefers exact site_name match', () => {
    const rows = [
      row({ id: 1, site_name: 'King Dome', unit_type: 'Dome' }),
      row({ id: 2, site_name: 'Safari Suite', unit_type: 'Safari Tent' }),
    ];
    const used = new Set<number>();
    const match = findBestRowMatch(
      rows,
      { site_name: 'Safari Suite', unit_type: null },
      used
    );
    expect(match?.id).toBe(2);
    expect(matchScore(rows[1]!, { site_name: 'Safari Suite', unit_type: null })).toBeGreaterThanOrEqual(5);
  });
});
