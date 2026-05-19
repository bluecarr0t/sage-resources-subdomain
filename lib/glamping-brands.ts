/**
 * Glamping brand registry types and helpers (Postgres `glamping_brands` + `brand_id` on properties).
 */

export type GlampingBrandTier = 'portfolio' | 'sub_brand' | 'standalone';

export interface GlampingBrand {
  id: string;
  slug: string;
  display_name: string;
  parent_brand_id: string | null;
  brand_tier: GlampingBrandTier;
  legacy_chain_key: string | null;
  website_url: string | null;
  reported_location_count: number | null;
  notes: string | null;
}

/** Option for admin brand picker (flat list with optional parent label). */
export interface GlampingBrandSelectOption {
  id: string;
  slug: string;
  label: string;
  brand_tier: GlampingBrandTier;
  parent_brand_id: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGlampingBrandId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** Sort: portfolios, then standalones, then sub-brands grouped under parent display name. */
export function sortGlampingBrandsForSelect(brands: GlampingBrand[]): GlampingBrandSelectOption[] {
  const byId = new Map(brands.map((b) => [b.id, b]));
  const options: GlampingBrandSelectOption[] = brands.map((b) => {
    const parent = b.parent_brand_id ? byId.get(b.parent_brand_id) : undefined;
    const prefix =
      b.brand_tier === 'sub_brand' && parent ? `↳ ` : '';
    const suffix =
      b.brand_tier === 'sub_brand' && parent ? ` (${parent.display_name})` : '';
    return {
      id: b.id,
      slug: b.slug,
      label: `${prefix}${b.display_name}${suffix}`,
      brand_tier: b.brand_tier,
      parent_brand_id: b.parent_brand_id,
    };
  });

  const tierOrder: Record<GlampingBrandTier, number> = {
    portfolio: 0,
    standalone: 1,
    sub_brand: 2,
  };

  return options.sort((a, b) => {
    const ta = tierOrder[a.brand_tier] - tierOrder[b.brand_tier];
    if (ta !== 0) return ta;
    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
  });
}
