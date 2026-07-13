/**
 * Brand assignment audit + backfill helpers (admin + CLI).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  chainLabelFromPropertyName,
  CHAIN_KEY_TO_BRAND_SLUG,
} from '@/lib/brand-chain-label';
import {
  brandSlugFromPropertyUrl,
  websiteHostFromUrl,
} from '@/lib/brand-website-host';
import {
  dedupeRowsToPropertyAnchors,
} from '@/lib/admin/glamping-list-anchor-key';
import type { GlampingBrand } from '@/lib/glamping-brands';

const PROPERTIES_TABLE = 'all_sage_data';
const BRANDS_TABLE = 'glamping_brands';
const PAGE_SIZE = 1000;

export type BrandMatchSource = 'name' | 'domain' | 'sibling';

export type BrandAuditPropertyRow = {
  id: number;
  property_id: string | null;
  slug: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
  brand_id: string | null;
  research_status: string | null;
  is_open: string | null;
  is_glamping_property: string | null;
};

export type BrandBackfillCandidate = {
  chainKey: string;
  brandSlug: string;
  brandDisplayName: string;
  brandId: string;
  matchSource: BrandMatchSource;
  unassignedRowCount: number;
  totalAnchorCount: number;
  samplePropertyNames: string[];
};

export type UnbrandedMultiUnitChain = {
  chainKey: string;
  anchorCount: number;
  totalUnitRows: number;
  samplePropertyNames: string[];
};

export type BrandNewCandidate = {
  chainKey: string;
  propertyCount: number;
  samplePropertyNames: string[];
};

export type BrandAssignmentAuditReport = {
  generatedAt: string;
  published: {
    totalAnchors: number;
    withBrand: number;
    missingBrand: number;
  };
  backfillCandidates: BrandBackfillCandidate[];
  newBrandCandidates: BrandNewCandidate[];
  partialBrand: Array<{
    chainKey: string;
    brandSlug: string;
    withBrand: number;
    withoutBrand: number;
  }>;
};

type BrandRow = Pick<
  GlampingBrand,
  | 'id'
  | 'slug'
  | 'display_name'
  | 'legacy_chain_key'
  | 'parent_brand_id'
  | 'website_url'
>;

/** Service-role client for audits/CLI (avoids placeholder fallback in createServerClient). */
export function createBrandAuditSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchAllBrands(): Promise<BrandRow[]> {
  const supabase = createBrandAuditSupabaseClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select('id, slug, display_name, legacy_chain_key, parent_brand_id, website_url');
  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

export async function fetchPropertiesForBrandAudit(
  researchStatus: 'published' | 'all' = 'published'
): Promise<BrandAuditPropertyRow[]> {
  const supabase = createBrandAuditSupabaseClient();
  const all: BrandAuditPropertyRow[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from(PROPERTIES_TABLE)
      .select(
        'id,property_id,slug,property_name,city,state,country,url,brand_id,research_status,is_open,is_glamping_property'
      )
      .range(from, from + PAGE_SIZE - 1);

    if (researchStatus === 'published') {
      q = q.eq('research_status', 'published');
    }

    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as BrandAuditPropertyRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

function buildBrandHostIndex(brands: BrandRow[]): Map<string, BrandRow> {
  const byHost = new Map<string, BrandRow>();
  for (const b of brands) {
    const host = websiteHostFromUrl(b.website_url);
    if (host && !byHost.has(host)) byHost.set(host, b);
  }
  return byHost;
}

export function matchBrandForPropertyUrl(
  url: string | null | undefined,
  brandList: BrandRow[],
  byHost: Map<string, BrandRow>
): BrandRow | null {
  const slugGuess = brandSlugFromPropertyUrl(url);
  if (slugGuess) {
    const fromSlug = brandList.find((b) => b.slug === slugGuess);
    if (fromSlug) return fromSlug;
  }
  const host = websiteHostFromUrl(url);
  if (!host) return null;
  const direct = byHost.get(host);
  if (direct) return direct;
  for (const [brandHost, brand] of byHost) {
    if (host === brandHost || host.endsWith(`.${brandHost}`)) return brand;
  }
  return null;
}

export function matchBrandForChainKey(
  chainKey: string,
  brandList: BrandRow[],
  byLegacy: Map<string, BrandRow>
): BrandRow | null {
  const fromLegacy = byLegacy.get(chainKey);
  if (fromLegacy) return fromLegacy;

  for (const { pattern, slug } of CHAIN_KEY_TO_BRAND_SLUG) {
    if (chainKey === pattern || chainKey.startsWith(pattern)) {
      return brandList.find((b) => b.slug === slug) ?? null;
    }
  }

  const slugGuess = chainKey.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return brandList.find((b) => b.slug === slugGuess) ?? null;
}

export function buildBrandAssignmentAudit(
  brands: BrandRow[],
  rows: BrandAuditPropertyRow[]
): BrandAssignmentAuditReport {
  const byLegacy = new Map<string, BrandRow>();
  for (const b of brands) {
    if (b.legacy_chain_key) byLegacy.set(b.legacy_chain_key.toLowerCase(), b);
  }
  const byHost = buildBrandHostIndex(brands);

  const anchors = dedupeRowsToPropertyAnchors(
    rows as Array<BrandAuditPropertyRow & Record<string, unknown>>
  ) as BrandAuditPropertyRow[];

  const byChain = new Map<string, BrandAuditPropertyRow[]>();
  for (const r of anchors) {
    const ck = chainLabelFromPropertyName(r.property_name);
    if (!ck) continue;
    const list = byChain.get(ck) ?? [];
    list.push(r);
    byChain.set(ck, list);
  }

  const backfillCandidates: BrandBackfillCandidate[] = [];
  const newBrandCandidates: BrandNewCandidate[] = [];
  const partialBrand: BrandAssignmentAuditReport['partialBrand'] = [];

  for (const [chainKey, properties] of byChain) {
    const withBrand = properties.filter((p) => p.brand_id).length;
    const withoutBrand = properties.length - withBrand;
    const matched = matchBrandForChainKey(chainKey, brands, byLegacy);

    if (matched && withoutBrand > 0) {
      backfillCandidates.push({
        chainKey,
        brandSlug: matched.slug,
        brandDisplayName: matched.display_name,
        brandId: matched.id,
        matchSource: 'name',
        unassignedRowCount: withoutBrand,
        totalAnchorCount: properties.length,
        samplePropertyNames: properties
          .filter((p) => !p.brand_id)
          .slice(0, 5)
          .map((p) => p.property_name ?? '(unnamed)'),
      });
    }

    if (matched && withBrand > 0 && withoutBrand > 0) {
      partialBrand.push({
        chainKey,
        brandSlug: matched.slug,
        withBrand,
        withoutBrand,
      });
    }

    if (!matched && properties.length >= 2 && withoutBrand > 0) {
      newBrandCandidates.push({
        chainKey,
        propertyCount: properties.length,
        samplePropertyNames: properties.slice(0, 5).map((p) => p.property_name ?? '(unnamed)'),
      });
    }
  }

  const byDomain = new Map<string, BrandAuditPropertyRow[]>();
  for (const r of anchors.filter((p) => !p.brand_id)) {
    const host = websiteHostFromUrl(r.url);
    if (!host) continue;
    const list = byDomain.get(host) ?? [];
    list.push(r);
    byDomain.set(host, list);
  }
  for (const [host, properties] of byDomain) {
    const matched = matchBrandForPropertyUrl(`https://${host}`, brands, byHost);
    if (!matched) continue;
    if (backfillCandidates.some((c) => c.brandId === matched.id && c.matchSource === 'domain')) {
      continue;
    }
    backfillCandidates.push({
      chainKey: host,
      brandSlug: matched.slug,
      brandDisplayName: matched.display_name,
      brandId: matched.id,
      matchSource: 'domain',
      unassignedRowCount: properties.length,
      totalAnchorCount: properties.length,
      samplePropertyNames: properties
        .slice(0, 5)
        .map((p) => p.property_name ?? '(unnamed)'),
    });
  }

  backfillCandidates.sort((a, b) => b.unassignedRowCount - a.unassignedRowCount);
  newBrandCandidates.sort((a, b) => b.propertyCount - a.propertyCount);

  const missingBrand = anchors.filter((p) => !p.brand_id).length;

  return {
    generatedAt: new Date().toISOString(),
    published: {
      totalAnchors: anchors.length,
      withBrand: anchors.length - missingBrand,
      missingBrand,
    },
    backfillCandidates,
    newBrandCandidates,
    partialBrand,
  };
}

export async function runBrandAssignmentAudit(): Promise<BrandAssignmentAuditReport> {
  const [brands, rows] = await Promise.all([
    fetchAllBrands(),
    fetchPropertiesForBrandAudit('published'),
  ]);
  return buildBrandAssignmentAudit(brands, rows);
}

export type ApplyBrandBackfillResult = {
  dryRun: boolean;
  updatedRowCount: number;
  byBrand: Array<{ brandSlug: string; matchSource: BrandMatchSource; rowCount: number }>;
};

export function resolveBrandForRow(
  row: BrandAuditPropertyRow,
  brands: BrandRow[],
  byLegacy: Map<string, BrandRow>,
  byHost: Map<string, BrandRow>
): { brand: BrandRow; matchSource: BrandMatchSource } | null {
  const ck = chainLabelFromPropertyName(row.property_name);
  const fromName = ck ? matchBrandForChainKey(ck, brands, byLegacy) : null;
  if (fromName) return { brand: fromName, matchSource: 'name' };

  const fromDomain = matchBrandForPropertyUrl(row.url, brands, byHost);
  if (fromDomain) return { brand: fromDomain, matchSource: 'domain' };

  return null;
}

/** Build sibling brand_id map from property_id groups. */
export function siblingBrandByPropertyId(
  rows: BrandAuditPropertyRow[]
): Map<string, string> {
  const byPid = new Map<string, BrandAuditPropertyRow[]>();
  for (const r of rows) {
    const pid = r.property_id?.trim();
    if (!pid) continue;
    const list = byPid.get(pid) ?? [];
    list.push(r);
    byPid.set(pid, list);
  }
  const result = new Map<string, string>();
  for (const [, group] of byPid) {
    const withBrand = group.find((r) => r.brand_id)?.brand_id;
    if (withBrand) {
      for (const r of group) {
        if (!r.brand_id) result.set(String(r.id), withBrand);
      }
    }
  }
  return result;
}

export function buildUnbrandedMultiUnitChains(
  rows: BrandAuditPropertyRow[]
): UnbrandedMultiUnitChain[] {
  const unbranded = rows.filter((r) => !r.brand_id);
  const byChain = new Map<string, BrandAuditPropertyRow[]>();
  for (const r of unbranded) {
    const ck =
      chainLabelFromPropertyName(r.property_name) ||
      websiteHostFromUrl(r.url) ||
      'unknown';
    const list = byChain.get(ck) ?? [];
    list.push(r);
    byChain.set(ck, list);
  }

  const anchors = dedupeRowsToPropertyAnchors(
    unbranded as Array<BrandAuditPropertyRow & Record<string, unknown>>
  ) as BrandAuditPropertyRow[];

  const anchorCountByChain = new Map<string, number>();
  for (const a of anchors) {
    const ck =
      chainLabelFromPropertyName(a.property_name) ||
      websiteHostFromUrl(a.url) ||
      'unknown';
    anchorCountByChain.set(ck, (anchorCountByChain.get(ck) ?? 0) + 1);
  }

  const chains: UnbrandedMultiUnitChain[] = [];
  for (const [chainKey, group] of byChain) {
    const anchorCount = anchorCountByChain.get(chainKey) ?? 0;
    if (group.length < 3 && anchorCount < 2) continue;
    chains.push({
      chainKey,
      anchorCount,
      totalUnitRows: group.length,
      samplePropertyNames: group
        .slice(0, 5)
        .map((p) => p.property_name ?? '(unnamed)'),
    });
  }
  chains.sort((a, b) => b.totalUnitRows - a.totalUnitRows);
  return chains;
}

/** Assign brand_id on published rows via name, domain, and sibling propagation. */
export async function applyBrandBackfill(options: {
  dryRun?: boolean;
  brandSlugs?: string[];
}): Promise<ApplyBrandBackfillResult> {
  const dryRun = options.dryRun ?? true;
  const [brands, publishedRows, allRowsForSiblings] = await Promise.all([
    fetchAllBrands(),
    fetchPropertiesForBrandAudit('published'),
    fetchPropertiesForBrandAudit('all'),
  ]);

  const byLegacy = new Map<string, BrandRow>();
  for (const b of brands) {
    if (b.legacy_chain_key) byLegacy.set(b.legacy_chain_key.toLowerCase(), b);
  }
  const byHost = buildBrandHostIndex(brands);
  const siblingMap = siblingBrandByPropertyId(allRowsForSiblings);

  const supabase = createBrandAuditSupabaseClient();
  let updatedRowCount = 0;
  const byBrand: ApplyBrandBackfillResult['byBrand'] = [];
  const brandCounts = new Map<string, { matchSource: BrandMatchSource; count: number }>();

  const pending = publishedRows.filter((r) => !r.brand_id);
  for (const row of pending) {
    let brandId: string | null = null;
    let matchSource: BrandMatchSource = 'name';

    const resolved = resolveBrandForRow(row, brands, byLegacy, byHost);
    if (resolved) {
      brandId = resolved.brand.id;
      matchSource = resolved.matchSource;
    } else {
      const sib = siblingMap.get(String(row.id));
      if (sib) {
        brandId = sib;
        matchSource = 'sibling';
      }
    }

    if (!brandId) continue;

    const brand = brands.find((b) => b.id === brandId);
    if (!brand) continue;
    if (options.brandSlugs?.length && !options.brandSlugs.includes(brand.slug)) {
      continue;
    }

    if (!dryRun) {
      const { error } = await supabase
        .from(PROPERTIES_TABLE)
        .update({ brand_id: brandId })
        .eq('id', row.id);
      if (error) throw error;
    }

    updatedRowCount += 1;
    const key = `${brand.slug}:${matchSource}`;
    const prev = brandCounts.get(key) ?? { matchSource, count: 0 };
    brandCounts.set(key, { matchSource, count: prev.count + 1 });
  }

  for (const [key, { matchSource, count }] of brandCounts) {
    const brandSlug = key.split(':')[0]!;
    byBrand.push({ brandSlug, matchSource, rowCount: count });
  }
  byBrand.sort((a, b) => b.rowCount - a.rowCount);

  return { dryRun, updatedRowCount, byBrand };
}
