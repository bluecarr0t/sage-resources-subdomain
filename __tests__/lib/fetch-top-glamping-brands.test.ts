import {
  aggregateTopGlampingBrands,
  formatPartnerBrandNote,
  formatRetailDailyRate,
  formatSubBrandNote,
  propertyMatchesBrandsMarket,
  rankingRootBrandId,
  TOP_BRANDS_MIN_PROPERTY_COUNT,
  TOP_GLAMPING_BRANDS_COUNT,
} from '@/lib/fetch-top-glamping-brands';
import type { GlampingBrand } from '@/lib/glamping-brands';

const brand = (overrides: Partial<GlampingBrand>): GlampingBrand => ({
  id: overrides.id ?? '00000000-0000-4000-8000-000000000001',
  slug: overrides.slug ?? 'test',
  display_name: overrides.display_name ?? 'Test',
  parent_brand_id: overrides.parent_brand_id ?? null,
  brand_tier: overrides.brand_tier ?? 'standalone',
  legacy_chain_key: null,
  website_url: null,
  reported_location_count: null,
  notes: null,
});

describe('propertyMatchesBrandsMarket', () => {
  it('defaults missing country to United States cohort', () => {
    expect(propertyMatchesBrandsMarket(null, 'us')).toBe(true);
    expect(propertyMatchesBrandsMarket(null, 'ca')).toBe(false);
  });

  it('matches Canada and United States spellings', () => {
    expect(propertyMatchesBrandsMarket('Canada', 'ca')).toBe(true);
    expect(propertyMatchesBrandsMarket('Canada', 'us')).toBe(false);
    expect(propertyMatchesBrandsMarket('United States', 'us')).toBe(true);
    expect(propertyMatchesBrandsMarket('US', 'us')).toBe(true);
  });
});

describe('aggregateTopGlampingBrands', () => {
  const underCanvasId = '11111111-1111-4111-8111-111111111111';
  const ulumId = '22222222-2222-4222-8222-222222222222';
  const autocampId = '33333333-3333-4333-8333-333333333333';

  const brands: GlampingBrand[] = [
    brand({
      id: underCanvasId,
      slug: 'under-canvas',
      display_name: 'Under Canvas',
      brand_tier: 'portfolio',
    }),
    brand({
      id: ulumId,
      slug: 'ulum',
      display_name: 'ULUM',
      brand_tier: 'sub_brand',
      parent_brand_id: underCanvasId,
    }),
    brand({
      id: autocampId,
      slug: 'autocamp',
      display_name: 'AutoCamp',
      brand_tier: 'standalone',
    }),
  ];

  it('rolls sub-brand properties into portfolio root and ranks by property count', () => {
    const rows = [
      {
        id: 1,
        property_id: 'p1',
        slug: null,
        property_name: 'Under Canvas Zion',
        property_type: 'Glamping',
        city: 'Springdale',
        state: 'UT',
        brand_id: underCanvasId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'p2',
        slug: null,
        property_name: 'ULUM Moab',
        property_type: 'Glamping',
        city: 'Moab',
        state: 'UT',
        brand_id: ulumId,
        quantity_of_units: 5,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 500,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 3,
        property_id: 'p3',
        slug: null,
        property_name: 'AutoCamp Zion',
        property_type: 'Glamping',
        city: 'Springdale',
        state: 'UT',
        brand_id: autocampId,
        quantity_of_units: 8,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 350,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands).toHaveLength(2);
    expect(result.brands[0]?.slug).toBe('under-canvas');
    expect(result.brands[0]?.propertyCount).toBe(2);
    expect(result.brands[0]?.unitCount).toBe(15);
    expect(result.brands[0]?.rank).toBe(1);
    expect(result.brands[0]?.subBrandNote).toBe('Includes ULUM');
    expect(result.brands[0]?.avgRetailDailyRate).toBe(450);
    expect(result.brands[1]?.slug).toBe('autocamp');
    expect(result.brands[1]?.avgRetailDailyRate).toBe(350);
    expect(result.brands[1]?.subBrandNote).toBeNull();
    expect(result.totalBrandedProperties).toBe(3);
    expect(result.brandsWithPublishedProperties).toBe(2);
  });

  it('counts only properties in the selected market', () => {
    const rows = [
      {
        id: 1,
        property_id: 'us1',
        slug: null,
        property_name: 'Under Canvas Utah',
        property_type: 'Glamping',
        city: 'Moab',
        state: 'UT',
        country: 'United States',
        brand_id: underCanvasId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'ca1',
        slug: null,
        property_name: 'Under Canvas Ontario',
        property_type: 'Glamping',
        city: 'Toronto',
        state: 'ON',
        country: 'Canada',
        brand_id: underCanvasId,
        quantity_of_units: 8,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 350,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const usResult = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);
    const caResult = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'ca', 1);

    expect(usResult.brands[0]?.propertyCount).toBe(1);
    expect(usResult.brands[0]?.unitCount).toBe(10);
    expect(caResult.brands[0]?.propertyCount).toBe(1);
    expect(caResult.brands[0]?.unitCount).toBe(8);
  });

  it('ranks AutoCamp standalone with a Hilton partnership note instead of rolling into Hilton', () => {
    const hiltonId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const autocampId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const outsetId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

    const hiltonBrands: GlampingBrand[] = [
      brand({
        id: hiltonId,
        slug: 'hilton',
        display_name: 'Hilton',
        brand_tier: 'portfolio',
      }),
      brand({
        id: autocampId,
        slug: 'autocamp',
        display_name: 'AutoCamp',
        brand_tier: 'sub_brand',
        parent_brand_id: hiltonId,
      }),
      brand({
        id: outsetId,
        slug: 'hilton-outset-collection',
        display_name: 'Outset Collection by Hilton',
        brand_tier: 'sub_brand',
        parent_brand_id: hiltonId,
      }),
    ];

    const rows = [
      {
        id: 30,
        property_id: 'ac1',
        slug: null,
        property_name: 'AutoCamp Zion',
        property_type: 'Glamping',
        city: 'Springdale',
        state: 'UT',
        brand_id: autocampId,
        quantity_of_units: 8,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 350,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 31,
        property_id: 'sl1',
        slug: null,
        property_name: 'Slackline Moab',
        property_type: 'Glamping',
        city: 'Moab',
        state: 'UT',
        brand_id: outsetId,
        quantity_of_units: 4,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const byId = new Map(hiltonBrands.map((b) => [b.id, b]));
    expect(rankingRootBrandId(autocampId, byId)).toBe(autocampId);
    expect(rankingRootBrandId(outsetId, byId)).toBe(hiltonId);

    const result = aggregateTopGlampingBrands(hiltonBrands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands).toHaveLength(2);
    expect(result.brands.find((r) => r.slug === 'autocamp')).toMatchObject({
      displayName: 'AutoCamp',
      propertyCount: 1,
      subBrandNote: 'Partnered with Hilton',
    });
    expect(result.brands.find((r) => r.slug === 'hilton')).toMatchObject({
      displayName: 'Hilton',
      propertyCount: 1,
      subBrandNote: 'Includes Outset Collection by Hilton',
    });
    expect(result.brands.some((r) => r.subBrandNote?.includes('AutoCamp'))).toBe(false);
  });

  it('ranks Postcard Cabins on its own row when properties are tagged to Outdoor Collection', () => {
    const marriottId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const outdoorId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const postcardId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    const marriottBrands: GlampingBrand[] = [
      brand({
        id: marriottId,
        slug: 'marriott',
        display_name: 'Marriott',
        brand_tier: 'portfolio',
      }),
      brand({
        id: outdoorId,
        slug: 'marriott-outdoor-collection',
        display_name: 'Outdoor Collection by Marriott Bonvoy',
        brand_tier: 'sub_brand',
        parent_brand_id: marriottId,
      }),
      brand({
        id: postcardId,
        slug: 'postcard-cabins',
        display_name: 'Postcard Cabins',
        brand_tier: 'sub_brand',
        parent_brand_id: outdoorId,
      }),
    ];

    const rows = [
      {
        id: 20,
        property_id: 'pc1',
        slug: null,
        property_name: 'Postcard Cabins Big Bear',
        property_type: 'Glamping',
        city: 'Big Bear',
        state: 'CA',
        brand_id: outdoorId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 300,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 21,
        property_id: 'pc2',
        slug: null,
        property_name: 'Postcard Cabins Hill Country',
        property_type: 'Glamping',
        city: 'Wimberley',
        state: 'TX',
        brand_id: outdoorId,
        quantity_of_units: 8,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 280,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 22,
        property_id: 'tb1',
        slug: null,
        property_name: 'Trailborn Grand Canyon',
        property_type: 'Glamping',
        city: 'Williams',
        state: 'AZ',
        brand_id: outdoorId,
        quantity_of_units: 6,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(
      marriottBrands,
      rows,
      TOP_GLAMPING_BRANDS_COUNT,
      'us',
      TOP_BRANDS_MIN_PROPERTY_COUNT
    );

    expect(result.brands).toHaveLength(1);
    expect(result.brands[0]).toMatchObject({
      slug: 'postcard-cabins',
      displayName: 'Postcard Cabins',
      propertyCount: 2,
      subBrandNote: 'Owned by Marriott',
    });
  });

  it('includes child sub-brands when properties are tagged to the parent portfolio brand', () => {
    const marriottId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const outdoorId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const postcardId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    const marriottBrands: GlampingBrand[] = [
      brand({
        id: marriottId,
        slug: 'marriott',
        display_name: 'Marriott',
        brand_tier: 'portfolio',
      }),
      brand({
        id: outdoorId,
        slug: 'marriott-outdoor-collection',
        display_name: 'Outdoor Collection by Marriott Bonvoy',
        brand_tier: 'sub_brand',
        parent_brand_id: marriottId,
      }),
      brand({
        id: postcardId,
        slug: 'postcard-cabins',
        display_name: 'Postcard Cabins',
        brand_tier: 'sub_brand',
        parent_brand_id: outdoorId,
      }),
    ];

    const rows = [
      {
        id: 20,
        property_id: 'pc1',
        slug: null,
        property_name: 'Postcard Cabins Big Bear',
        property_type: 'Glamping',
        city: 'Big Bear',
        state: 'CA',
        brand_id: outdoorId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 300,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(marriottBrands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands[0]).toMatchObject({
      slug: 'postcard-cabins',
      displayName: 'Postcard Cabins',
      propertyCount: 1,
      subBrandNote: 'Owned by Marriott',
    });
  });

  it('lists Best Western portfolio under WorldHotels Backdrop with an ownership note', () => {
    const bestWesternId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const backdropId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

    const bestWesternBrands: GlampingBrand[] = [
      brand({
        id: bestWesternId,
        slug: 'best-western',
        display_name: 'Best Western',
        brand_tier: 'portfolio',
      }),
      brand({
        id: backdropId,
        slug: 'worldhotels-backdrop',
        display_name: 'WorldHotels Backdrop',
        brand_tier: 'sub_brand',
        parent_brand_id: bestWesternId,
      }),
    ];

    const rows = [
      {
        id: 30,
        property_id: 'whb1',
        slug: null,
        property_name: 'WorldHotels Backdrop Asheville River Cabins',
        property_type: 'Glamping',
        city: 'Asheville',
        state: 'NC',
        brand_id: backdropId,
        quantity_of_units: 29,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 275,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(bestWesternBrands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands[0]).toMatchObject({
      slug: 'worldhotels-backdrop',
      displayName: 'WorldHotels Backdrop',
      subBrandNote: 'Owned by Best Western',
    });
  });

  it('excludes Glamping Resort rows from brand counts', () => {
    const wildhavenId = '99999999-9999-4999-8999-999999999999';
    const wildhavenBrands: GlampingBrand[] = [
      brand({
        id: wildhavenId,
        slug: 'wildhaven-glamping',
        display_name: 'Wildhaven Glamping',
        brand_tier: 'standalone',
      }),
    ];
    const rows = [
      {
        id: 1,
        property_id: 'wh1',
        slug: null,
        property_name: 'Wildhaven Sonoma',
        property_type: 'Glamping Resort',
        city: 'Healdsburg',
        state: 'CA',
        brand_id: wildhavenId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'wh2',
        slug: null,
        property_name: 'Wildhaven Yosemite',
        property_type: 'Glamping Resort',
        city: 'Mariposa',
        state: 'CA',
        brand_id: wildhavenId,
        quantity_of_units: 8,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 350,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(
      wildhavenBrands,
      rows,
      TOP_GLAMPING_BRANDS_COUNT
    );

    expect(result.brands).toHaveLength(0);
    expect(result.totalBrandedProperties).toBe(0);
    expect(result.totalBrandedUnits).toBe(0);
  });

  it('excludes rows whose property_type is not Glamping', () => {
    const rows = [
      {
        id: 1,
        property_id: 'g1',
        slug: null,
        property_name: 'Glamping Camp',
        property_type: 'Glamping',
        city: 'Denver',
        state: 'CO',
        brand_id: autocampId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 400,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'rv1',
        slug: null,
        property_name: 'RV Resort Same Brand',
        property_type: 'RV Resort',
        city: 'Boulder',
        state: 'CO',
        brand_id: autocampId,
        quantity_of_units: 50,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 120,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands[0]?.propertyCount).toBe(1);
    expect(result.brands[0]?.unitCount).toBe(10);
    expect(result.totalBrandedProperties).toBe(1);
    expect(result.totalBrandedUnits).toBe(10);
  });

  it('dedupes multiple rows for the same logical property', () => {
    const rows = [
      {
        id: 10,
        property_id: 'same',
        slug: null,
        property_name: 'Camp A',
        property_type: 'Glamping',
        city: 'Denver',
        state: 'CO',
        brand_id: autocampId,
        quantity_of_units: 2,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 200,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 11,
        property_id: 'same',
        slug: null,
        property_name: 'Camp A',
        property_type: 'Glamping',
        city: 'Denver',
        state: 'CO',
        brand_id: autocampId,
        quantity_of_units: 3,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 220,
        updated_at: '2026-05-02T00:00:00Z',
        created_at: '2026-05-02T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands[0]?.propertyCount).toBe(1);
    expect(result.brands[0]?.unitCount).toBe(5);
  });

  it('excludes state-park concessions from brand property and unit counts', () => {
    const timberlineId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const timberlineBrands: GlampingBrand[] = [
      brand({
        id: timberlineId,
        slug: 'timberline-glamping-co',
        display_name: 'Timberline Glamping Co.',
        brand_tier: 'standalone',
      }),
    ];
    const rows = [
      {
        id: 100,
        property_id: 'park',
        slug: null,
        property_name: 'Timberline Glamping at Unicoi State Park',
        property_type: 'Glamping',
        city: 'Helen',
        state: 'GA',
        country: 'United States',
        brand_id: timberlineId,
        quantity_of_units: 4,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 200,
        land_operator_category: 'state_park',
        updated_at: '2026-05-26T00:00:00Z',
        created_at: '2026-05-26T00:00:00Z',
      },
      {
        id: 101,
        property_id: 'private',
        slug: null,
        property_name: 'Timberline Glamping at Pine Acres',
        property_type: 'Glamping',
        city: 'Acworth',
        state: 'GA',
        country: 'United States',
        brand_id: timberlineId,
        quantity_of_units: 4,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 162,
        land_operator_category: 'private_commercial',
        updated_at: '2026-05-26T00:00:00Z',
        created_at: '2026-05-26T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(
      timberlineBrands,
      rows,
      TOP_GLAMPING_BRANDS_COUNT,
      'us',
      1
    );

    expect(result.brands).toHaveLength(1);
    expect(result.brands[0]?.propertyCount).toBe(1);
    expect(result.brands[0]?.unitCount).toBe(4);
    expect(result.brands[0]?.avgRetailDailyRate).toBe(162);
  });

  it('omits brands with fewer than TOP_BRANDS_MIN_PROPERTY_COUNT locations', () => {
    const soloId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const duoId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const soloBrands: GlampingBrand[] = [
      brand({ id: soloId, slug: 'the-glamping-collective', display_name: 'The Glamping Collective' }),
      brand({ id: duoId, slug: 'worldhotels-backdrop', display_name: 'WorldHotels Backdrop' }),
    ];
    const rows = [
      {
        id: 1,
        property_id: 'solo',
        slug: null,
        property_name: 'The Glamping Collective',
        property_type: 'Glamping',
        city: 'Clyde',
        state: 'NC',
        brand_id: soloId,
        quantity_of_units: 20,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 500,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'duo1',
        slug: null,
        property_name: 'WorldHotels Backdrop Asheville',
        property_type: 'Glamping',
        city: 'Asheville',
        state: 'NC',
        brand_id: duoId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 275,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 3,
        property_id: 'duo2',
        slug: null,
        property_name: 'WorldHotels Backdrop Smoky Mountains',
        property_type: 'Glamping',
        city: 'Townsend',
        state: 'TN',
        brand_id: duoId,
        quantity_of_units: 12,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 280,
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(
      soloBrands,
      rows,
      TOP_GLAMPING_BRANDS_COUNT,
      'us',
      TOP_BRANDS_MIN_PROPERTY_COUNT
    );

    expect(TOP_BRANDS_MIN_PROPERTY_COUNT).toBe(2);
    expect(result.brands).toHaveLength(1);
    expect(result.brands[0]?.slug).toBe('worldhotels-backdrop');
    expect(result.brands.some((r) => r.slug === 'the-glamping-collective')).toBe(false);
  });

  it('excludes Cancelled properties from brand rollups', () => {
    const rows = [
      {
        id: 1,
        property_id: 'open',
        slug: null,
        property_name: 'AutoCamp Yosemite',
        property_type: 'Glamping',
        city: 'Midpines',
        state: 'CA',
        country: 'United States',
        brand_id: autocampId,
        quantity_of_units: 10,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 300,
        land_operator_category: 'private_commercial',
        is_open: 'Yes',
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        property_id: 'cancelled',
        slug: null,
        property_name: 'AutoCamp Napa',
        property_type: 'Glamping',
        city: 'Napa',
        state: 'CA',
        country: 'United States',
        brand_id: autocampId,
        quantity_of_units: 100,
        property_total_sites: null,
        rate_avg_retail_daily_rate: 250,
        land_operator_category: 'private_commercial',
        is_open: 'Cancelled',
        updated_at: '2026-05-01T00:00:00Z',
        created_at: '2026-05-01T00:00:00Z',
      },
    ];

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT, 'us', 1);

    expect(result.brands).toHaveLength(1);
    expect(result.brands[0]?.propertyCount).toBe(1);
    expect(result.brands[0]?.unitCount).toBe(10);
  });
});

describe('formatRetailDailyRate', () => {
  it('formats a rounded dollar amount', () => {
    expect(formatRetailDailyRate(449.6)).toBe('$450');
  });

  it('returns em dash when rate is missing', () => {
    expect(formatRetailDailyRate(null)).toBe('—');
  });
});

describe('formatPartnerBrandNote', () => {
  it('formats the partnership line', () => {
    expect(formatPartnerBrandNote('Hilton')).toBe('Partnered with Hilton');
  });
});

describe('formatSubBrandNote', () => {
  it('returns null for empty lists', () => {
    expect(formatSubBrandNote([])).toBeNull();
  });

  it('joins multiple sub-brand names', () => {
    expect(formatSubBrandNote(['Postcard Cabins', 'Outdoor Collection by Marriott Bonvoy'])).toBe(
      'Includes Postcard Cabins, Outdoor Collection by Marriott Bonvoy'
    );
  });
});
