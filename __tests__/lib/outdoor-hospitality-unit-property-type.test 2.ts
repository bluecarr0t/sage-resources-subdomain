import { filterSubtypesByPropertyType } from '@/lib/outdoor-hospitality-unit-property-type';
import { findGlampingUnitSubtype } from '@/lib/glamping-unit-type-classification';

describe('outdoor-hospitality-unit-property-type', () => {
  it('filters subtypes by selected property-type set (OR)', () => {
    const cabin = findGlampingUnitSubtype('Cabin')!.subtype;
    const rv = findGlampingUnitSubtype('RV Site - General')!.subtype;
    const tent = findGlampingUnitSubtype('Tent Site')!.subtype;

    expect(
      filterSubtypesByPropertyType([cabin, rv, tent], new Set(['glamping']))
    ).toEqual([cabin]);
    expect(
      filterSubtypesByPropertyType([cabin, rv, tent], new Set(['glamping', 'campground']))
    ).toEqual([cabin, rv, tent]);
  });
});
