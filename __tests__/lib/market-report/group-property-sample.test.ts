import { groupPropertySample } from '@/lib/market-report/group-property-sample';
import type { PropertyAnalysisSection } from '@/lib/market-report/types';

type Row = PropertyAnalysisSection['sample'][number];

function row(overrides: Partial<Row>): Row {
  return {
    key: 'k',
    property_name: 'Test Property',
    city: 'Lake Geneva',
    state: 'WI',
    distance_miles: 0,
    property_total_sites: 30,
    property_type: 'glamping',
    unit_type: 'safari_tent',
    source: 'sage',
    sourceLabel: 'Sage',
    rate_avg: null,
    url: null,
    ...overrides,
  };
}

describe('groupPropertySample', () => {
  it('collapses multiple unit types for the same property into one group', () => {
    const out = groupPropertySample([
      row({ key: 'a', unit_type: 'safari_tent' }),
      row({ key: 'b', unit_type: 'cabin' }),
      row({ key: 'c', unit_type: 'yurt' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].unitTypes).toEqual(['safari_tent', 'cabin', 'yurt']);
  });

  it('preserves first-seen order for unit types', () => {
    const out = groupPropertySample([
      row({ unit_type: 'cabin' }),
      row({ unit_type: 'safari_tent' }),
      row({ unit_type: 'cabin' }), // duplicate must not be re-added
    ]);
    expect(out[0].unitTypes).toEqual(['cabin', 'safari_tent']);
  });

  it('groups case- and whitespace-insensitively on name/city/state', () => {
    const out = groupPropertySample([
      row({ property_name: 'Cedar Ridge Resort', city: 'Lake Geneva', state: 'WI' }),
      row({ property_name: 'cedar  ridge resort', city: 'lake geneva', state: 'wi', unit_type: 'cabin' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].unitTypes.sort()).toEqual(['cabin', 'safari_tent'].sort());
  });

  it('keeps separate groups for the same property surfaced by different sources', () => {
    const out = groupPropertySample([
      row({ sourceLabel: 'Sage', unit_type: 'safari_tent' }),
      row({ sourceLabel: 'Hipcamp', unit_type: 'safari_tent' }),
    ]);
    expect(out).toHaveLength(2);
    expect(out.map((g) => g.rep.sourceLabel).sort()).toEqual(['Hipcamp', 'Sage']);
  });

  it('omits empty/null unit types from the unitTypes array', () => {
    const out = groupPropertySample([
      row({ unit_type: null }),
      row({ unit_type: '' }),
      row({ unit_type: 'cabin' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].unitTypes).toEqual(['cabin']);
  });

  it('uses the first row as the representative (preserving distance ordering from upstream)', () => {
    const out = groupPropertySample([
      row({ unit_type: 'safari_tent', distance_miles: 1.2 }),
      row({ unit_type: 'cabin', distance_miles: 9.9 }),
    ]);
    expect(out[0].rep.distance_miles).toBe(1.2);
  });

  it('averages positive ARDR across merged unit-type rows for the property', () => {
    const out = groupPropertySample([
      row({ key: 'a', unit_type: 'cabin', rate_avg: 200 }),
      row({ key: 'b', unit_type: 'yurt', rate_avg: 400 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].avgRetailDailyRate).toBe(300);
  });

  it('returns null ARDR when no row has a positive rate', () => {
    const out = groupPropertySample([
      row({ unit_type: 'cabin', rate_avg: null }),
      row({ unit_type: 'yurt', rate_avg: 0 }),
    ]);
    expect(out[0].avgRetailDailyRate).toBeNull();
  });

  it('uses max property_total_sites across merged unit-type rows', () => {
    const out = groupPropertySample([
      row({ key: 'a', unit_type: 'safari_tent', property_total_sites: null }),
      row({ key: 'b', unit_type: 'cabin', property_total_sites: 44 }),
      row({ key: 'c', unit_type: 'yurt', property_total_sites: 30 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].propertyTotalSites).toBe(44);
  });

  it('returns an empty array for empty input', () => {
    expect(groupPropertySample([])).toEqual([]);
  });
});
