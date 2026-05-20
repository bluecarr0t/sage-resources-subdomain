/**
 * Public property listing pages: one page per logical property with research_status = published.
 * Map markers use a narrower cohort in app/api/properties (unchanged).
 */
import { createServerClient } from '@/lib/supabase';
import {
  dedupeRowsToPropertyAnchors,
  propertyListGroupKey,
} from '@/lib/admin/glamping-list-anchor-key';
import { slugifyPropertyName } from '@/lib/property-slug';
import type { SageProperty } from '@/lib/types/sage';

export const PUBLISHED_RESEARCH_STATUS = 'published';

const TABLE = 'all_glamping_properties';
const PAGE_SIZE = 1000;

export type PropertyAnchorRow = {
  id: number;
  property_name?: string | null;
  slug?: string | null;
  property_id?: string | null;
  city?: string | null;
  state?: string | null;
};

/** Resolve URL slug for a published anchor row; disambiguate collisions when slug column is empty. */
export function resolvePublicSlugForAnchor(
  row: PropertyAnchorRow,
  usedSlugs: Set<string>
): string {
  const existing = row.slug?.trim();
  if (existing) return existing;

  const name = row.property_name?.trim();
  if (!name) return `property-${row.id}`;

  let base = slugifyPropertyName(name);
  const city = row.city?.trim();
  if (usedSlugs.has(base) && city) {
    const withCity = `${base}-${slugifyPropertyName(city)}`;
    if (!usedSlugs.has(withCity)) base = withCity;
  }

  let n = 2;
  while (usedSlugs.has(base)) {
    base = `${slugifyPropertyName(name)}-${n}`;
    n += 1;
  }

  return base;
}

/** One slug per published logical property (matches admin list anchor grouping). */
export function buildPublishedPropertySlugList(anchors: PropertyAnchorRow[]): string[] {
  const usedSlugs = new Set<string>();
  const slugs: string[] = [];

  for (const anchor of anchors) {
    const slug = resolvePublicSlugForAnchor(anchor, usedSlugs);
    if (!slug) continue;
    usedSlugs.add(slug);
    slugs.push(slug);
  }

  return [...new Set(slugs)].sort();
}

export async function fetchPublishedPropertyAnchors(): Promise<PropertyAnchorRow[]> {
  const supabase = createServerClient();
  const all: PropertyAnchorRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, property_name, slug, property_id, city, state')
      .eq('research_status', PUBLISHED_RESEARCH_STATUS)
      .not('property_name', 'is', null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[fetchPublishedPropertyAnchors]', error);
      break;
    }

    if (!data?.length) break;
    all.push(...(data as PropertyAnchorRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return dedupeRowsToPropertyAnchors(all) as PropertyAnchorRow[];
}

export function parseLegacyGroupKey(key: string): { name: string; city: string; state: string } | null {
  if (!key.startsWith('legacy:')) return null;
  const parts = key.slice('legacy:'.length).split('|');
  if (parts.length < 3) return null;
  return { name: parts[0] ?? '', city: parts[1] ?? '', state: parts[2] ?? '' };
}

/** Fetch all published unit rows for a logical property group key. */
export async function fetchPublishedRowsByGroupKey(groupKey: string): Promise<SageProperty[]> {
  const supabase = createServerClient();
  let query = supabase.from(TABLE).select('*').eq('research_status', PUBLISHED_RESEARCH_STATUS);

  if (groupKey.startsWith('pid:')) {
    const propertyId = groupKey.slice(4);
    query = query.eq('property_id', propertyId);
  } else if (groupKey.startsWith('slug:')) {
    const slug = groupKey.slice(5);
    query = query.eq('slug', slug);
  } else {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('research_status', PUBLISHED_RESEARCH_STATUS);

    if (error) {
      console.error('[fetchPublishedRowsByGroupKey] legacy', error);
      return [];
    }

    return ((data ?? []) as SageProperty[]).filter(
      (row) => propertyListGroupKey(row) === groupKey
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('[fetchPublishedRowsByGroupKey]', error);
    return [];
  }

  return (data as SageProperty[]) ?? [];
}

/** Find published group key for a public listing slug. */
export async function findPublishedGroupKeyBySlug(slug: string): Promise<string | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const supabase = createServerClient();

  const { data: slugMatches, error: slugError } = await supabase
    .from(TABLE)
    .select('id, property_name, slug, property_id, city, state')
    .eq('research_status', PUBLISHED_RESEARCH_STATUS)
    .eq('slug', trimmed)
    .limit(100);

  if (slugError) {
    console.error('[findPublishedGroupKeyBySlug] slug lookup', slugError);
  } else if (slugMatches?.length) {
    const anchor = dedupeRowsToPropertyAnchors(slugMatches as PropertyAnchorRow[])[0];
    if (anchor) return propertyListGroupKey(anchor);
  }

  const anchors = await fetchPublishedPropertyAnchors();
  const usedSlugs = new Set<string>();
  for (const anchor of anchors) {
    const publicSlug = resolvePublicSlugForAnchor(anchor, usedSlugs);
    usedSlugs.add(publicSlug);
    if (publicSlug === trimmed) {
      return propertyListGroupKey(anchor);
    }
  }

  return null;
}
