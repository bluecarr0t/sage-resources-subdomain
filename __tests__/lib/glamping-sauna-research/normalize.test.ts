import { describe, expect, it } from '@jest/globals';
import {
  deriveHotTubOrSaunaFromSauna,
  findBestRowMatch,
} from '@/lib/glamping-sauna-research/normalize';
import type { SaunaCohortRow } from '@/lib/glamping-sauna-research/types';

function row(partial: Partial<SaunaCohortRow>): SaunaCohortRow {
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
    unit_sauna: null,
    property_sauna: null,
    unit_hot_tub_or_sauna: null,
    discovery_source: null,
    notes: null,
    quantity_of_units: 1,
  };
}

describe('glamping-sauna-research normalize', () => {
  it('prefers exact site_name match', () => {
    const rows = [
      row({ id: 1, site_name: 'King Dome', unit_type: 'Dome' }),
      row({ id: 2, site_name: 'Wellness Suite', unit_type: 'Cabin' }),
    ];
    const used = new Set<number>();
    const match = findBestRowMatch(
      rows,
      { site_name: 'Wellness Suite', unit_type: null },
      used
    );
    expect(match?.id).toBe(2);
  });

  it('sets combined flag when private sauna is yes', () => {
    expect(deriveHotTubOrSaunaFromSauna('Yes')).toBe('Yes');
    expect(deriveHotTubOrSaunaFromSauna('No')).toBeNull();
  });
});
