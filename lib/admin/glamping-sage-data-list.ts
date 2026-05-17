export function escapeIlikeTerm(term: string): string {
  return term.replace(/[%,()]/g, '').trim();
}

export type SageDataGlampingListFilters = {
  /** Raw search string (may include spaces). */
  q: string;
  researchStatus: string | undefined;
  country: string | undefined;
  /** Exact `is_open` when set (e.g. Yes, Closed, Under Construction). */
  isOpen: string | undefined;
  /** `missing` query param value, or null when unset / "all". */
  missing: string | null;
};

/** Minimal PostgREST filter surface used by the Sage Data list endpoint. */
export interface SageGlampingListQuery {
  or(filters: string): SageGlampingListQuery;
  eq(column: string, value: string): SageGlampingListQuery;
  ilike(column: string, value: string): SageGlampingListQuery;
}

export function applySageDataGlampingListFilters<T extends SageGlampingListQuery>(
  query: T,
  filters: SageDataGlampingListFilters
): T {
  let q: SageGlampingListQuery = query;
  const trimmedQ = filters.q.trim();
  if (trimmedQ.length > 0) {
    const term = escapeIlikeTerm(trimmedQ);
    if (term.length > 0) {
      const pattern = `%${term}%`;
      q = q.or(
        [
          `property_name.ilike.${pattern}`,
          `city.ilike.${pattern}`,
          `state.ilike.${pattern}`,
          `country.ilike.${pattern}`,
        ].join(',')
      );
    }
  }

  if (filters.researchStatus && filters.researchStatus !== 'all') {
    q = q.eq('research_status', filters.researchStatus);
  }
  if (filters.country && filters.country !== 'all') {
    q = q.ilike('country', filters.country);
  }
  if (filters.isOpen && filters.isOpen !== 'all') {
    q = q.eq('is_open', filters.isOpen);
  }

  const missing = filters.missing;
  if (missing === 'city') {
    q = q.or('city.is.null,city.eq.');
  } else if (missing === 'website') {
    q = q.or('url.is.null,url.eq.');
  } else if (missing === 'rates') {
    q = q.or('rate_avg_retail_daily_rate.is.null,rate_avg_retail_daily_rate.eq.0');
  } else if (missing === 'lat_lng') {
    q = q.or('lat.is.null,lon.is.null');
  } else if (missing === 'total_sites') {
    q = q.or('property_total_sites.is.null,property_total_sites.eq.0');
  }

  return q as T;
}
