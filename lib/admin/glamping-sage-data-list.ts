import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import { CA_PROVINCE_DISPLAY_NAME } from '@/lib/normalize-ca-province-key';
import { US_STATE_NAMES, type US_STATES } from '@/lib/us-states';
import { applyFuzzySageDataSearch } from '@/lib/admin/sage-data-fuzzy-search';
import type { HasGlampingUnitsFilter } from '@/lib/admin/has-glamping-units';

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
  /** USPS state or Canadian province code (e.g. VT, QC). */
  state: string | undefined;
  /** Exact `is_open` when set (e.g. Yes, Under Construction, Proposed Development, Temporarily closed, Closed). */
  isOpen: string | undefined;
  /** Exact `discovery_source` when set (shown as "Source" in the Sage Data table). */
  discoverySource: string | undefined;
  /** `missing` query param value, or null when unset / "all". */
  missing: string | null;
  /** Exact `glamping_service_tier` when set (luxury | upscale | midscale | rustic). */
  glampingServiceTier: string | undefined;
  /**
   * Derived from sibling `unit_type`s (`all_sage_data_list_anchors.has_glamping_units`).
   * Not a stored property column.
   */
  hasGlampingUnits?: HasGlampingUnitsFilter;
};

/** Minimal PostgREST filter surface used by the Sage Data list endpoint. */
export interface SageGlampingListQuery {
  or(filters: string): SageGlampingListQuery;
  eq(column: string, value: string | boolean): SageGlampingListQuery;
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
    const usName =
      abbr in US_STATE_NAMES
        ? US_STATE_NAMES[abbr as (typeof US_STATES)[number]]
        : null;
    const caName = CA_PROVINCE_DISPLAY_NAME[abbr] ?? null;
    const fullName = usName ?? caName;
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
  if (filters.hasGlampingUnits === 'yes') {
    q = q.eq('has_glamping_units', true);
  } else if (filters.hasGlampingUnits === 'no') {
    q = q.eq('has_glamping_units', false);
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
