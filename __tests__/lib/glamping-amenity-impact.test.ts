import {
  emptyAmenityImpactBuckets,
  finalizeAmenityImpactBuckets,
  foldAmenityImpactRow,
} from '@/lib/glamping-amenity-impact';

describe('glamping amenity impact', () => {
  it('computes unit-weighted with/without means and signed impact', () => {
    const buckets = emptyAmenityImpactBuckets();

    // 20 units with private bathroom @ $300
    foldAmenityImpactRow(
      buckets,
      { unit_private_bathroom: 'Yes' },
      20,
      300,
      undefined,
      'Camp A'
    );
    // 10 more with @ $200 → with mean = (20*300 + 10*200)/30 = 266.67 → 267
    foldAmenityImpactRow(
      buckets,
      { unit_private_bathroom: 'Yes' },
      10,
      200,
      undefined,
      'Camp B'
    );
    // 40 units without @ $100
    foldAmenityImpactRow(
      buckets,
      { unit_private_bathroom: 'No' },
      40,
      100,
      undefined,
      'Camp C'
    );

    const rows = finalizeAmenityImpactBuckets(buckets);
    const privateBath = rows.find((r) => r.key === 'unit_private_bathroom');
    expect(privateBath).toMatchObject({
      label: 'Private Bathroom',
      unitsWith: 30,
      unitsWithout: 40,
      propertiesWith: 2,
      avgWith: 267,
      avgWithout: 100,
      rateImpact: 167,
      rateImpactProvisional: false,
      rateImpactInconclusive: false,
    });
  });

  it('counts a property once when multiple with-amenity rows share a name', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'Yes' },
      10,
      300,
      undefined,
      'Same Camp'
    );
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'Yes' },
      5,
      350,
      undefined,
      'Same Camp'
    );
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'No' },
      40,
      200,
      undefined,
      'Other Camp'
    );

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'property_hot_tub'
    );
    expect(row?.unitsWith).toBe(15);
    expect(row?.propertiesWith).toBe(1);
  });

  it('treats blank unit_private_bathroom as without', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(buckets, { unit_private_bathroom: 'Yes' }, 30, 400);
    foldAmenityImpactRow(buckets, { unit_private_bathroom: null }, 20, 200);
    foldAmenityImpactRow(buckets, {}, 10, 100);

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'unit_private_bathroom'
    );
    expect(row?.unitsWith).toBe(30);
    expect(row?.unitsWithout).toBe(30);
  });

  it('marks impact provisional between 15 and 29 with-units', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(buckets, { property_restaurant: 'Yes' }, 20, 250);
    foldAmenityImpactRow(buckets, { property_restaurant: 'No' }, 50, 150);

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'property_restaurant'
    );
    expect(row?.rateImpact).toBe(100);
    expect(row?.rateImpactProvisional).toBe(true);
    expect(row?.rateImpactInconclusive).toBe(false);
  });

  it('hides impact below provisional floor', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(buckets, { property_hot_tub: 'Yes' }, 10, 400);
    foldAmenityImpactRow(buckets, { property_hot_tub: 'No' }, 50, 200);

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'property_hot_tub'
    );
    expect(row?.rateImpact).toBeNull();
    expect(row?.rateImpactInconclusive).toBe(false);
    expect(row?.avgWith).toBe(400);
  });

  it('marks non-positive deltas as inconclusive and hides signed impact', () => {
    const buckets = emptyAmenityImpactBuckets();
    // With hot tub cheaper than without (observational mix)
    foldAmenityImpactRow(buckets, { property_hot_tub: 'Yes' }, 40, 400);
    foldAmenityImpactRow(buckets, { property_hot_tub: 'No' }, 50, 600);

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'property_hot_tub'
    );
    expect(row).toMatchObject({
      avgWith: 400,
      avgWithout: 600,
      unitsWith: 40,
      rateImpact: null,
      rateImpactProvisional: false,
      rateImpactInconclusive: true,
    });
  });

  it('marks zero deltas as inconclusive', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(buckets, { property_food_on_site: 'Yes' }, 30, 200);
    foldAmenityImpactRow(buckets, { property_food_on_site: 'No' }, 30, 200);

    const row = finalizeAmenityImpactBuckets(buckets).find(
      (r) => r.key === 'property_food_on_site'
    );
    expect(row?.rateImpact).toBeNull();
    expect(row?.rateImpactInconclusive).toBe(true);
  });

  it('supports key-scoped fold for a subset of amenities', () => {
    const buckets = emptyAmenityImpactBuckets();
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'Yes', unit_private_bathroom: 'Yes' },
      40,
      300,
      ['property_hot_tub']
    );
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'Yes', unit_private_bathroom: 'Yes' },
      40,
      300,
      ['unit_private_bathroom']
    );
    foldAmenityImpactRow(
      buckets,
      { property_hot_tub: 'No', unit_private_bathroom: 'Yes' },
      50,
      200,
      ['property_hot_tub']
    );

    const rows = finalizeAmenityImpactBuckets(buckets);
    expect(rows.find((r) => r.key === 'unit_private_bathroom')?.unitsWith).toBe(40);
    expect(rows.find((r) => r.key === 'property_hot_tub')?.unitsWith).toBe(40);
    expect(rows.find((r) => r.key === 'property_hot_tub')?.unitsWithout).toBe(50);
  });
});
