import {
  collapseUnifiedCompRowsToProperties,
  collectMergedUnitTypes,
  formatMergedUnitTypesSummary,
} from '@/lib/comps-unified/collapse-property-rows';
import type { UnifiedCompRow } from '@/lib/comps-unified/build-row';

function baseRow(overrides: Partial<UnifiedCompRow>): UnifiedCompRow {
  return {
    id: 'glamp:1',
    source: 'all_sage_data',
    source_row_id: '1',
    property_name: 'Timberline',
    city: 'Elverson',
    state: 'PA',
    country: 'USA',
    lat: 1,
    lon: 2,
    property_type: 'Glamping Resort',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    unit_type: 'Safari Tent A',
    unit_category: null,
    unit_categories: null,
    total_sites: 5,
    num_units: 1,
    low_adr: 100,
    peak_adr: 150,
    avg_adr: 125,
    low_occupancy: null,
    peak_occupancy: null,
    quality_score: 4,
    amenity_keywords: ['wifi'],
    study_id: null,
    overview: null,
    report_property_name: null,
    website_url: 'https://example.com',
    address_key: 'same-property',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('collapseUnifiedCompRowsToProperties', () => {
  it('merges rows with the same source and address_key', () => {
    const rows = collapseUnifiedCompRowsToProperties([
      baseRow({ id: 'glamp:1', unit_type: 'Safari Tent Deluxe', low_adr: 200, peak_adr: 300 }),
      baseRow({ id: 'glamp:2', unit_type: 'Safari Tent Standard', low_adr: 100, peak_adr: 150 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].property_name).toBe('Timberline');
    expect(rows[0].low_adr).toBe(100);
    expect(rows[0].peak_adr).toBe(300);
    expect(rows[0].unit_type).toBe('2 unit types');
    expect(rows[0].site_rows).toHaveLength(2);
  });

  it('keeps distinct properties separate', () => {
    const rows = collapseUnifiedCompRowsToProperties([
      baseRow({ id: 'glamp:1', address_key: 'a' }),
      baseRow({ id: 'glamp:2', address_key: 'b', property_name: 'Other' }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it('merges Sage rows that share property_id but differ in address_key', () => {
    const rows = collapseUnifiedCompRowsToProperties([
      baseRow({
        id: 'glamp:1',
        address_key: 'geo-a',
        sage_property_id: 'pid-1',
        sage_property_id_shared: true,
        unit_type: 'Dome A',
      }),
      baseRow({
        id: 'glamp:2',
        address_key: 'geo-b',
        sage_property_id: 'pid-1',
        sage_property_id_shared: true,
        unit_type: 'Dome B',
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].site_rows).toHaveLength(2);
  });

  it('does not merge Sage rows with unique property_id but same address_key', () => {
    const rows = collapseUnifiedCompRowsToProperties([
      baseRow({
        id: 'glamp:1',
        address_key: 'same-geo',
        sage_property_id: 'pid-a',
        sage_property_id_shared: false,
      }),
      baseRow({
        id: 'glamp:2',
        address_key: 'same-geo',
        sage_property_id: 'pid-b',
        sage_property_id_shared: false,
      }),
    ]);
    expect(rows).toHaveLength(1);
  });
});

describe('formatMergedUnitTypesSummary', () => {
  it('summarizes multiple unit types', () => {
    expect(formatMergedUnitTypesSummary(['A', 'B'])).toBe('2 unit types');
    expect(formatMergedUnitTypesSummary(['A'])).toBe('A');
  });
});

describe('collectMergedUnitTypes', () => {
  it('dedupes unit types', () => {
    expect(
      collectMergedUnitTypes([
        baseRow({ unit_type: 'Dome' }),
        baseRow({ id: 'glamp:2', unit_type: 'Dome' }),
        baseRow({ id: 'glamp:3', unit_type: 'Yurt' }),
      ])
    ).toEqual(['Dome', 'Yurt']);
  });
});
