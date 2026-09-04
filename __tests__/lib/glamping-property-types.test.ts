import {
  applyRvPropertyTypeGlampingFlag,
  glampingFlagForPropertyType,
  isRvNonGlampingPropertyType,
} from '@/lib/glamping-property-types';

describe('RV property types are never glamping', () => {
  it('treats RV Resort and RV Park as non-glamping types', () => {
    expect(isRvNonGlampingPropertyType('RV Resort')).toBe(true);
    expect(isRvNonGlampingPropertyType('RV Park')).toBe(true);
    expect(isRvNonGlampingPropertyType(' Campground ')).toBe(false);
    expect(isRvNonGlampingPropertyType('Glamping')).toBe(false);
  });

  it('forces is_glamping_property to No for RV types', () => {
    expect(glampingFlagForPropertyType('RV Resort', 'Yes')).toBe('No');
    expect(glampingFlagForPropertyType('RV Park', 'Yes')).toBe('No');
    expect(glampingFlagForPropertyType('Glamping', 'Yes')).toBe('Yes');
    expect(glampingFlagForPropertyType('Ranch & Lodge', 'No')).toBe('No');
  });

  it('overwrites a Yes flag when the effective type is RV', () => {
    const fields: { property_type?: string; is_glamping_property?: string } = {
      is_glamping_property: 'Yes',
    };
    applyRvPropertyTypeGlampingFlag(fields, 'RV Resort');
    expect(fields.is_glamping_property).toBe('No');
  });
});
