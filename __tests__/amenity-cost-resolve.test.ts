import {
  parseAmenityCostOverridesFromBody,
  parseAmenityCostOverridesPerConfigFromBody,
  pickAmenityOverridesForConfig,
  resolveAmenityUnitCost,
  SITE_BUILDER_AMENITY_OVERRIDE_MAX,
} from '@/lib/site-builder/amenity-cost-resolve';

describe('resolveAmenityUnitCost', () => {
  it('uses override when present', () => {
    expect(resolveAmenityUnitCost('wifi', 500, { wifi: 999 })).toBe(999);
  });

  it('falls back to effective DB cost when no override', () => {
    expect(resolveAmenityUnitCost('wifi', 500, undefined)).toBe(500);
    expect(resolveAmenityUnitCost('wifi', 500, {})).toBe(500);
  });

  it('clamps override max and negative', () => {
    expect(resolveAmenityUnitCost('x', 1, { x: SITE_BUILDER_AMENITY_OVERRIDE_MAX + 1 })).toBe(
      SITE_BUILDER_AMENITY_OVERRIDE_MAX
    );
    expect(resolveAmenityUnitCost('x', 1, { x: -5 })).toBe(0);
  });

  it('still applies deck/patio guard when using DB value', () => {
    expect(resolveAmenityUnitCost('deck-patio', 40500, undefined)).toBe(6500);
  });
});

describe('parseAmenityCostOverridesFromBody', () => {
  it('returns undefined for missing or invalid', () => {
    expect(parseAmenityCostOverridesFromBody(null)).toBeUndefined();
    expect(parseAmenityCostOverridesFromBody({})).toBeUndefined();
    expect(parseAmenityCostOverridesFromBody({ amenityCostOverrides: [] })).toBeUndefined();
  });

  it('parses finite non-negative numbers', () => {
    expect(parseAmenityCostOverridesFromBody({ amenityCostOverrides: { wifi: 600, a: '700' } })).toEqual({
      wifi: 600,
      a: 700,
    });
  });

  it('drops out-of-range keys', () => {
    expect(
      parseAmenityCostOverridesFromBody({
        amenityCostOverrides: { ok: 100, bad: -1, huge: SITE_BUILDER_AMENITY_OVERRIDE_MAX + 1 },
      })
    ).toEqual({ ok: 100 });
  });
});

describe('parseAmenityCostOverridesPerConfigFromBody', () => {
  it('returns undefined when length mismatches', () => {
    expect(
      parseAmenityCostOverridesPerConfigFromBody({ amenityCostOverridesPerConfig: [{}] }, 2)
    ).toBeUndefined();
  });

  it('parses parallel rows', () => {
    expect(
      parseAmenityCostOverridesPerConfigFromBody(
        { amenityCostOverridesPerConfig: [{ wifi: 100 }, { ac: 200 }] },
        2
      )
    ).toEqual([{ wifi: 100 }, { ac: 200 }]);
  });

  it('allows empty per-row objects', () => {
    expect(
      parseAmenityCostOverridesPerConfigFromBody({ amenityCostOverridesPerConfig: [{}, { x: 1 }] }, 2)
    ).toEqual([{}, { x: 1 }]);
  });
});

describe('pickAmenityOverridesForConfig', () => {
  it('uses per-config row when array is present (no global fallback for empty row)', () => {
    expect(
      pickAmenityOverridesForConfig(
        { amenityCostOverrides: { wifi: 999 }, amenityCostOverridesPerConfig: [{}, { wifi: 1 }] },
        0
      )
    ).toBeUndefined();
    expect(
      pickAmenityOverridesForConfig(
        { amenityCostOverrides: { wifi: 999 }, amenityCostOverridesPerConfig: [{}, { wifi: 1 }] },
        1
      )
    ).toEqual({ wifi: 1 });
  });

  it('uses global when per-config absent', () => {
    expect(pickAmenityOverridesForConfig({ amenityCostOverrides: { a: 5 } }, 0)).toEqual({ a: 5 });
  });
});
