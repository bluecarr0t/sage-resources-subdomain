/**
 * Public brand listing pages: `/[locale]/brand/[slug]`
 */
import { unstable_noStore as noStore } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import {
  dedupeRowsToOutpostAnchors,
  propertyOutpostGroupKey,
} from '@/lib/admin/glamping-list-anchor-key';
import { PUBLISHED_RESEARCH_STATUS, resolvePublicSlugForAnchor } from '@/lib/published-property-pages';
import { parseCoordinates, type SageProperty } from '@/lib/types/sage';
import { chainLabelFromPropertyName } from '@/lib/brand-chain-label';
import type { GlampingBrand, GlampingBrandTier } from '@/lib/glamping-brands';
import { excludeClosedGlampingRows } from '@/lib/glamping-is-open';
import { applyBrandsPagePropertyTypeFilter } from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedLandOperatorForPublicMap } from '@/lib/glamping-land-operator-category';
import { applyBrandsPageLandOperatorFilter } from '@/lib/public-map-cohort-filters';

const PROPERTIES_TABLE = 'all_glamping_properties';
const BRANDS_TABLE = 'glamping_brands';
const PAGE_SIZE = 1000;

/** Slugs blocked from public `/brand/[slug]` pages (empty unless a page must stay hidden). */
export const EXCLUDED_PUBLIC_BRAND_PAGE_SLUGS = new Set<string>();

export function isPublicBrandPageSlug(slug: string): boolean {
  return !EXCLUDED_PUBLIC_BRAND_PAGE_SLUGS.has(slug.trim());
}

/**
 * Outdoor Collection shares `brand_id` with Postcard Cabins rows; exclude Postcard-named
 * outposts here so `/brand/postcard-cabins` and `/brand/marriott-outdoor-collection` stay distinct.
 */
export function filterRowsForPublicBrandPage(
  brandSlug: string,
  rows: SageProperty[]
): SageProperty[] {
  if (brandSlug !== 'marriott-outdoor-collection') return rows;
  return rows.filter(
    (row) => !(row.property_name ?? '').trim().toLowerCase().startsWith('postcard cabins')
  );
}

export type BrandPublicSummary = {
  id: string;
  slug: string;
  display_name: string;
  brand_tier: GlampingBrandTier;
  parent_brand_id: string | null;
  website_url: string | null;
  reported_location_count: number | null;
};

export type BrandPropertyListing = {
  anchorId: number;
  propertyName: string;
  publicSlug: string;
  city: string | null;
  state: string | null;
  country: string | null;
  unitTypes: string[];
  rate: string | number | null;
  lat: number | null;
  lon: number | null;
  groupKey: string;
};

export type BrandMapPin = {
  lat: number;
  lng: number;
  slug: string;
  propertyName: string;
};

export function shouldRollupSubBrands(
  brand: Pick<GlampingBrand, 'brand_tier' | 'id'>,
  allBrands: GlampingBrand[]
): boolean {
  if (brand.brand_tier === 'portfolio') return true;
  return allBrands.some((b) => b.parent_brand_id === brand.id);
}

/** Top portfolio company for the "Part of …" line (skips intermediate sub-brands). */
export function portfolioParentBrandForDisplay(
  brand: Pick<GlampingBrand, 'parent_brand_id'>,
  allBrands: readonly GlampingBrand[]
): GlampingBrand | null {
  if (!brand.parent_brand_id) return null;
  let current = allBrands.find((b) => b.id === brand.parent_brand_id) ?? null;
  if (!current) return null;
  while (current.parent_brand_id) {
    const next = allBrands.find((b) => b.id === current!.parent_brand_id);
    if (!next) break;
    current = next;
  }
  return current;
}

function toBrandPublicSummary(brand: GlampingBrand): BrandPublicSummary {
  return {
    id: brand.id,
    slug: brand.slug,
    display_name: brand.display_name,
    brand_tier: brand.brand_tier,
    parent_brand_id: brand.parent_brand_id,
    website_url: brand.website_url,
    reported_location_count: brand.reported_location_count,
  };
}

async function fetchAllBrands(): Promise<GlampingBrand[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select(
      'id, slug, display_name, parent_brand_id, brand_tier, legacy_chain_key, website_url, reported_location_count, notes'
    )
    .order('display_name', { ascending: true });

  if (error) {
    console.error('[fetchAllBrands]', error);
    return [];
  }
  return (data ?? []) as GlampingBrand[];
}

async function brandIdsForSlugRollup(
  slug: string,
  includeSubBrands: boolean
): Promise<string[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('brand_ids_for_slug_rollup', {
    p_brand_slug: slug,
    p_include_sub_brands: includeSubBrands,
  });

  if (error) {
    console.error('[brandIdsForSlugRollup]', slug, error);
    return [];
  }

  if (Array.isArray(data)) {
    return data.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

export async function getBrandBySlug(slug: string): Promise<BrandPublicSummary | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select('id, slug, display_name, brand_tier, parent_brand_id, website_url, reported_location_count')
    .eq('slug', slug.trim())
    .maybeSingle();

  if (error || !data) return null;
  return data as BrandPublicSummary;
}

export async function getBrandSummaryById(
  brandId: string | null | undefined
): Promise<BrandPublicSummary | null> {
  if (!brandId?.trim()) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select('id, slug, display_name, brand_tier, parent_brand_id, website_url, reported_location_count')
    .eq('id', brandId.trim())
    .maybeSingle();

  if (error || !data) return null;
  return data as BrandPublicSummary;
}

async function fetchPublishedRowsForBrandIds(brandIds: string[]): Promise<SageProperty[]> {
  if (brandIds.length === 0) return [];

  const supabase = createServerClient();
  const all: SageProperty[] = [];

  for (let i = 0; i < brandIds.length; i += 100) {
    const chunk = brandIds.slice(i, i + 100);
    let from = 0;
    while (true) {
      const { data, error } = await applyBrandsPageLandOperatorFilter(
        applyBrandsPagePropertyTypeFilter(
          supabase
            .from(PROPERTIES_TABLE)
            .select('*')
            .eq('research_status', PUBLISHED_RESEARCH_STATUS)
            .neq('is_open', 'Closed')
            .neq('is_open', 'No')
            .in('brand_id', chunk)
        )
      ).range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error('[fetchPublishedRowsForBrandIds]', error);
        break;
      }
      if (!data?.length) break;
      all.push(...(data as SageProperty[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return all;
}

/** Properties tagged to a parent portfolio but named for a child sub-brand chain key. */
export function filterPublishedRowsForSubBrandChainKey(
  rows: SageProperty[],
  legacyChainKey: string | null | undefined
): SageProperty[] {
  const key = legacyChainKey?.trim().toLowerCase();
  if (!key) return [];
  return rows.filter((row) => chainLabelFromPropertyName(row.property_name) === key);
}

async function fetchPublishedRowsForBrand(
  brand: GlampingBrand,
  allBrands: GlampingBrand[]
): Promise<SageProperty[]> {
  const includeSubBrands = shouldRollupSubBrands(brand, allBrands);
  const brandIds = await brandIdsForSlugRollup(brand.slug, includeSubBrands);
  const directRows = await fetchPublishedRowsForBrandIds(brandIds);
  if (directRows.length > 0) return directRows;

  if (!brand.legacy_chain_key?.trim()) return directRows;

  let parentId = brand.parent_brand_id;
  while (parentId) {
    const parent = allBrands.find((b) => b.id === parentId);
    if (!parent) break;
    const parentIncludeSub = shouldRollupSubBrands(parent, allBrands);
    const parentIds = await brandIdsForSlugRollup(parent.slug, parentIncludeSub);
    const parentRows = await fetchPublishedRowsForBrandIds(parentIds);
    const matched = filterPublishedRowsForSubBrandChainKey(parentRows, brand.legacy_chain_key);
    if (matched.length > 0) return matched;
    parentId = parent.parent_brand_id;
  }

  return directRows;
}

function buildListingsFromRows(rows: SageProperty[]): BrandPropertyListing[] {
  const openRows = excludeClosedGlampingRows(rows).filter(
    (row) => !isExcludedLandOperatorForPublicMap(row.land_operator_category)
  );
  const anchors = dedupeRowsToOutpostAnchors(
    openRows as Array<SageProperty & Record<string, unknown>>
  ) as SageProperty[];
  const usedSlugs = new Set<string>();
  const listings: BrandPropertyListing[] = [];

  for (const anchor of anchors) {
    const groupKey = propertyOutpostGroupKey(anchor);
    const groupRows = openRows.filter((r) => propertyOutpostGroupKey(r) === groupKey);
    const publicSlug = resolvePublicSlugForAnchor(anchor, usedSlugs);
    usedSlugs.add(publicSlug);
    const unitTypes = [
      ...new Set(
        groupRows
          .map((r) => r.unit_type)
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      ),
    ].sort();
    const coords = parseCoordinates(anchor.lat, anchor.lon);

    listings.push({
      anchorId: Number(anchor.id),
      propertyName: anchor.property_name?.trim() || 'Unnamed property',
      publicSlug,
      city: anchor.city ?? null,
      state: anchor.state ?? null,
      country: anchor.country ?? null,
      unitTypes,
      rate: anchor.rate_avg_retail_daily_rate ?? null,
      lat: coords?.[0] ?? null,
      lon: coords?.[1] ?? null,
      groupKey,
    });
  }

  listings.sort((a, b) => a.propertyName.localeCompare(b.propertyName, 'en', { sensitivity: 'base' }));
  return listings;
}

export function listingsToMapPins(listings: BrandPropertyListing[]): BrandMapPin[] {
  return listings
    .filter(
      (l) =>
        typeof l.lat === 'number' &&
        typeof l.lon === 'number' &&
        Number.isFinite(l.lat) &&
        Number.isFinite(l.lon)
    )
    .map((l) => ({
      lat: l.lat as number,
      lng: l.lon as number,
      slug: l.publicSlug,
      propertyName: l.propertyName,
    }));
}

export async function getBrandPageData(slug: string): Promise<{
  brand: BrandPublicSummary;
  parentBrand: BrandPublicSummary | null;
  subBrands: BrandPublicSummary[];
  listings: BrandPropertyListing[];
  mapPins: BrandMapPin[];
  includeSubBrandRollup: boolean;
} | null> {
  const normalizedSlug = slug.trim();
  if (!isPublicBrandPageSlug(normalizedSlug)) return null;

  // Avoid stale empty Supabase responses cached before brand backfill/publish.
  noStore();
  const allBrands = await fetchAllBrands();
  const brand = allBrands.find((b) => b.slug === normalizedSlug);
  if (!brand) return null;

  const includeSubBrands = shouldRollupSubBrands(brand, allBrands);
  const rows = filterRowsForPublicBrandPage(
    normalizedSlug,
    await fetchPublishedRowsForBrand(brand, allBrands)
  );
  const listings = buildListingsFromRows(rows);

  if (listings.length === 0) return null;

  const portfolioParent = portfolioParentBrandForDisplay(brand, allBrands);

  const subBrands = includeSubBrands
    ? allBrands
        .filter((b) => b.parent_brand_id === brand.id)
        .map((b) => toBrandPublicSummary(b))
        .sort((a, b) => a.display_name.localeCompare(b.display_name, 'en', { sensitivity: 'base' }))
    : [];

  return {
    brand: toBrandPublicSummary(brand),
    parentBrand: portfolioParent ? toBrandPublicSummary(portfolioParent) : null,
    subBrands,
    listings,
    mapPins: listingsToMapPins(listings),
    includeSubBrandRollup: includeSubBrands,
  };
}

/** Brand slugs that have at least one published property (rollup-aware). */
export async function getAllPublicBrandSlugs(): Promise<Array<{ slug: string }>> {
  noStore();
  const allBrands = await fetchAllBrands();
  const slugs: string[] = [];

  for (const brand of allBrands) {
    const includeSubBrands = shouldRollupSubBrands(brand, allBrands);
    const brandIds = await brandIdsForSlugRollup(brand.slug, includeSubBrands);
    if (brandIds.length === 0) continue;

    const supabase = createServerClient();
    const { count, error } = await applyBrandsPageLandOperatorFilter(
      applyBrandsPagePropertyTypeFilter(
        supabase
          .from(PROPERTIES_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('research_status', PUBLISHED_RESEARCH_STATUS)
          .neq('is_open', 'Closed')
          .neq('is_open', 'No')
          .in('brand_id', brandIds.slice(0, 100))
      )
    );

    if (!error && count && count > 0 && isPublicBrandPageSlug(brand.slug)) {
      slugs.push(brand.slug);
    }
  }

  return [...new Set(slugs)]
    .filter(isPublicBrandPageSlug)
    .sort()
    .map((slug) => ({ slug }));
}
