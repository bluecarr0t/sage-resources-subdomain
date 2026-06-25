import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import { US_STATE_NAMES, type US_STATES } from '@/lib/us-states';
import { applyFuzzySageDataSearch } from '@/lib/admin/sage-data-fuzzy-search';

export function escapeIlikeTerm(term: string): string {
  return term.replace(/[%,()]/g, '').trim();
}

/** Whether a `country` filter value refers to the United States. */
export function isUnitedStatesCountryFilterValue(country: string): boolean {
  const t = country.trim();
  if (!t || t === 'all') return false;
  const lower = t.toLowerCase();
  return GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN.some(
    (c) => c.toLowerCase() === lower
  );
}

export type SageDataGlampingListFilters = {
  /** Raw search string (may include spaces). */
  q: string;
  researchStatus: string | undefined;
  country: string | undefined;
  /** Case-insensitive partial match on `city`. */
  city: string | undefined;
  /** USPS state code (e.g. VT) when filtering US properties by state. */
  state: string | undefined;
  /** Exact `is_open` when set (e.g. Yes, Under Construction, Proposed Development, Temporarily closed, Closed). */
  isOpen: string | undefined;
  /** Exact `discovery_source` when set (shown as "Source" in the Sage Data table). */
  discoverySource: string | undefined;
  /** `missing` query param value, or null when unset / "all". */
  missing: string | null;
  /** Exact `glamping_service_tier` when set (luxury | upscale | midscale | rustic). */
  glampingServiceTier: string | undefined;
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
    q = applyFuzzySageDataSearch(q, trimmedQ);
  }

  if (filters.researchStatus && filters.researchStatus !== 'all') {
    q = q.eq('research_status', filters.researchStatus);
  }
  if (filters.country && filters.country !== 'all') {
    q = q.ilike('country', filters.country);
  }
  if (filters.city && filters.city !== 'all') {
    const cityTerm = escapeIlikeTerm(filters.city);
    if (cityTerm.length > 0) {
      q = q.ilike('city', `%${cityTerm}%`);
    }
  }
  if (filters.state && filters.state !== 'all') {
    const abbr = filters.state.trim().toUpperCase();
    const fullName =
      abbr in US_STATE_NAMES
        ? US_STATE_NAMES[abbr as (typeof US_STATES)[number]]
        : null;
    if (fullName) {
      q = q.or(`state.eq.${abbr},state.ilike.${fullName}`);
    } else {
      q = q.eq('state', filters.state);
    }
  }
  if (filters.isOpen && filters.isOpen !== 'all') {
    q = q.eq('is_open', filters.isOpen);
  }
  if (filters.discoverySource && filters.discoverySource !== 'all') {
    q = q.eq('discovery_source', filters.discoverySource);
  }
  if (filters.glampingServiceTier && filters.glampingServiceTier !== 'all') {
    q = q.eq('glamping_service_tier', filters.glampingServiceTier);
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
