import {
  buildPropertyPageTitle,
  isGlampingPropertyTypeForUnitTypeTitle,
  propertyPageTitleTypeSegment,
} from '@/lib/property-page-title';

describe('property-page-title', () => {
  it('identifies glamping property types eligible for unit type in title', () => {
    expect(isGlampingPropertyTypeForUnitTypeTitle('Glamping')).toBe(true);
    expect(isGlampingPropertyTypeForUnitTypeTitle('Glamping Resort')).toBe(true);
    expect(isGlampingPropertyTypeForUnitTypeTitle('Campground')).toBe(false);
  });

  it('adds unit type for glamping only', () => {
    expect(
      propertyPageTitleTypeSegment({
        propertyType: 'Glamping',
        unitTypes: ['Safari Tent'],
      })
    ).toBe('Glamping, Safari Tent');

    expect(
      buildPropertyPageTitle({
        propertyName: 'Under Canvas Moab',
        city: 'Moab',
        state: 'Utah',
        propertyType: 'Glamping',
        unitTypes: ['Safari Tent'],
      })
    ).toBe('Under Canvas Moab | Glamping, Safari Tent in Moab, UT');
  });

  it('skips generic unit types and non-glamping property types', () => {
    expect(
      buildPropertyPageTitle({
        propertyName: 'Hayward KOA Holiday',
        city: 'Hayward',
        state: 'Wisconsin',
        propertyType: 'Campground',
        unitTypes: ['Mixed'],
      })
    ).toBe('Hayward KOA Holiday | Campground in Hayward, WI');

    expect(
      buildPropertyPageTitle({
        propertyName: 'Lake Glamp',
        city: 'Bend',
        state: 'OR',
        propertyType: 'Glamping',
        unitTypes: ['Mixed'],
      })
    ).toBe('Lake Glamp | Glamping in Bend, OR');
  });

  it('includes up to two specific unit types for glamping', () => {
    expect(
      propertyPageTitleTypeSegment({
        propertyType: 'Glamping',
        unitTypes: ['Yurt', 'Treehouse'],
      })
    ).toBe('Glamping, Yurt and Treehouse');
  });

  it('omits unit types when more than two are listed', () => {
    expect(
      propertyPageTitleTypeSegment({
        propertyType: 'Glamping Resort',
        unitTypes: ['Yurt', 'Treehouse', 'Safari Tent'],
      })
    ).toBe('Glamping Resort');
  });
});
