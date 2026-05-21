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
import { PUBLISHED_RESEARCH_STATUS } from '@/lib/published-property-pages';
import type { SageProperty } from '@/lib/types/sage';

const BRANDS_TABLE = 'glamping_brands';
const PROPERTIES_TABLE = 'all_glamping_properties';
const PAGE_SIZE = 1000;

export const TOP_GLAMPING_BRANDS_COUNT = 10;

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

function subBrandNamesForRollup(
  rootId: string,
  contributingBrandIds: Set<string>,
  byId: Map<string, BrandRow>
): string[] {
  const names: string[] = [];
  for (const id of contributingBrandIds) {
    if (id === rootId) continue;
    const b = byId.get(id);
    if (!b) continue;
    names.push(b.display_name);
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
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
  | 'city'
  | 'state'
  | 'brand_id'
  | 'quantity_of_units'
  | 'property_total_sites'
  | 'rate_avg_retail_daily_rate'
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

function parseRate(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rootBrandId(brandId: string, byId: Map<string, BrandRow>): string {
  let current = byId.get(brandId);
  while (current?.parent_brand_id) {
    current = byId.get(current.parent_brand_id);
  }
  return current?.id ?? brandId;
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

async function fetchPublishedBrandedRows(): Promise<PropertyRow[]> {
  const supabase = createServerClient();
  const all: PropertyRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(PROPERTIES_TABLE)
      .select(
        'id, property_id, slug, property_name, city, state, brand_id, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, updated_at, created_at'
      )
      .eq('research_status', PUBLISHED_RESEARCH_STATUS)
      .not('brand_id', 'is', null)
      .range(from, from + PAGE_SIZE - 1);

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
  limit = TOP_GLAMPING_BRANDS_COUNT
): TopGlampingBrandsOverview {
  const byId = new Map(brands.map((b) => [b.id, b]));
  const anchors = dedupeRowsToOutpostAnchors(
    rows as Array<PropertyRow & Record<string, unknown>>
  ) as PropertyRow[];

  type PropertyAgg = {
    rootBrandId: string;
    leafBrandId: string;
    units: number;
    rate: number | null;
  };

  const byProperty = new Map<string, PropertyAgg>();

  for (const anchor of anchors) {
    const brandId = anchor.brand_id;
    if (!brandId || !byId.has(brandId)) continue;

    const key = propertyOutpostGroupKey(anchor);
    const groupRows = rows.filter((r) => propertyOutpostGroupKey(r) === key);
    const units = groupRows.reduce((sum, r) => sum + unitsForRow(r), 0);
    const rates = groupRows
      .map((r) => parseRate(r.rate_avg_retail_daily_rate))
      .filter((n): n is number => n != null);
    const rate =
      rates.length > 0
        ? rates.reduce((sum, n) => sum + n, 0) / rates.length
        : parseRate(anchor.rate_avg_retail_daily_rate);

    byProperty.set(key, {
      rootBrandId: rootBrandId(brandId, byId),
      leafBrandId: brandId,
      units,
      rate,
    });
  }

  type BrandAgg = {
    propertyCount: number;
    unitCount: number;
    rates: number[];
    contributingBrandIds: Set<string>;
  };

  const byBrand = new Map<string, BrandAgg>();

  for (const agg of byProperty.values()) {
    const existing = byBrand.get(agg.rootBrandId) ?? {
      propertyCount: 0,
      unitCount: 0,
      rates: [],
      contributingBrandIds: new Set<string>(),
    };
    existing.propertyCount += 1;
    existing.unitCount += agg.units;
    if (agg.rate != null) existing.rates.push(agg.rate);
    existing.contributingBrandIds.add(agg.leafBrandId);
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
      const subBrandNote = formatSubBrandNote(
        subBrandNamesForRollup(id, agg.contributingBrandIds, byId)
      );

      return {
        slug: brand.slug,
        displayName: brand.display_name,
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
    asOf: latestTimestamp(rows),
  };
}

export type FetchTopGlampingBrandsResult =
  | { ok: true; data: TopGlampingBrandsOverview }
  | { ok: false; error: string };

export async function fetchTopGlampingBrands(
  limit = TOP_GLAMPING_BRANDS_COUNT
): Promise<FetchTopGlampingBrandsResult> {
  try {
    const [brands, rows] = await Promise.all([fetchAllBrands(), fetchPublishedBrandedRows()]);
    if (brands.length === 0) {
      return { ok: false, error: 'Brand registry is unavailable.' };
    }
    return { ok: true, data: aggregateTopGlampingBrands(brands, rows, limit) };
  } catch (err) {
    console.error('[fetchTopGlampingBrands]', err);
    return { ok: false, error: 'Unable to load brand rankings.' };
  }
}
