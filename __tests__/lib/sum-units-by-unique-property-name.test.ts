import { sumUnitsByUniquePropertyName } from '@/lib/sum-units-by-unique-property-name';

describe('sumUnitsByUniquePropertyName', () => {
  it('counts one inventory total per unique Property Name', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: 'Camp Fimfo', unit_type: 'Tiny Home', quantity_of_units: 10 },
        { property_name: 'Camp Fimfo', unit_type: 'Tiny Home', quantity_of_units: 10 },
        { property_name: 'Other Place', unit_type: 'Yurt', quantity_of_units: 3 },
      ])
    ).toBe(13);
  });

  it('treats the same Property Name as one property after trim and case fold', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: '  The Ranch  ', unit_type: 'Tent', quantity_of_units: 4 },
        { property_name: 'the ranch', unit_type: 'Tent', quantity_of_units: 4 },
      ])
    ).toBe(4);
  });

  it('keeps mixed unit types under the same Property Name', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: 'The Ranch', unit_type: 'Safari Tent', quantity_of_units: 10 },
        { property_name: 'The Ranch', unit_type: 'Cabin', quantity_of_units: 5 },
      ])
    ).toBe(15);
  });

  it('uses MAX quantity when the same Property Name and unit type are repeated', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: 'Camp Fimfo', unit_type: 'Tiny Home', quantity_of_units: 7 },
        { property_name: 'Camp Fimfo', unit_type: 'Tiny Home', quantity_of_units: 12 },
      ])
    ).toBe(12);
  });

  it('falls back to property_total_sites when quantity is missing', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: 'Lakeside', property_total_sites: 8 },
        { property_name: 'Lakeside', property_total_sites: 9 },
      ])
    ).toBe(9);
  });

  it('omits rows with a blank Property Name', () => {
    expect(
      sumUnitsByUniquePropertyName([
        { property_name: '  ', quantity_of_units: 20 },
        { property_name: null, quantity_of_units: 20 },
        { property_name: 'Named', quantity_of_units: 2 },
      ])
    ).toBe(2);
  });
});
