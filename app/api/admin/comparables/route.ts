/**
 * API Route: List / search feasibility comparables
 * GET /api/admin/comparables
 *
 * Query params:
 *   search       - fuzzy text search on comp_name, overview, job number (study_id), city, state, country, unit type/category, amenity keywords
 *   state        - filter by report state (comma-separated for multi-select, e.g. state=TX,CA,MT)
 *   unit_category - filter comp_units by unit_category (comma-separated for multi-select)
 *   min_adr / max_adr - ADR range filter
 *   (amenity keyword search is included in main search param)
 *   sort_by      - comp_name | quality_score | low_adr | peak_adr | created_at
 *   sort_dir     - asc | desc
 *   page         - 1-indexed page number
 *   per_page     - results per page (default 50)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { parsePaginationParams } from '@/lib/validate-pagination';
import { filterValidCompUnits } from '@/lib/feasibility-utils';

const DEFAULT_PER_PAGE = 50;
const FUZZY_SIMILARITY_THRESHOLD = 0.4;
const FUZZY_RPC_LIMIT = 1000;

/** Maps state abbreviations ↔ full names so "GA" finds "Georgia" and vice versa */
const STATE_ALIASES: Record<string, string[]> = Object.fromEntries(
  [
    ['al', 'alabama'], ['ak', 'alaska'], ['az', 'arizona'], ['ar', 'arkansas'],
    ['ca', 'california'], ['co', 'colorado'], ['ct', 'connecticut'], ['de', 'delaware'],
    ['fl', 'florida'], ['ga', 'georgia'], ['hi', 'hawaii'], ['id', 'idaho'],
    ['il', 'illinois'], ['in', 'indiana'], ['ia', 'iowa'], ['ks', 'kansas'],
    ['ky', 'kentucky'], ['la', 'louisiana'], ['me', 'maine'], ['md', 'maryland'],
    ['ma', 'massachusetts'], ['mi', 'michigan'], ['mn', 'minnesota'], ['ms', 'mississippi'],
    ['mo', 'missouri'], ['mt', 'montana'], ['ne', 'nebraska'], ['nv', 'nevada'],
    ['nh', 'new hampshire'], ['nj', 'new jersey'], ['nm', 'new mexico'], ['ny', 'new york'],
    ['nc', 'north carolina'], ['nd', 'north dakota'], ['oh', 'ohio'], ['ok', 'oklahoma'],
    ['or', 'oregon'], ['pa', 'pennsylvania'], ['ri', 'rhode island'], ['sc', 'south carolina'],
    ['sd', 'south dakota'], ['tn', 'tennessee'], ['tx', 'texas'], ['ut', 'utah'],
    ['vt', 'vermont'], ['va', 'virginia'], ['wa', 'washington'], ['wv', 'west virginia'],
    ['wi', 'wisconsin'], ['wy', 'wyoming'],
  ].flatMap(([abbr, name]) => [
    [abbr, [name]],
    [name, [abbr]],
  ])
);

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const stateParam = searchParams.get('state') || '';
    const unitCategoryParam = searchParams.get('unit_category') || '';
    const states = stateParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const unitCategories = unitCategoryParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const minAdr = searchParams.get('min_adr');
    const maxAdr = searchParams.get('max_adr');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? true : false;
    const { page, perPage } = parsePaginationParams(searchParams, {
      defaultPerPage: DEFAULT_PER_PAGE,
    });

    const supabaseAdmin = createServerClient();

    // When filtering by unit_category, ADR, or search, we fetch all rows and filter in app.
    const hasStateFilter = states.length > 0;
    const hasUnitCategoryFilter = unitCategories.length > 0;
    // PostgREST .or() with embedded resources causes 500 errors; keyword search requires
    // array overlap which also fails in or(). App-side filtering is reliable.
    const needsPostFilter = !!(hasUnitCategoryFilter || minAdr || maxAdr || search);
    const searchTerms = search
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    /** Escape % and _ for use in ilike patterns */
    const escapeIlike = (s: string) => s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    let query = supabaseAdmin
      .from('feasibility_comparables')
      .select(`
        *,
        reports!inner(id, property_name, location, state, city, country, study_id, created_at),
        feasibility_comp_units(id, unit_type, unit_category, num_units, low_adr, peak_adr, avg_annual_adr, low_occupancy, peak_occupancy, quality_score)
      `, { count: needsPostFilter ? undefined : 'exact' });

    if (hasStateFilter) {
      query = query.in('reports.state', states);
    }

    // DB-level pre-filter for search. PostgREST .or() with embedded resources (reports.study_id)
    // can fail, so for job-number-like terms we use a direct filter on reports.study_id instead.
    if (searchTerms.length > 0) {
      const isJobNumberSearch = searchTerms.length === 1 && /^\d{2}-/.test(searchTerms[0]);
      if (isJobNumberSearch) {
        const pattern = `%${escapeIlike(searchTerms[0])}%`;
        query = query.ilike('reports.study_id', pattern);
      } else {
        const orConditions = searchTerms.flatMap((term) => {
          const escaped = escapeIlike(term);
          const pattern = `%${escaped}%`;
          return [`comp_name.ilike.${pattern}`, `overview.ilike.${pattern}`, `state.ilike.${pattern}`];
        });
        query = query.or(orConditions.join(','));
      }
    }

    const validSortColumns: Record<string, string> = {
      comp_name: 'comp_name',
      quality_score: 'quality_score',
      total_sites: 'total_sites',
      state: 'reports.state',
      created_at: 'created_at',
    };
    const sortColumn = validSortColumns[sortBy] || 'created_at';

    if (sortColumn === 'reports.state') {
      query = query.order('state', { foreignTable: 'reports', ascending: sortDir });
    } else {
      query = query.order(sortColumn, { ascending: sortDir });
    }

    // Always fetch all for grouping (dedupes same comp across multiple reports)
    const MAX_FETCH = 5000;
    query = query.limit(MAX_FETCH);

    const { data, error } = await query;

    if (error) {
      console.error('[comparables] Query error:', error);
      throw error;
    }

    let filteredData = data || [];

    if (needsPostFilter) {
      const parsedMinAdr = minAdr ? parseFloat(minAdr) : null;
      const parsedMaxAdr = maxAdr ? parseFloat(maxAdr) : null;

      filteredData = filteredData.filter((comp: Record<string, unknown>) => {
        // Search filter: all terms must match (AND). Each term matches if it appears in
        // comp_name, overview, reports fields, unit types, or amenity_keywords.
        if (searchTerms.length > 0) {
          const reports = comp.reports as { city?: string; state?: string; country?: string; location?: string } | null;
          const reportsObj = Array.isArray(reports) ? reports[0] : reports;
          const units = (comp.feasibility_comp_units || []) as Array<{ unit_type?: string; unit_category?: string }>;
          const keywords = (comp.amenity_keywords || []) as string[];
          const derivedState =
            reportsObj?.state ||
            (reportsObj?.location?.match(/,\s*([A-Z]{2})(?:\s|$)/i)?.[1]?.toUpperCase() ?? null);
          const reportWithStudyId = reportsObj as { study_id?: string } | undefined;
          const searchableText = [
            comp.comp_name as string,
            comp.overview as string,
            comp.state as string,
            reportsObj?.city,
            reportsObj?.state,
            derivedState,
            reportsObj?.country,
            reportsObj?.location,
            reportWithStudyId?.study_id,
            ...units.flatMap((u) => [u.unit_type, u.unit_category]),
            ...keywords,
          ]
            .filter(Boolean)
            .map((s) => String(s).toLowerCase());

          const matchesSearch = searchTerms.every((term) => {
            const stateExpansion = STATE_ALIASES[term];
            const termMatches = (text: string) =>
              text.includes(term) || (stateExpansion ? stateExpansion.some((alias) => text.includes(alias)) : false);
            return searchableText.some(termMatches);
          });
          if (!matchesSearch) return false;
        }

        // Unit category / ADR filter
        const units = (comp.feasibility_comp_units || []) as Array<{
          unit_category: string | null;
          low_adr: number | null;
          peak_adr: number | null;
        }>;
        if (hasUnitCategoryFilter || minAdr || maxAdr) {
          if (units.length === 0) return false;
          const unitMatches = units.some((u) => {
            if (hasUnitCategoryFilter && (!u.unit_category || !unitCategories.includes(u.unit_category))) return false;
            if (parsedMinAdr !== null && (u.low_adr === null || u.low_adr < parsedMinAdr)) return false;
            if (parsedMaxAdr !== null && (u.peak_adr === null || u.peak_adr > parsedMaxAdr)) return false;
            return true;
          });
          if (!unitMatches) return false;
        }

        return true;
      });
    }

    /** Exclude comparables with invalid comp_names (notes, subject rows, numeric-only) */
    const isValidCompName = (name: string): boolean => {
      const t = name.trim();
      if (!t || t.length > 80) return false;
      if (/^\d+(\.\d+)?$/.test(t)) return false;
      if (/^(subject\s+projection|subject\s+property)$/i.test(t)) return false;
      if (/\b(resort\s+fee|charges\s+a|incl\.|including|on\s+site\s+activit)/i.test(t)) return false;
      if (/^[\d.\s]+$/.test(t)) return false;
      if (t.split(/\s+/).length > 15) return false;
      return true;
    };

    let validData = filteredData.filter((c) => isValidCompName(String(c.comp_name || '')));

    // Exclude empty asterisk duplicates (e.g. "Ranch at Rock Creek*" with no units/data)
    const isEmptyAsteriskDuplicate = (c: Record<string, unknown>) => {
      const name = String(c.comp_name || '').trim();
      if (!name.endsWith('*')) return false;
      const units = (c.feasibility_comp_units as unknown[]) || [];
      return units.length === 0 && c.quality_score == null && c.total_sites == null;
    };
    validData = validData.filter((c) => !isEmptyAsteriskDuplicate(c));
    let fuzzyUsed = false;

    // Fuzzy fallback: when exact search returns 0 results, try pg_trgm similarity
    const shouldTriggerFuzzy =
      validData.length === 0 &&
      searchTerms.length >= 1 &&
      searchTerms.length <= 3 &&
      searchTerms.every((t) => t.length >= 2);

    if (shouldTriggerFuzzy) {
      const { data: fuzzyIds, error: fuzzyError } = await supabaseAdmin.rpc('search_comparables_fuzzy', {
        p_terms: searchTerms,
        p_similarity_threshold: FUZZY_SIMILARITY_THRESHOLD,
        p_limit: FUZZY_RPC_LIMIT,
      });

      if (!fuzzyError && fuzzyIds && Array.isArray(fuzzyIds) && fuzzyIds.length > 0) {
        const ids = (fuzzyIds as unknown[])
          .map((x) => (typeof x === 'string' ? x : String((x as Record<string, unknown>)?.search_comparables_fuzzy ?? Object.values(x as object)[0] ?? '')))
          .filter(Boolean) as string[];
        const { data: fuzzyRows, error: fetchError } = await supabaseAdmin
          .from('feasibility_comparables')
          .select(
            `
            *,
            reports!inner(id, property_name, location, state, city, country, study_id, created_at),
            feasibility_comp_units(id, unit_type, unit_category, num_units, low_adr, peak_adr, avg_annual_adr, low_occupancy, peak_occupancy, quality_score)
          `
          )
          .in('id', ids);

        if (!fetchError && fuzzyRows && fuzzyRows.length > 0) {
          const parsedMinAdr = minAdr ? parseFloat(minAdr) : null;
          const parsedMaxAdr = maxAdr ? parseFloat(maxAdr) : null;

          let fuzzyFiltered = fuzzyRows as Record<string, unknown>[];

          // Apply state filter
          if (hasStateFilter) {
            fuzzyFiltered = fuzzyFiltered.filter((comp) => {
              const reports = comp.reports as { state?: string } | { state?: string }[] | null;
              const r = Array.isArray(reports) ? reports[0] : reports;
              const compState = r?.state?.trim().toUpperCase();
              return compState && states.includes(compState);
            });
          }

          // Apply unit_category / ADR filter
          if (hasUnitCategoryFilter || minAdr || maxAdr) {
            fuzzyFiltered = fuzzyFiltered.filter((comp) => {
              const units = (comp.feasibility_comp_units || []) as Array<{
                unit_category: string | null;
                low_adr: number | null;
                peak_adr: number | null;
              }>;
              if (units.length === 0) return false;
              return units.some((u) => {
                if (hasUnitCategoryFilter && (!u.unit_category || !unitCategories.includes(u.unit_category))) return false;
                if (parsedMinAdr !== null && (u.low_adr === null || u.low_adr < parsedMinAdr)) return false;
                if (parsedMaxAdr !== null && (u.peak_adr === null || u.peak_adr > parsedMaxAdr)) return false;
                return true;
              });
            });
          }

          validData = fuzzyFiltered
            .filter((c) => isValidCompName(String(c.comp_name || '')))
            .filter((c) => !isEmptyAsteriskDuplicate(c));
          fuzzyUsed = validData.length > 0;
        }
      }
    }

    // Normalize comp_name for dedup: strip trailing asterisk (e.g. "Ranch at Rock Creek*" → "Ranch at Rock Creek")
    const normalizeCompName = (name: string) =>
      String(name || '').trim().replace(/\*+$/, '').trim();
    const getStudyId = (c: Record<string, unknown>) => {
      const r = c.reports as Record<string, unknown> | Record<string, unknown>[] | null;
      const rep = Array.isArray(r) ? r[0] : r;
      return String((rep as Record<string, unknown>)?.study_id ?? '');
    };
    /** Score for picking "best" row when deduping: higher = more complete data */
    const completenessScore = (c: Record<string, unknown>) => {
      const units = (c.feasibility_comp_units as unknown[]) || [];
      const hasUnits = units.length > 0;
      const hasQuality = c.quality_score != null;
      const hasSites = c.total_sites != null;
      const nameClean = !String(c.comp_name || '').trim().endsWith('*');
      return (hasUnits ? 10 : 0) + (hasQuality ? 5 : 0) + (hasSites ? 2 : 0) + (nameClean ? 1 : 0);
    };

    // Group by normalized comp_name only: merge same property across all studies into one row.
    // Same property in multiple jobs (e.g. Lamplighter in 8 studies) shows as one row with "In N jobs: ...".
    const groupKey = (c: Record<string, unknown>) =>
      normalizeCompName(String(c.comp_name || '')).toLowerCase() || '';
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const comp of validData) {
      const key = groupKey(comp);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(comp);
    }

    const groupedData: Record<string, unknown>[] = [];
    for (const rows of groups.values()) {
      // Prefer the row with most complete data (has units, quality, sites; clean name without *)
      const sortedByCompleteness = [...rows].sort((a, b) => completenessScore(b) - completenessScore(a));
      const reportsRaw = rows.map((r) => {
        const rep = (r.reports as Record<string, unknown> | Record<string, unknown>[] | null);
        return Array.isArray(rep) ? rep[0] : rep;
      }).filter(Boolean) as Record<string, unknown>[];
      // Dedupe reports by study_id (same prop+job can have multiple rows from same study)
      const seenStudyIds = new Set<string>();
      const reports = reportsRaw.filter((r) => {
        const sid = String(r.study_id ?? '');
        if (seenStudyIds.has(sid)) return false;
        seenStudyIds.add(sid);
        return true;
      });

      // Sort by study_id for deterministic primary when multiple studies in group
      const sortedByStudy = [...sortedByCompleteness].sort((a, b) =>
        getStudyId(a).localeCompare(getStudyId(b), undefined, { numeric: true })
      );
      const first = sortedByStudy[0] as Record<string, unknown>;

      // Use units from the primary (first) study only—do not merge across studies.
      // Merging caused properties like Live Oak Lake to show unit types from other studies
      // (e.g. treehouse, dome) instead of the correct types for the primary study (e.g. cabin).
      const primaryUnitsRaw = (first.feasibility_comp_units as unknown[]) || [];
      const primaryUnits = filterValidCompUnits(primaryUnitsRaw as Array<{ unit_type?: string | null; num_units?: number | null }>);

      // Sanitize overview: if it looks like "Location: 291.51. Unit types: 0.07" (numeric), clear it
      const overview = first.overview as string | null | undefined;
      const hasBadOverview = overview && (
        /Location:\s*\d+(\.\d+)?/i.test(overview) ||
        /Unit types:\s*\d+(\.\d+)?/i.test(overview)
      );
      const sanitizedFirst = hasBadOverview ? { ...first, overview: null } : first;
      const displayName = normalizeCompName(String(sanitizedFirst.comp_name || '')) || sanitizedFirst.comp_name;

      groupedData.push({
        ...sanitizedFirst,
        comp_name: displayName,
        id: first.id,
        reports: reports.length > 1 ? { _grouped: true, studies: reports } : reports[0],
        feasibility_comp_units: primaryUnits,
        _studyIds: reports.map((r) => r.study_id).filter(Boolean),
        _studyCount: reports.length,
      });
    }

    // Sort grouped data
    const sortCol = validSortColumns[sortBy] || 'created_at';
    groupedData.sort((a, b) => {
      let va: unknown = a[sortCol];
      let vb: unknown = b[sortCol];
      if (sortCol === 'reports.state' || sortBy === 'state') {
        const ra = (a.reports as Record<string, unknown>)?._grouped
          ? (a.reports as { studies: Record<string, unknown>[] }).studies[0]
          : a.reports;
        const rb = (b.reports as Record<string, unknown>)?._grouped
          ? (b.reports as { studies: Record<string, unknown>[] }).studies[0]
          : b.reports;
        va = (ra as Record<string, unknown>)?.state ?? '';
        vb = (rb as Record<string, unknown>)?.state ?? '';
      }
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else if (va != null && vb != null && typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb, undefined, { numeric: true });
      } else {
        cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
      }
      return sortDir ? cmp : -cmp;
    });

    const totalFiltered = groupedData.length;
    const totalPages = Math.ceil(totalFiltered / perPage);
    const start = (page - 1) * perPage;
    const paginatedData = groupedData.slice(start, start + perPage);

    return NextResponse.json({
      success: true,
      comparables: paginatedData,
      pagination: {
        page,
        per_page: perPage,
        total: totalFiltered,
        total_pages: totalPages,
        fuzzy: fuzzyUsed,
      },
    });
  } catch (err) {
    console.error('[comparables] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comparables' },
      { status: 500 }
    );
  }
}
