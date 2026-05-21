import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';

/** Property types hidden on the public /map (markers, counts, detail by id). */
export const PUBLIC_MAP_EXCLUDED_PROPERTY_TYPES = ['Campground', 'RV Resort'] as const;

/**
 * PostgREST `.or()` — allow null/empty `property_type`; exclude Campground & RV Resort.
 */
export const PUBLIC_MAP_PROPERTY_TYPE_OR =
  'property_type.is.null,property_type.not.in.(Campground,RV Resort)';

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

/** Shared Supabase filters for the public map property cohort. */
export function applyPublicMapCohortFilters<Q extends CohortQueryable>(query: Q): Q {
  return query
    .eq('is_glamping_property', 'Yes')
    .eq('is_open', 'Yes')
    .neq('is_open', 'Proposed Development')
    .neq('is_open', 'Under Construction')
    .neq('is_open', 'Closed')
    .eq('research_status', 'published')
    .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
    .or(PUBLIC_MAP_PROPERTY_TYPE_OR) as Q;
}
