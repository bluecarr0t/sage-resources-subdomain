/**
 * Shared filter application for the `unified_comps` matview.
 *
 * Used by both the paginated list endpoint (`/api/admin/comps/unified`) and
 * the viewport geo endpoint (`/api/admin/comps/unified/geo`) so filter
 * behaviour (sources, states, ADR, unit categories, FTS) stays consistent.
 */

import {
  filterUnifiedSources,
} from '@/lib/comps-unified/build-row';
import { GLAMPING_IS_OPEN_VALUES } from '@/lib/glamping-is-open';
import { GLAMPING_PROPERTY_TYPE_ALLOWED } from '@/lib/glamping-property-types';
import {
  expandStateValuesForInQuery,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';
import { expandCountryValuesForInQuery } from '@/lib/comps-unified/country-filter';
import {
  validateFilterValues,
  validateSearchTerms,
} from '@/lib/validate-pagination';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function postgrestOrFilterIlike(column: string, rawTerm: string): string {
  const esc = escapeIlike(rawTerm);
  const pattern = `%${esc}%`;
  if (/[,\s()]/.test(pattern)) {
    const inner = pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${column}.ilike."${inner}"`;
  }
  return `${column}.ilike.${pattern}`;
}

function postgrestOrFilterEq(column: string, value: string): string {
  if (/[,\s()]/.test(value)) {
    const inner = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${column}.eq."${inner}"`;
  }
  return `${column}.eq.${value}`;
}

function buildTsQuery(terms: string[]): string {
  return terms
    .map((t) => t.replace(/[^a-z0-9]/gi, ' ').trim())
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(' & ');
}

export interface UnifiedFilterOptions {
  sources: string[];
  expandedStateValues: string[];
  expandedCountryValues: string[];
  unitCategories: string[];
  /** Sage `property_type` values (e.g. Glamping Resort). Applied when non-empty. */
  propertyTypes: string[];
  /** Matview `is_glamping_property` (e.g. Yes). Applied when non-empty. */
  isGlampingProperty: string[];
  /** When set, Sage (`all_sage_data`) rows must match this `research_status`. */
  sageResearchStatus: string | null;
  /**
   * When true with `propertyTypes` set, rows with `source = reports` bypass the property_type
   * filter (admin cohort: Past Reports comparables often have NULL property_type).
   */
  exemptReportsFromPropertyTypeFilter?: boolean;
  /** Sage `is_open` values (Yes, Under Construction, etc.). Applied when non-empty. */
  openStatuses: string[];
  keywordFilters: string[];
  parsedMinAdr: number | null;
  parsedMaxAdr: number | null;
  searchTerms: string[];
}

export function parseUnifiedFilterOptions(
  searchParams: URLSearchParams
): UnifiedFilterOptions {
  const sources = filterUnifiedSources(
    (searchParams.get('source') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const states = validateFilterValues(
    (searchParams.get('state') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const expandedStateValues =
    states.length > 0 ? expandStateValuesForInQuery(states) : [];
  const countries = validateFilterValues(
    (searchParams.get('country') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const expandedCountryValues =
    countries.length > 0 ? expandCountryValuesForInQuery(countries) : [];
  const unitCategories = validateFilterValues(
    (searchParams.get('unit_category') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const propertyTypes = validateFilterValues(
    (searchParams.get('property_type') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  ).filter((v) => GLAMPING_PROPERTY_TYPE_ALLOWED.has(v));
  const allowedOpen = new Set<string>(GLAMPING_IS_OPEN_VALUES);
  const openStatuses = validateFilterValues(
    (searchParams.get('is_open') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  ).filter((v) => allowedOpen.has(v));
  const keywordFilters = validateFilterValues(
    (searchParams.get('keywords') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const minAdr = searchParams.get('min_adr');
  const maxAdr = searchParams.get('max_adr');
  const parsedMinAdr = minAdr ? parseFloat(minAdr) : null;
  const parsedMaxAdr = maxAdr ? parseFloat(maxAdr) : null;

  const search = searchParams.get('search') || '';
  const searchTerms = validateSearchTerms(
    search
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase())
  );

  return {
    sources,
    expandedStateValues,
    expandedCountryValues,
    unitCategories,
    propertyTypes,
    isGlampingProperty: [],
    sageResearchStatus: null,
    exemptReportsFromPropertyTypeFilter: false,
    openStatuses,
    keywordFilters,
    parsedMinAdr,
    parsedMaxAdr,
    searchTerms,
  };
}

export function applyUnifiedBaseFilters(q: any, opts: UnifiedFilterOptions): any {
  let out = q;
  if (opts.sources.length > 0) out = out.in('source', opts.sources);
  if (opts.expandedCountryValues.length > 0) out = out.in('country', opts.expandedCountryValues);
  if (opts.expandedStateValues.length > 0) out = out.in('state', opts.expandedStateValues);
  if (opts.keywordFilters.length > 0) out = out.overlaps('amenity_keywords', opts.keywordFilters);
  if (opts.parsedMinAdr !== null && !Number.isNaN(opts.parsedMinAdr)) {
    out = out.gte('low_adr', opts.parsedMinAdr);
  }
  if (opts.parsedMaxAdr !== null && !Number.isNaN(opts.parsedMaxAdr)) {
    out = out.lte('peak_adr', opts.parsedMaxAdr);
  }
  if (opts.unitCategories.length > 0) {
    const ors: string[] = [];
    for (const cat of opts.unitCategories) {
      const esc = escapeIlike(cat);
      ors.push(`unit_category.eq.${cat}`);
      ors.push(`unit_type.ilike.%${esc}%`);
    }
    out = out.or(ors.join(','));
  }
  if (opts.propertyTypes.length > 0) {
    if (opts.exemptReportsFromPropertyTypeFilter) {
      const typeOrs = opts.propertyTypes.map((t) => `property_type.eq.${t}`).join(',');
      out = out.or(`source.eq.reports,${typeOrs}`);
    } else {
      out = out.in('property_type', opts.propertyTypes);
    }
  }
  if (opts.isGlampingProperty.length > 0) {
    out = out.in('is_glamping_property', opts.isGlampingProperty);
  }
  if (opts.openStatuses.length > 0) {
    out = out.in('is_open', opts.openStatuses);
  }
  return out;
}

export function applyUnifiedFtsFilter(q: any, opts: UnifiedFilterOptions): any {
  if (opts.searchTerms.length === 0) return q;
  const tsq = buildTsQuery(opts.searchTerms);
  if (!tsq) return q;
  return q.textSearch('search_tsv', tsq, { config: 'simple' });
}

export function applyUnifiedIlikeSearch(q: any, opts: UnifiedFilterOptions): any {
  let out = q;
  for (const term of opts.searchTerms) {
    const parts = [
      postgrestOrFilterIlike('property_name', term),
      postgrestOrFilterIlike('city', term),
      postgrestOrFilterIlike('overview', term),
      postgrestOrFilterIlike('state', term),
    ];
    const abbr = normalizeStateToCanonicalAbbrev(term);
    if (abbr) {
      for (const v of expandStateValuesForInQuery([abbr])) {
        parts.push(postgrestOrFilterEq('state', v));
      }
    }
    out = out.or(parts.join(','));
  }
  return out;
}
