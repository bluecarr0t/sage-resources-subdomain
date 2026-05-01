import { normalizePlacesApiPlaceId } from '@/lib/google-places-place-id';

describe('normalizePlacesApiPlaceId', () => {
  it('returns null for empty', () => {
    expect(normalizePlacesApiPlaceId(null)).toBeNull();
    expect(normalizePlacesApiPlaceId('')).toBeNull();
    expect(normalizePlacesApiPlaceId('   ')).toBeNull();
  });

  it('prefixes bare IDs', () => {
    expect(normalizePlacesApiPlaceId('ChIJTestBareId123456789012')).toBe(
      'places/ChIJTestBareId123456789012'
    );
  });

  it('normalizes already-prefixed IDs', () => {
    expect(normalizePlacesApiPlaceId('places/ChIJDup')).toBe('places/ChIJDup');
  });

  it('rejects unsafe characters', () => {
    expect(normalizePlacesApiPlaceId('places/../../../')).toBeNull();
    expect(normalizePlacesApiPlaceId('bad id')).toBeNull();
  });
});
