/**
 * Property page indexing tiers — conserve crawl budget on thin listings.
 */
import type { SageProperty } from '@/lib/types/sage';

export type PropertyIndexTier = 'a' | 'b' | 'c';

export type PropertyAnchorSeoFields = {
  property_name?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  google_description?: string | null;
  lat?: string | number | null;
  lon?: string | number | null;
  rate_avg_retail_daily_rate?: string | number | null;
  brand_id?: string | null;
  url?: string | null;
  slug?: string | null;
};

function hasText(value: string | null | undefined, minLen: number): boolean {
  const t = value?.trim();
  return Boolean(t && t.length >= minLen);
}

function hasCoordinates(row: PropertyAnchorSeoFields): boolean {
  const lat = row.lat != null ? Number(row.lat) : NaN;
  const lon = row.lon != null ? Number(row.lon) : NaN;
  return Number.isFinite(lat) && Number.isFinite(lon);
}

/**
 * Tier A: index + higher sitemap priority — location + substantive or commercial signals.
 * Tier B: index + lower priority — minimal geo identity.
 * Tier C: noindex — too thin for search value.
 */
export function evaluatePropertyIndexTier(
  row: PropertyAnchorSeoFields | SageProperty | null | undefined
): PropertyIndexTier {
  if (!row) return 'c';

  const name = row.property_name?.trim();
  if (!name || name.length < 2) return 'c';

  const hasLocation = hasText(row.city, 2) && hasText(row.state, 2);
  const hasGeo = hasLocation || hasCoordinates(row);
  if (!hasGeo) return 'c';

  const description =
    ('description' in row ? row.description : null) ??
    ('google_description' in row ? row.google_description : null);
  const hasRichDescription = hasText(description ?? null, 80);
  const hasRate =
    row.rate_avg_retail_daily_rate != null &&
    String(row.rate_avg_retail_daily_rate).trim() !== '';
  const hasBrand = Boolean(row.brand_id);
  const hasWebsite = hasText(row.url ?? null, 8);

  if (hasRichDescription || hasRate || hasBrand || hasWebsite) return 'a';
  if (hasLocation || hasCoordinates(row)) return 'b';
  return 'c';
}

export function propertyTierShouldIndex(tier: PropertyIndexTier): boolean {
  return tier === 'a' || tier === 'b';
}

export async function evaluatePropertyIndexTierBySlug(
  slug: string,
  fetchRows: (slug: string) => Promise<SageProperty[]>
): Promise<PropertyIndexTier> {
  const rows = await fetchRows(slug.trim());
  if (!rows.length) return 'c';
  return evaluatePropertyIndexTier(rows[0]);
}
