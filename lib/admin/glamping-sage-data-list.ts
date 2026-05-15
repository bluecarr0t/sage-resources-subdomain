export function escapeIlikeTerm(term: string): string {
  return term.replace(/[%,()]/g, '').trim();
}

export type SageDataGlampingListFilters = {
  /** Raw search string (may include spaces). */
  q: string;
  researchStatus: string | undefined;
  country: string | undefined;
  /** `missing` query param value, or null when unset / "all". */
  missing: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgREST builder chain
export function applySageDataGlampingListFilters(query: any, filters: SageDataGlampingListFilters): any {
  let q = query;
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

  return q;
}
