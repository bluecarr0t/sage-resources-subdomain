/**
 * Top glamping brands by published property count (portfolio rollup to root brand).
 * Powers `/brands` overview page.
 */
import { createServerClient } from '@/lib/supabase';
import {
  dedupeRowsToOutpostAnchors,
  propertyOutpostGroupKey,
} from '@/lib/admin/glamping-list-anchor-key';
import type { GlampingBrand, GlampingBrandTier } from '@/lib/glamping-brands';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { applyBrandsPageLandOperatorFilter } from '@/lib/public-map-cohort-filters';
import { isExcludedLandOperatorForPublicMap } from '@/lib/glamping-land-operator-category';
import { isUnitedStatesCountryFilterValue } from '@/lib/admin/glamping-sage-data-list';
import {
  countryValuesForGlampingMarketSnapshot,
  type GlampingMarketSnapshotMarket,
} from '@/lib/glamping-market-snapshot-region';
import { PUBLISHED_RESEARCH_STATUS } from '@/lib/published-property-pages';
import type { SageProperty } from '@/lib/types/sage';

const BRANDS_TABLE = 'glamping_brands';
const PROPERTIES_TABLE = 'all_glamping_properties';
const PAGE_SIZE = 1000;

export const TOP_GLAMPING_BRANDS_COUNT = 10;

/** Brands need at least this many published outposts to rank on `/brands`. */
export const TOP_BRANDS_MIN_PROPERTY_COUNT = 2;

/** Sub-brands that rank on `/brands` at their own row (portfolio parent is a partnership only). */
export const TOP_BRANDS_STANDALONE_PARTNER_SLUGS = new Set<string>(['autocamp']);

/**
 * Portfolio roots that list under a lead consumer sub-brand on `/brands`.
 * Rollup counts still include the full portfolio; only label and link change.
 */
export const TOP_BRANDS_LEAD_DISPLAY_BY_ROOT_SLUG: Readonly<
  Record<string, { leadSlug: string; ownerNote: string }>
> = {
  'best-western': {
    leadSlug: 'worldhotels-backdrop',
    ownerNote: 'Owned by Best Western',
  },
};

/** Sub-brands that rank on their own `/brands` row with a portfolio ownership line. */
export const TOP_BRANDS_OWNERSHIP_NOTE_BY_SLUG: Readonly<Record<string, string>> = {
  'postcard-cabins': 'Owned by Marriott',
  'marriott-outdoor-collection': 'Owned by Marriott',
};

export type TopGlampingBrandRow = {
  slug: string;
  displayName: string;
  brandTier: GlampingBrandTier;
  websiteUrl: string | null;
  reportedLocationCount: number | null;
  propertyCount: number;
  unitCount: number;
  /** Mean of per-property avg retail daily rates across published locations in the rollup */
  avgRetailDailyRate: number | null;
  /** e.g. "Includes ULUM, Postcard Cabins" — null when rollup is a single brand only */
  subBrandNote: string | null;
  rank: number;
};

/** e.g. "$450" — brand-wide mean of published per-property avg retail daily rates */
export function formatRetailDailyRate(rate: number | null): string {
  if (rate == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(rate));
}

/** Human-readable note listing sub-brands represented in a portfolio rollup. */
export function formatSubBrandNote(subBrandDisplayNames: readonly string[]): string | null {
  if (subBrandDisplayNames.length === 0) return null;
  return `Includes ${subBrandDisplayNames.join(', ')}`;
}

/** Partnership line for brands that rank standalone while retaining a portfolio parent link. */
export function formatPartnerBrandNote(parentDisplayName: string): string {
  return `Partnered with ${parentDisplayName}`;
}

function subBrandNamesForRollup(
  rootId: string,
  contributingBrandIds: Set<string>,
  byId: Map<string, BrandRow>,
  propertyNamesInRollup: readonly string[]
): string[] {
  const names = new Set<string>();

  const addPathToRoot = (brandId: string) => {
    let current = byId.get(brandId);
    while (current && current.id !== rootId) {
      names.add(current.display_name);
      if (!current.parent_brand_id) break;
      current = byId.get(current.parent_brand_id);
    }
  };

  for (const id of contributingBrandIds) {
    if (id !== rootId) addPathToRoot(id);
  }

  // Properties may be tagged to a parent portfolio brand while names still identify a child sub-brand.
  for (const child of byId.values()) {
    if (!child.parent_brand_id || !contributingBrandIds.has(child.parent_brand_id)) continue;
    const prefix = child.display_name.toLowerCase();
    const hasNamedProperty = propertyNamesInRollup.some((name) =>
      name.toLowerCase().startsWith(prefix)
    );
    if (hasNamedProperty) names.add(child.display_name);
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

export type TopGlampingBrandsOverview = {
  brands: TopGlampingBrandRow[];
  totalBrandedProperties: number;
  totalBrandedUnits: number;
  brandsWithPublishedProperties: number;
  asOf: string;
};

type BrandRow = Pick<
  GlampingBrand,
  'id' | 'slug' | 'display_name' | 'parent_brand_id' | 'brand_tier' | 'website_url' | 'reported_location_count'
>;

type PropertyRow = Pick<
  SageProperty,
  | 'id'
  | 'property_id'
  | 'slug'
  | 'property_name'
  | 'property_type'
  | 'city'
  | 'state'
  | 'country'
  | 'brand_id'
  | 'quantity_of_units'
  | 'property_total_sites'
  | 'rate_avg_retail_daily_rate'
  | 'land_operator_category'
  | 'updated_at'
  | 'created_at'
>;

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function unitsForRow(row: PropertyRow): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  return Math.round(fromUnits ?? fromTotal ?? 0);
}

/** Whether a published property counts toward `/brands` for the selected market. */
export function propertyMatchesBrandsMarket(
  country: string | null | undefined,
  market: GlampingMarketSnapshotMarket
): boolean {
  const trimmed = country?.trim();
  if (!trimmed) return market === 'us';
  if (market === 'ca') {
    return countryValuesForGlampingMarketSnapshot('ca').some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
  }
  return isUnitedStatesCountryFilterValue(trimmed);
}

function parseRate(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function findBrandBySlug(byId: Map<string, BrandRow>, slug: string): BrandRow | undefined {
  return [...byId.values()].find((b) => b.slug === slug);
}

/**
 * Rollup root for `/brands` ranking — stops at standalone partner brands (e.g. AutoCamp).
 * Postcard-named rows rank as Postcard Cabins even when tagged to Outdoor Collection.
 */
export function rankingRootBrandId(
  brandId: string,
  byId: Map<string, BrandRow>,
  propertyName?: string | null
): string {
  const ln = (propertyName ?? '').trim().toLowerCase();

  if (ln.startsWith('postcard cabins')) {
    const postcard = findBrandBySlug(byId, 'postcard-cabins');
    if (postcard) return postcard.id;
  }

  let current = byId.get(brandId);
  if (!current) return brandId;

  while (true) {
    if (TOP_BRANDS_STANDALONE_PARTNER_SLUGS.has(current.slug)) return current.id;
    if (!current.parent_brand_id) return current.id;
    const parent = byId.get(current.parent_brand_id);
    if (!parent) return current.id;
    // Trailborn and other Outdoor Collection properties rank separately from Postcard.
    if (current.slug === 'marriott-outdoor-collection') return current.id;
    current = parent;
  }
}

function ownershipNoteForRankingSlug(slug: string): string | null {
  return TOP_BRANDS_OWNERSHIP_NOTE_BY_SLUG[slug] ?? null;
}

function leadDisplayForRankingRoot(
  rootBrand: BrandRow,
  byId: Map<string, BrandRow>
): Pick<TopGlampingBrandRow, 'slug' | 'displayName' | 'subBrandNote'> | null {
  const config = TOP_BRANDS_LEAD_DISPLAY_BY_ROOT_SLUG[rootBrand.slug];
  if (!config) return null;
  const lead = [...byId.values()].find((b) => b.slug === config.leadSlug);
  if (!lead) return null;
  return {
    slug: lead.slug,
    displayName: lead.display_name,
    subBrandNote: config.ownerNote,
  };
}

function partnerBrandNoteForRankingRoot(
  rankingRootId: string,
  byId: Map<string, BrandRow>
): string | null {
  const brand = byId.get(rankingRootId);
  if (!brand?.parent_brand_id) return null;
  if (!TOP_BRANDS_STANDALONE_PARTNER_SLUGS.has(brand.slug)) return null;
  const parent = byId.get(brand.parent_brand_id);
  if (!parent) return null;
  return formatPartnerBrandNote(parent.display_name);
}

function latestTimestamp(rows: PropertyRow[]): string {
  let maxMs = 0;
  for (const row of rows) {
    for (const value of [row.updated_at, row.created_at]) {
      if (!value) continue;
      const ms = Date.parse(String(value));
      if (Number.isFinite(ms) && ms > maxMs) maxMs = ms;
    }
  }
  return maxMs > 0 ? new Date(maxMs).toISOString() : new Date().toISOString();
}

async function fetchAllBrands(): Promise<BrandRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select(
      'id, slug, display_name, parent_brand_id, brand_tier, website_url, reported_location_count'
    );

  if (error) {
    console.error('[fetchAllBrands]', error);
    return [];
  }
  return (data ?? []) as BrandRow[];
}

async function fetchPublishedBrandedRows(
  market: GlampingMarketSnapshotMarket
): Promise<PropertyRow[]> {
  const supabase = createServerClient();
  const countryIn = [...countryValuesForGlampingMarketSnapshot(market)];
  const all: PropertyRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await applyBrandsPageLandOperatorFilter(
      applyGlampingOnlyPropertyTypeFilter(
        supabase
          .from(PROPERTIES_TABLE)
          .select(
            'id, property_id, slug, property_name, property_type, city, state, country, brand_id, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, land_operator_category, updated_at, created_at'
          )
          .eq('research_status', PUBLISHED_RESEARCH_STATUS)
          .not('brand_id', 'is', null)
          .in('country', countryIn)
      )
    ).range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[fetchPublishedBrandedRows]', error);
      break;
    }
    if (!data?.length) break;
    all.push(...(data as PropertyRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export function aggregateTopGlampingBrands(
  brands: BrandRow[],
  rows: PropertyRow[],
  limit = TOP_GLAMPING_BRANDS_COUNT,
  market: GlampingMarketSnapshotMarket = 'us',
  minPropertyCount = TOP_BRANDS_MIN_PROPERTY_COUNT
): TopGlampingBrandsOverview {
  const glampingRows = rows.filter(
    (row) =>
      isGlampingMarketSnapshotPropertyType(row.property_type) &&
      propertyMatchesBrandsMarket(row.country, market) &&
      !isExcludedLandOperatorForPublicMap(row.land_operator_category)
  );
  const byId = new Map(brands.map((b) => [b.id, b]));
  const anchors = dedupeRowsToOutpostAnchors(
    glampingRows as Array<PropertyRow & Record<string, unknown>>
  ) as PropertyRow[];

  type PropertyAgg = {
    rootBrandId: string;
    leafBrandId: string;
    propertyName: string;
    units: number;
    rate: number | null;
  };

  const byProperty = new Map<string, PropertyAgg>();

  for (const anchor of anchors) {
    const brandId = anchor.brand_id;
    if (!brandId || !byId.has(brandId)) continue;

    const key = propertyOutpostGroupKey(anchor);
    const groupRows = glampingRows.filter((r) => propertyOutpostGroupKey(r) === key);
    const units = groupRows.reduce((sum, r) => sum + unitsForRow(r), 0);
    const rates = groupRows
      .map((r) => parseRate(r.rate_avg_retail_daily_rate))
      .filter((n): n is number => n != null);
    const rate =
      rates.length > 0
        ? rates.reduce((sum, n) => sum + n, 0) / rates.length
        : parseRate(anchor.rate_avg_retail_daily_rate);

    byProperty.set(key, {
      rootBrandId: rankingRootBrandId(brandId, byId, anchor.property_name),
      leafBrandId: brandId,
      propertyName: anchor.property_name?.trim() ?? '',
      units,
      rate,
    });
  }

  type BrandAgg = {
    propertyCount: number;
    unitCount: number;
    rates: number[];
    contributingBrandIds: Set<string>;
    propertyNames: string[];
  };

  const byBrand = new Map<string, BrandAgg>();

  for (const agg of byProperty.values()) {
    const existing = byBrand.get(agg.rootBrandId) ?? {
      propertyCount: 0,
      unitCount: 0,
      rates: [],
      contributingBrandIds: new Set<string>(),
      propertyNames: [],
    };
    existing.propertyCount += 1;
    existing.unitCount += agg.units;
    if (agg.rate != null) existing.rates.push(agg.rate);
    existing.contributingBrandIds.add(agg.leafBrandId);
    if (agg.propertyName) existing.propertyNames.push(agg.propertyName);
    byBrand.set(agg.rootBrandId, existing);
  }

  const sorted = [...byBrand.entries()]
    .map(([id, agg]) => {
      const brand = byId.get(id);
      if (!brand) return null;
      const avgRate =
        agg.rates.length > 0
          ? agg.rates.reduce((sum, n) => sum + n, 0) / agg.rates.length
          : null;
      const leadDisplay = leadDisplayForRankingRoot(brand, byId);
      const displaySlug = leadDisplay?.slug ?? brand.slug;
      const subBrandNote =
        leadDisplay?.subBrandNote ??
        ownershipNoteForRankingSlug(displaySlug) ??
        partnerBrandNoteForRankingRoot(id, byId) ??
        formatSubBrandNote(
          subBrandNamesForRollup(id, agg.contributingBrandIds, byId, agg.propertyNames)
        );

      return {
        slug: displaySlug,
        displayName: leadDisplay?.displayName ?? brand.display_name,
        brandTier: brand.brand_tier,
        websiteUrl: brand.website_url,
        reportedLocationCount: brand.reported_location_count,
        propertyCount: agg.propertyCount,
        unitCount: agg.unitCount,
        avgRetailDailyRate: avgRate,
        subBrandNote,
      };
    })
    .filter((row): row is Omit<TopGlampingBrandRow, 'rank'> => row != null)
    .filter((row) => row.propertyCount >= minPropertyCount)
    .sort((a, b) => {
      if (b.propertyCount !== a.propertyCount) return b.propertyCount - a.propertyCount;
      if (b.unitCount !== a.unitCount) return b.unitCount - a.unitCount;
      return a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' });
    })
    .slice(0, limit);

  const ranked: TopGlampingBrandRow[] = sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  const totalBrandedProperties = ranked.reduce((sum, r) => sum + r.propertyCount, 0);
  const totalBrandedUnits = ranked.reduce((sum, r) => sum + r.unitCount, 0);

  return {
    brands: ranked,
    totalBrandedProperties,
    totalBrandedUnits,
    brandsWithPublishedProperties: byBrand.size,
    asOf: latestTimestamp(glampingRows),
  };
}

export type FetchTopGlampingBrandsResult =
  | { ok: true; data: TopGlampingBrandsOverview }
  | { ok: false; error: string };

export async function fetchTopGlampingBrands(
  limit = TOP_GLAMPING_BRANDS_COUNT,
  market: GlampingMarketSnapshotMarket = 'us'
): Promise<FetchTopGlampingBrandsResult> {
  try {
    const [brands, rows] = await Promise.all([
      fetchAllBrands(),
      fetchPublishedBrandedRows(market),
    ]);
    if (brands.length === 0) {
      return { ok: false, error: 'Brand registry is unavailable.' };
    }
    return { ok: true, data: aggregateTopGlampingBrands(brands, rows, limit, market) };
  } catch (err) {
    console.error('[fetchTopGlampingBrands]', err);
    return { ok: false, error: 'Unable to load brand rankings.' };
  }
}
