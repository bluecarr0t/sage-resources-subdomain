import {
  idsBelongToSiblingGroup,
  normalizePropertyIdForSiblings,
  normalizeSlugForSiblings,
  siblingFilterSpecFromAnchor,
  sortSiblingPropertyRows,
} from '@/lib/admin/glamping-property-siblings';

describe('glamping-property-siblings', () => {
  it('normalizeSlugForSiblings returns null for empty', () => {
    expect(normalizeSlugForSiblings('')).toBeNull();
    expect(normalizeSlugForSiblings('  ')).toBeNull();
    expect(normalizeSlugForSiblings(null)).toBeNull();
    expect(normalizeSlugForSiblings('foo')).toBe('foo');
  });

  it('normalizePropertyIdForSiblings accepts UUID strings', () => {
    expect(normalizePropertyIdForSiblings('not-a-uuid')).toBeNull();
    expect(
      normalizePropertyIdForSiblings('  550e8400-e29b-41d4-a716-446655440000  ')
    ).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('siblingFilterSpecFromAnchor prefers property_id over slug', () => {
    expect(
      siblingFilterSpecFromAnchor({
        property_id: '550e8400-e29b-41d4-a716-446655440000',
        slug: '  my-slug  ',
        property_name: 'X',
        city: 'A',
        state: 'B',
      })
    ).toEqual({
      mode: 'property_id',
      propertyId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('siblingFilterSpecFromAnchor prefers slug when property_id absent', () => {
    expect(
      siblingFilterSpecFromAnchor({
        slug: '  my-slug  ',
        property_name: 'X',
        city: 'A',
        state: 'B',
      })
    ).toEqual({ mode: 'slug', slug: 'my-slug' });
  });

  it('siblingFilterSpecFromAnchor falls back to name and city/state', () => {
    expect(
      siblingFilterSpecFromAnchor({
        slug: '',
        property_name: '  Camp  ',
        city: '  Clyde ',
        state: ' NC ',
      })
    ).toEqual({
      mode: 'name_city_state',
      propertyName: 'Camp',
      city: 'Clyde',
      state: 'NC',
    });
  });

  it('siblingFilterSpecFromAnchor treats blank city as null', () => {
    expect(
      siblingFilterSpecFromAnchor({
        property_name: 'P',
        city: '   ',
        state: 'TX',
      })
    ).toEqual({
      mode: 'name_city_state',
      propertyName: 'P',
      city: null,
      state: 'TX',
    });
  });

  it('sortSiblingPropertyRows sorts by site_name then id', () => {
    const rows = [
      { id: '2', site_name: 'B' },
      { id: '1', site_name: 'A' },
      { id: '3', site_name: 'A' },
    ];
    expect(sortSiblingPropertyRows(rows).map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('idsBelongToSiblingGroup validates membership', () => {
    const siblings = [{ id: '10' }, { id: 20 }];
    expect(idsBelongToSiblingGroup(['10', '20'], siblings)).toBe(true);
    expect(idsBelongToSiblingGroup(['10', '99'], siblings)).toBe(false);
    expect(idsBelongToSiblingGroup([], siblings)).toBe(false);
  });
});
