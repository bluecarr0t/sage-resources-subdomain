import {
  buildIsGlampingInventoryUnitTypeSql,
  isGlampingInventoryUnitType,
  listGlampingInventoryUnitTypeNorms,
  summarizeGlampingUnits,
} from '@/lib/admin/has-glamping-units';

describe('isGlampingInventoryUnitType', () => {
  it('treats furnished taxonomy types as glamping inventory', () => {
    expect(isGlampingInventoryUnitType('Yurt')).toBe(true);
    expect(isGlampingInventoryUnitType('safari tents')).toBe(true);
    expect(isGlampingInventoryUnitType('Dome')).toBe(true);
    expect(isGlampingInventoryUnitType('Airstream')).toBe(true);
  });

  it('excludes RV pads, campsites, and hotel-adjacent SKUs', () => {
    expect(isGlampingInventoryUnitType('RV Site')).toBe(false);
    expect(isGlampingInventoryUnitType('RV Site - Pull thru')).toBe(false);
    expect(isGlampingInventoryUnitType('Campsite')).toBe(false);
    expect(isGlampingInventoryUnitType('Tent Site')).toBe(false);
    expect(isGlampingInventoryUnitType('Hotel Room')).toBe(false);
    expect(isGlampingInventoryUnitType(null)).toBe(false);
  });
});

describe('summarizeGlampingUnits', () => {
  it('sums quantity_of_units on glamping site rows only', () => {
    expect(
      summarizeGlampingUnits([
        { unit_type: 'RV Site', quantity_of_units: 90 },
        { unit_type: 'Safari Tent', quantity_of_units: 5 },
        { unit_type: 'Yurt', quantity_of_units: 3 },
      ])
    ).toEqual({ hasGlampingUnits: true, glampingUnitCount: 8 });
  });

  it('is No when every row is RV / campsite inventory', () => {
    expect(
      summarizeGlampingUnits([
        { unit_type: 'RV Site', quantity_of_units: 40 },
        { unit_type: 'Campsite', quantity_of_units: 12 },
      ])
    ).toEqual({ hasGlampingUnits: false, glampingUnitCount: 0 });
  });

  it('is Yes with a zero count when a glamping type has no quantity', () => {
    expect(summarizeGlampingUnits([{ unit_type: 'Yurt' }])).toEqual({
      hasGlampingUnits: true,
      glampingUnitCount: 0,
    });
  });
});

describe('listGlampingInventoryUnitTypeNorms', () => {
  it('includes taxonomy labels and omits RV / campsite norms', () => {
    const norms = listGlampingInventoryUnitTypeNorms();
    expect(norms).toContain('yurt');
    expect(norms).toContain('safari tent');
    expect(norms).toContain('dome');
    expect(norms).not.toContain('rv site');
    expect(norms).not.toContain('campsite');
    expect(norms).not.toContain('tent site');
  });
});

describe('buildIsGlampingInventoryUnitTypeSql', () => {
  it('emits the taxonomy norms used by the list-anchors filter', () => {
    const sql = buildIsGlampingInventoryUnitTypeSql();
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.is_glamping_inventory_unit_type");
    expect(sql).toContain("'yurt'");
    expect(sql).toContain("'safari tent'");
    expect(sql).not.toContain("'rv site'");
  });
});
