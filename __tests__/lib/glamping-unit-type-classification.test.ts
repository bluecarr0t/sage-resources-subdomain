import {
  GLAMPING_UNIT_CLASSIFICATION_FAMILIES,
  countGlampingUnitClassificationSubtypes,
  findGlampingUnitSubtype,
} from '@/lib/glamping-unit-type-classification';

describe('glamping-unit-type-classification', () => {
  it('every subtype has at least one property-type cohort', () => {
    for (const family of GLAMPING_UNIT_CLASSIFICATION_FAMILIES) {
      for (const subtype of family.subtypes) {
        expect(subtype.propertyTypes.length).toBeGreaterThan(0);
      }
    }
  });

  it('maps Lodge and cabins to glamping per product rules', () => {
    expect(findGlampingUnitSubtype('Cabin')?.subtype.propertyTypes).toContain('glamping');
    expect(findGlampingUnitSubtype('Cottage')?.subtype.propertyTypes).toContain('glamping');
    expect(findGlampingUnitSubtype('Chalet')?.subtype.propertyTypes).toContain('glamping');
    expect(findGlampingUnitSubtype('Bungalow')?.subtype.propertyTypes).toContain('glamping');
    expect(findGlampingUnitSubtype('Lodge')?.subtype.propertyTypes).toContain('glamping');
  });

  it('maps Mobile Home and RV pads to campground and RV Resort', () => {
    expect(findGlampingUnitSubtype('Mobile Home')?.subtype.propertyTypes).toEqual([
      'campground',
      'rvResort',
    ]);
    expect(findGlampingUnitSubtype('RV Site - General')?.subtype.propertyTypes).toEqual([
      'campground',
      'rvResort',
    ]);
  });

  it('maps tent site to campground only', () => {
    expect(findGlampingUnitSubtype('Tent Site')?.subtype.propertyTypes).toEqual(['campground']);
  });

  it('maps hotel-style inventory to RV Resort', () => {
    expect(findGlampingUnitSubtype('Luxury Room')?.subtype.propertyTypes).toEqual(['rvResort']);
    expect(findGlampingUnitSubtype('Villa')?.subtype.propertyTypes).toEqual(['rvResort']);
    expect(findGlampingUnitSubtype('Hotel Room')?.subtype.propertyTypes).toEqual(['rvResort']);
    expect(findGlampingUnitSubtype('Suite')?.subtype.propertyTypes).toEqual(['rvResort']);
  });

  it('marks non-glamping inventory as excluded from the market snapshot', () => {
    for (const label of [
      'Tent Site',
      'Campsite',
      'RV Site - General',
      'RV',
      'Trailer',
      'Hotel Room',
      'Suite',
    ]) {
      expect(findGlampingUnitSubtype(label)?.subtype.excludedFromMarketSnapshot).toBe(true);
    }
    expect(findGlampingUnitSubtype('Property buyout')).toBeNull();
    expect(findGlampingUnitSubtype('Eco-suite')?.subtype.excludedFromMarketSnapshot).toBeFalsy();
    expect(findGlampingUnitSubtype('Safari Tent')?.subtype.excludedFromMarketSnapshot).toBeFalsy();
  });

  it('maps beach house to RV Resort and marina', () => {
    expect(findGlampingUnitSubtype('Beach House')?.subtype.propertyTypes).toEqual([
      'rvResort',
      'marina',
    ]);
  });

  it('groups RV pad variants under the RV Site family', () => {
    expect(findGlampingUnitSubtype('RV Site - General')?.family.label).toBe('RV Site');
    expect(findGlampingUnitSubtype('RV Site - Pull thru')?.family.id).toBe('rv-site');
  });

  it('maps Jupe to Domes & pods family', () => {
    expect(findGlampingUnitSubtype('Jupe')?.family.id).toBe('domes-pods');
    expect(findGlampingUnitSubtype('Jupe')?.subtype.propertyTypes).toEqual(['glamping']);
    expect(findGlampingUnitSubtype('Jupe')?.subtype.inReportPicklist).toBe(true);
  });

  it('maps Cabin Tent and Canvas Cabin as distinct canvas-tented types', () => {
    expect(findGlampingUnitSubtype('Cabin Tent')?.family.id).toBe('canvas-tented');
    expect(findGlampingUnitSubtype('Cabin Tent')?.subtype.inReportPicklist).toBe(true);
    expect(findGlampingUnitSubtype('tentalow')?.subtype.canonical).toBe('Cabin Tent');
    expect(findGlampingUnitSubtype('Canvas Cabin')?.family.id).toBe('canvas-tented');
    expect(findGlampingUnitSubtype('Canvas Cabin')?.subtype.inReportPicklist).toBe(true);
    expect(findGlampingUnitSubtype('canvas cabin')?.subtype.canonical).toBe('Canvas Cabin');
  });

  it('excludes retired Canvas Tent from market snapshot picklist', () => {
    expect(findGlampingUnitSubtype('Canvas Tent')?.subtype.excludedFromMarketSnapshot).toBe(true);
    expect(findGlampingUnitSubtype('Canvas Tent')?.subtype.inReportPicklist).toBe(false);
  });

  it('has a subtype count matching flattened list', () => {
    const flat = GLAMPING_UNIT_CLASSIFICATION_FAMILIES.flatMap((f) => f.subtypes);
    expect(countGlampingUnitClassificationSubtypes()).toBe(flat.length);
    expect(flat.length).toBeGreaterThan(40);
  });
});
