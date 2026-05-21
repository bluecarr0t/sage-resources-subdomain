import { isUnitTypeMislabeledAsPropertyType } from '@/lib/glamping-property-type-mislabels';

describe('isUnitTypeMislabeledAsPropertyType', () => {
  it('returns false for canonical property types', () => {
    expect(isUnitTypeMislabeledAsPropertyType('Glamping')).toBe(false);
    expect(isUnitTypeMislabeledAsPropertyType('RV Resort')).toBe(false);
  });

  it('detects unit labels in property_type', () => {
    expect(isUnitTypeMislabeledAsPropertyType('Bell Tent', 'Bell Tent')).toBe(true);
    expect(isUnitTypeMislabeledAsPropertyType('Safari Tent (Timber Framed)', 'Safari Tent')).toBe(
      true
    );
    expect(isUnitTypeMislabeledAsPropertyType('Yurt')).toBe(true);
  });

  it('does not flag legacy resort labels', () => {
    expect(isUnitTypeMislabeledAsPropertyType('Glamping Resort')).toBe(false);
    expect(isUnitTypeMislabeledAsPropertyType('Mixed Unit Glampground')).toBe(false);
  });
});
