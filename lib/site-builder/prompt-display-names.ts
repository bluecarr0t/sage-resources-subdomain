/**
 * Resolve human-readable labels for Site Builder image prompts when DB rows or
 * type lookups do not match (slug casing, legacy state, etc.).
 */

export function humanizeKebabSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return '';
  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export type AmenitySlugRow = { slug: string; name: string | null | undefined };

/**
 * Map checked amenity slugs to display names for the image prompt.
 * Falls back to a title-cased slug so checked amenities are never dropped silently.
 */
export function resolveAmenityNamesForPrompt(slugs: string[], rows: AmenitySlugRow[]): string[] {
  if (!slugs?.length) return [];
  const list = rows ?? [];
  return slugs
    .map((slug) => {
      const row = list.find((r) => r.slug === slug || r.slug.toLowerCase() === slug.toLowerCase());
      const n = row?.name?.trim();
      return n || humanizeKebabSlug(slug);
    })
    .filter((n) => n.length > 0);
}

export type GlampingTypeRow = { slug: string; name: string };
export type CatalogUnitLabel = { manufacturer?: string | null; product_model?: string | null };

export function resolveGlampingUnitTypeNameForPrompt(params: {
  unitTypeSlug: string;
  catalogUnit: CatalogUnitLabel | null;
  glampingTypes: GlampingTypeRow[];
}): string {
  const slug = params.unitTypeSlug?.trim() ?? '';
  const typeName = params.glampingTypes.find((g) => g.slug === slug)?.name?.trim();
  if (params.catalogUnit) {
    const catalogLabel = [params.catalogUnit.manufacturer, params.catalogUnit.product_model]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (catalogLabel) return catalogLabel;
  }
  if (typeName) return typeName;
  if (slug) return humanizeKebabSlug(slug);
  return '';
}

export function resolveRvSiteTypeNameForPrompt(
  siteTypeSlug: string,
  rvSiteTypes: GlampingTypeRow[]
): string {
  const slug = siteTypeSlug?.trim() ?? '';
  const typeName = rvSiteTypes.find((r) => r.slug === slug)?.name?.trim();
  if (typeName) return typeName;
  if (slug) return humanizeKebabSlug(slug);
  return '';
}
