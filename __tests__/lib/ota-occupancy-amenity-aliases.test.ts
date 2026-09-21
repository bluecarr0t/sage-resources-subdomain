import {
  normalizeAmenityToken,
  resolveAmenityGroups,
  unitTypeLikePatterns,
} from '@/lib/ota-occupancy-amenity-aliases';

describe('ota occupancy amenity aliases', () => {
  it('maps hot-tub phrases to warehouse keys per source', () => {
    expect(normalizeAmenityToken('Hot Tubs')).toBe('hot-tub');
    expect(resolveAmenityGroups(['hot tub'], 'campspot').groups[0]).toEqual([
      'Hot Tub',
      'Hot tub',
      'Private Hot Tub',
    ]);
    expect(resolveAmenityGroups(['hot-tub'], 'hipcamp').groups[0]).toEqual(['Hot tub']);
  });

  it('keeps unknown tokens as literal keys', () => {
    const resolved = resolveAmenityGroups(['Sauna'], 'campspot');
    expect(resolved.unknown).toEqual(['Sauna']);
    expect(resolved.groups[0]).toEqual(['Sauna']);
  });

  it('wraps unit types as ILIKE patterns', () => {
    expect(unitTypeLikePatterns(['rv', '%tent%'])).toEqual(['%rv%', '%tent%']);
  });
});
