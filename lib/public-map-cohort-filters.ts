import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';

/**
 * Map-only cohort filters. Do not use for `/property/[slug]` pages, sitemaps, or
 * `lib/published-property-pages.ts` — those use published listing queries without
 * `property_type` exclusions so SEO URLs stay live.
 */

/** Property types hidden on the public /map (markers, counts, map API list). */
export const PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES = [
  'Campground',
  'RV Resort',
  'RV Park',
  'Outdoor Boutique Hotel',
  'Unknown',
] as const;

/**
 * PostgREST `.or()` — allow null/empty `property_type`; exclude non-map product types.
 */
export const PUBLIC_MAP_PROPERTY_TYPE_OR =
  'property_type.is.null,property_type.not.in.(Campground,"RV Resort","RV Park","Outdoor Boutique Hotel",Unknown)';

export function isExcludedPropertyTypeForPublicMap(
  propertyType: string | null | undefined
): boolean {
  const trimmed = (propertyType ?? '').trim();
  return (PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES as readonly string[]).includes(trimmed);
}

type CohortQueryable = {
  eq: (column: string, value: string) => CohortQueryable;
  neq: (column: string, value: string) => CohortQueryable;
  or: (filters: string) => CohortQueryable;
};

function applyOperationalCohortFilters(query: CohortQueryable): CohortQueryable {
  return query
    .eq('is_glamping_property', 'Yes')
    .eq('is_open', 'Yes')
    .neq('is_open', 'Proposed Development')
    .neq('is_open', 'Under Construction')
    .neq('is_open', 'Closed')
    .eq('research_status', 'published')
    .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR);
}

/** Published/open glamping cohort (map + map counts). */
export function applyPublicMapOperationalCohortFilters<T>(query: T): T {
  return applyOperationalCohortFilters(query as unknown as CohortQueryable) as unknown as T;
}

/**
 * Map marker cohort: operational filters + hide Campground, RV Resort, Outdoor Boutique Hotel, Unknown.
 * Property listing pages are unaffected.
 */
export function applyPublicMapCohortFilters<T>(query: T): T {
  const filtered = applyOperationalCohortFilters(query as unknown as CohortQueryable).or(
    PUBLIC_MAP_PROPERTY_TYPE_OR
  );
  return filtered as unknown as T;
}

/**
 * `/brands` rankings and `/brand/[slug]` detail pages — exclude state/federal/other public land.
 * `/brands` rankings also use `applyGlampingOnlyPropertyTypeFilter`; brand detail pages include all property types.
 */
export function applyBrandsPageLandOperatorFilter<T>(query: T): T {
  return (query as unknown as CohortQueryable).or(
    PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR
  ) as unknown as T;
}
