/**
 * API Route: List / search feasibility comparables
 * GET /api/admin/comparables
 *
 * Query params:
 *   search       - fuzzy text search on comp_name, city, state, country, unit type/category, amenity keywords
 *   state        - filter by report state
 *   unit_category - filter comp_units by unit_category
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

const DEFAULT_PER_PAGE = 50;

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

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || '';
    const unitCategory = searchParams.get('unit_category') || '';
    const minAdr = searchParams.get('min_adr');
    const maxAdr = searchParams.get('max_adr');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortDir = searchParams.get('sort_dir') === 'asc' ? true : false;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || String(DEFAULT_PER_PAGE), 10)));

    const supabaseAdmin = createServerClient();

    // When filtering by unit_category, ADR, or search, we fetch all rows and filter in app.
    // PostgREST .or() with embedded resources causes 500 errors; keyword search requires
    // array overlap which also fails in or(). App-side filtering is reliable.
    const needsPostFilter = !!(unitCategory || minAdr || maxAdr || search);
    const searchTerms = search
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    let query = supabaseAdmin
      .from('feasibility_comparables')
      .select(`
        *,
        reports!inner(id, property_name, location, state, city, country, study_id, created_at),
        feasibility_comp_units(id, unit_type, unit_category, num_units, low_adr, peak_adr, avg_annual_adr, low_occupancy, peak_occupancy, quality_score)
      `, { count: needsPostFilter ? undefined : 'exact' });

    if (state) {
      query = query.eq('reports.state', state);
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
          const searchableText = [
            comp.comp_name as string,
            comp.overview as string,
            reportsObj?.city,
            reportsObj?.state,
            derivedState,
            reportsObj?.country,
            reportsObj?.location,
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
        if (unitCategory || minAdr || maxAdr) {
          if (units.length === 0) return false;
          const unitMatches = units.some((u) => {
            if (unitCategory && u.unit_category !== unitCategory) return false;
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

    const validData = filteredData.filter((c) => isValidCompName(String(c.comp_name || '')));

    // Group by comp_name (same property in multiple reports → one row)
    const groupKey = (c: Record<string, unknown>) =>
      String(c.comp_name || '').trim().toLowerCase();
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const comp of validData) {
      const key = groupKey(comp);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(comp);
    }

    const groupedData: Record<string, unknown>[] = [];
    for (const rows of groups.values()) {
      const first = rows[0] as Record<string, unknown>;
      const reports = rows.map((r) => {
        const rep = (r.reports as Record<string, unknown> | Record<string, unknown>[] | null);
        return Array.isArray(rep) ? rep[0] : rep;
      }).filter(Boolean) as Record<string, unknown>[];

      const allUnits = rows.flatMap((r) => (r.feasibility_comp_units as unknown[]) || []);
      const seenUnit = new Set<string>();
      const mergedUnits = allUnits.filter((u) => {
        const uRecord = u as Record<string, unknown>;
        const k = `${uRecord.unit_type || ''}:${uRecord.unit_category || ''}`;
        if (seenUnit.has(k)) return false;
        seenUnit.add(k);
        return true;
      });

      // Sanitize overview: if it looks like "Location: 291.51. Unit types: 0.07" (numeric), clear it
      const overview = first.overview as string | null | undefined;
      const hasBadOverview = overview && (
        /Location:\s*\d+(\.\d+)?/i.test(overview) ||
        /Unit types:\s*\d+(\.\d+)?/i.test(overview)
      );
      const sanitizedFirst = hasBadOverview ? { ...first, overview: null } : first;

      groupedData.push({
        ...sanitizedFirst,
        id: first.id,
        reports: reports.length > 1 ? { _grouped: true, studies: reports } : reports[0],
        feasibility_comp_units: mergedUnits,
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
