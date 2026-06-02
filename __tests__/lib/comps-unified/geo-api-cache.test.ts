import {
  canonicalGeoQueryKey,
  geoResponseWeakEtag,
} from '@/lib/comps-unified/geo-api-cache';

describe('geo-api-cache', () => {
  it('canonicalGeoQueryKey ignores format param', () => {
    const a = new URLSearchParams('state=TX&format=cols');
    const b = new URLSearchParams('format=tuples&state=TX');
    expect(canonicalGeoQueryKey(a)).toBe(canonicalGeoQueryKey(b));
  });

  it('geoResponseWeakEtag is stable for same fingerprint', () => {
    const input = {
      canonicalQuery: 'state=TX',
      pointCount: 100,
      total: 100,
      capped: false,
      sampleIds: ['a', 'z', 'm'],
    };
    expect(geoResponseWeakEtag(input)).toBe(geoResponseWeakEtag(input));
  });

  it('geoResponseWeakEtag changes when point count changes', () => {
    const base = {
      canonicalQuery: 'state=TX',
      total: 100,
      capped: false,
      sampleIds: ['a'],
    };
    expect(geoResponseWeakEtag({ ...base, pointCount: 1 })).not.toBe(
      geoResponseWeakEtag({ ...base, pointCount: 2 })
    );
  });
});
