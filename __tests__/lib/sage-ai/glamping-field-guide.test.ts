/**
 * @jest-environment node
 */
import { searchFieldGuide } from '@/lib/sage-ai/glamping-field-guide';

describe('searchFieldGuide', () => {
  it('ranks private bathroom / ensuite to unit_private_bathroom', () => {
    const m = searchFieldGuide('ensuite private bathroom', 5);
    expect(m[0]?.column).toBe('unit_private_bathroom');
  });

  it('finds dog park from colloquial phrase', () => {
    const m = searchFieldGuide('dog park off leash', 8);
    expect(m.map((x) => x.column)).toContain('property_dog_park');
  });

  it('returns multiple matches for water', () => {
    const m = searchFieldGuide('water', 15);
    const cols = new Set(m.map((x) => x.column));
    expect(cols.has('property_waterfront') || cols.has('unit_water') || cols.has('rv_water_hookup')).toBe(
      true
    );
  });
});
