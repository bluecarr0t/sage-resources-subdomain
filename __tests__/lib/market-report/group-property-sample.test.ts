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

  it('returns an empty array for empty input', () => {
    expect(groupPropertySample([])).toEqual([]);
  });
});
