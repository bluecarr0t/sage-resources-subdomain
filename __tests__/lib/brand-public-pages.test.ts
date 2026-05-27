import {
  filterPublishedRowsForSubBrandChainKey,
  filterRowsForPublicBrandPage,
  isPublicBrandPageSlug,
  portfolioParentBrandForDisplay,
} from '@/lib/brand-public-pages';
import type { GlampingBrand } from '@/lib/glamping-brands';
import type { SageProperty } from '@/lib/types/sage';

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

const row = (property_name: string, brand_id = 'parent-id'): SageProperty =>
  ({
    property_name,
    brand_id,
    research_status: 'published',
    property_type: 'Glamping',
  }) as SageProperty;

describe('isPublicBrandPageSlug', () => {
  it('allows marriott-outdoor-collection and other brand slugs', () => {
    expect(isPublicBrandPageSlug('marriott-outdoor-collection')).toBe(true);
    expect(isPublicBrandPageSlug('postcard-cabins')).toBe(true);
    expect(isPublicBrandPageSlug('marriott')).toBe(true);
  });
});

describe('filterRowsForPublicBrandPage', () => {
  it('drops Postcard Cabins rows on the Outdoor Collection brand page', () => {
    const rows = [
      row('Postcard Cabins Big Bear'),
      row('Trailborn Jackson Hole'),
    ];
    const filtered = filterRowsForPublicBrandPage('marriott-outdoor-collection', rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.property_name).toBe('Trailborn Jackson Hole');
  });

  it('does not filter rows for other brand slugs', () => {
    const rows = [row('Postcard Cabins Big Bear')];
    expect(filterRowsForPublicBrandPage('postcard-cabins', rows)).toHaveLength(1);
  });
});

describe('portfolioParentBrandForDisplay', () => {
  it('returns the portfolio root, not the immediate sub-brand parent', () => {
    const marriottId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const outdoorId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const postcardId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    const brands: GlampingBrand[] = [
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

    const parent = portfolioParentBrandForDisplay(
      brands.find((b) => b.slug === 'postcard-cabins')!,
      brands
    );
    expect(parent?.slug).toBe('marriott');
    expect(parent?.display_name).toBe('Marriott');
  });
});

describe('filterPublishedRowsForSubBrandChainKey', () => {
  it('keeps rows whose property name maps to the sub-brand chain key', () => {
    const rows = [
      row('Postcard Cabins Big Bear'),
      row('Trailborn Jackson Hole'),
    ];
    expect(filterPublishedRowsForSubBrandChainKey(rows, 'postcard cabins')).toHaveLength(1);
    expect(filterPublishedRowsForSubBrandChainKey(rows, 'postcard cabins')[0]?.property_name).toBe(
      'Postcard Cabins Big Bear'
    );
  });

  it('returns empty when chain key is missing', () => {
    expect(filterPublishedRowsForSubBrandChainKey([row('Postcard Cabins X')], null)).toEqual([]);
  });
});
