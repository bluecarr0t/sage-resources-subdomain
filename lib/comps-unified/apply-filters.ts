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
import {
  expandStateValuesForInQuery,
  normalizeStateToCanonicalAbbrev,
} from '@/components/map/utils/stateUtils';
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
  unitCategories: string[];
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
  const unitCategories = validateFilterValues(
    (searchParams.get('unit_category') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
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
    unitCategories,
    keywordFilters,
    parsedMinAdr,
    parsedMaxAdr,
    searchTerms,
  };
}

export function applyUnifiedBaseFilters(q: any, opts: UnifiedFilterOptions): any {
  let out = q;
  if (opts.sources.length > 0) out = out.in('source', opts.sources);
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
