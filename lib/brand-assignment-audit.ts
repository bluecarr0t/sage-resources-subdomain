/**
 * Brand assignment audit + backfill helpers (admin + CLI).
 */
import { createServerClient } from '@/lib/supabase';
import {
  chainLabelFromPropertyName,
  CHAIN_KEY_TO_BRAND_SLUG,
} from '@/lib/brand-chain-label';
import {
  dedupeRowsToPropertyAnchors,
} from '@/lib/admin/glamping-list-anchor-key';
import type { GlampingBrand } from '@/lib/glamping-brands';

const PROPERTIES_TABLE = 'all_glamping_properties';
const BRANDS_TABLE = 'glamping_brands';
const PAGE_SIZE = 1000;

export type BrandAuditPropertyRow = {
  id: number;
  property_id: string | null;
  slug: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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
  unassignedRowCount: number;
  totalAnchorCount: number;
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
  'id' | 'slug' | 'display_name' | 'legacy_chain_key' | 'parent_brand_id'
>;

async function fetchAllBrands(): Promise<BrandRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(BRANDS_TABLE)
    .select('id, slug, display_name, legacy_chain_key, parent_brand_id');
  if (error) throw error;
  return (data ?? []) as BrandRow[];
}

export async function fetchPropertiesForBrandAudit(
  researchStatus: 'published' | 'all' = 'published'
): Promise<BrandAuditPropertyRow[]> {
  const supabase = createServerClient();
  const all: BrandAuditPropertyRow[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from(PROPERTIES_TABLE)
      .select(
        'id,property_id,slug,property_name,city,state,country,brand_id,research_status,is_open,is_glamping_property'
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
  byBrand: Array<{ brandSlug: string; rowCount: number }>;
};

/** Assign brand_id on published rows inferred from property name. */
export async function applyBrandBackfill(options: {
  dryRun?: boolean;
  brandSlugs?: string[];
}): Promise<ApplyBrandBackfillResult> {
  const dryRun = options.dryRun ?? true;
  const [brands, rows, audit] = await Promise.all([
    fetchAllBrands(),
    fetchPropertiesForBrandAudit('published'),
    runBrandAssignmentAudit(),
  ]);

  const byLegacy = new Map<string, BrandRow>();
  for (const b of brands) {
    if (b.legacy_chain_key) byLegacy.set(b.legacy_chain_key.toLowerCase(), b);
  }

  const candidates = options.brandSlugs?.length
    ? audit.backfillCandidates.filter((c) => options.brandSlugs!.includes(c.brandSlug))
    : audit.backfillCandidates;

  const supabase = createServerClient();
  let updatedRowCount = 0;
  const byBrand: ApplyBrandBackfillResult['byBrand'] = [];

  for (const candidate of candidates) {
    const idsToUpdate: number[] = [];
    for (const r of rows) {
      if (r.brand_id) continue;
      const ck = chainLabelFromPropertyName(r.property_name);
      const matched = matchBrandForChainKey(ck, brands, byLegacy);
      if (matched?.id !== candidate.brandId) continue;
      idsToUpdate.push(r.id);
    }

    if (idsToUpdate.length === 0) continue;

    if (!dryRun) {
      for (let i = 0; i < idsToUpdate.length; i += 100) {
        const chunk = idsToUpdate.slice(i, i + 100);
        const { error } = await supabase
          .from(PROPERTIES_TABLE)
          .update({ brand_id: candidate.brandId })
          .in('id', chunk);
        if (error) throw error;
      }
    }

    updatedRowCount += idsToUpdate.length;
    byBrand.push({ brandSlug: candidate.brandSlug, rowCount: idsToUpdate.length });
  }

  return { dryRun, updatedRowCount, byBrand };
}
