import {
  aggregateTopGlampingBrands,
  formatRetailDailyRate,
  formatSubBrandNote,
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

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT);

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

  it('dedupes multiple rows for the same logical property', () => {
    const rows = [
      {
        id: 10,
        property_id: 'same',
        slug: null,
        property_name: 'Camp A',
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

    const result = aggregateTopGlampingBrands(brands, rows, TOP_GLAMPING_BRANDS_COUNT);

    expect(result.brands[0]?.propertyCount).toBe(1);
    expect(result.brands[0]?.unitCount).toBe(5);
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
