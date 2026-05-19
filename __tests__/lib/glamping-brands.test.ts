import {
  isValidGlampingBrandId,
  sortGlampingBrandsForSelect,
  type GlampingBrand,
} from '@/lib/glamping-brands';

const base = (overrides: Partial<GlampingBrand>): GlampingBrand => ({
  id: overrides.id ?? '00000000-0000-4000-8000-000000000001',
  slug: overrides.slug ?? 'test',
  display_name: overrides.display_name ?? 'Test',
  parent_brand_id: overrides.parent_brand_id ?? null,
  brand_tier: overrides.brand_tier ?? 'standalone',
  legacy_chain_key: overrides.legacy_chain_key ?? null,
  website_url: null,
  reported_location_count: null,
  notes: null,
});

describe('isValidGlampingBrandId', () => {
  it('accepts lowercase uuid', () => {
    expect(
      isValidGlampingBrandId('a1b2c3d4-e5f6-4789-a012-3456789abcde')
    ).toBe(true);
  });

  it('rejects empty and non-uuid', () => {
    expect(isValidGlampingBrandId('')).toBe(false);
    expect(isValidGlampingBrandId('under-canvas')).toBe(false);
  });
});

describe('sortGlampingBrandsForSelect', () => {
  it('orders portfolio before standalone before sub-brand and labels sub-brands', () => {
    const underCanvasId = '11111111-1111-4111-8111-111111111111';
    const ulumId = '22222222-2222-4222-8222-222222222222';
    const autocampId = '33333333-3333-4333-8333-333333333333';

    const brands: GlampingBrand[] = [
      base({
        id: ulumId,
        slug: 'ulum',
        display_name: 'ULUM',
        brand_tier: 'sub_brand',
        parent_brand_id: underCanvasId,
      }),
      base({
        id: autocampId,
        slug: 'autocamp',
        display_name: 'AutoCamp',
        brand_tier: 'standalone',
      }),
      base({
        id: underCanvasId,
        slug: 'under-canvas',
        display_name: 'Under Canvas',
        brand_tier: 'portfolio',
      }),
    ];

    const options = sortGlampingBrandsForSelect(brands);
    expect(options[0]?.slug).toBe('under-canvas');
    expect(options[1]?.slug).toBe('autocamp');
    expect(options[2]?.slug).toBe('ulum');
    expect(options[2]?.label).toContain('Under Canvas');
    expect(options[2]?.label.startsWith('↳')).toBe(true);
  });
});
