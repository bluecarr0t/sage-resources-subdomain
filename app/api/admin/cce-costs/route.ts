/**
 * API Route: List / search CCE (Commercial Cost Explorer) cost data
 * GET /api/admin/cce-costs
 *
 * Query params:
 *   search         - ilike on occupancy_name, exterior_walls, interior_finish, building_class, quality_type
 *   occupancy_code - filter by occupancy code
 *   building_class - filter by building class (A-B, C, D, etc.)
 *   quality_type   - filter by quality type (Good, Average, etc.)
 *   min_cost       - filter by cost_sq_ft >= value
 *   max_cost       - filter by cost_sq_ft <= value
 *   page           - 1-indexed page number
 *   per_page       - results per page (default 50)
 *   sort_by        - cost_sq_ft | occupancy_name | building_class | quality_type | source_page
 *   sort_dir       - asc | desc (default asc for cost, desc for name)
 *   ids            - comma-separated row UUIDs (for favorites filter - exact rows only)
 *   scope          - outdoor_hospitality = limit to occupancies relevant to glamping, RV, campgrounds, marinas, resort hotels
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePaginationParams } from '@/lib/validate-pagination';
import { expandQualityTypeForFilter } from '@/lib/cce-quality-types';
import { getLatestCceExtractionDate } from '@/lib/cce-latest-extraction';
import { isOutdoorHospitalityOccupancyName } from '@/lib/cce-outdoor-hospitality-scope';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const occupancyCode = searchParams.get('occupancy_code');
    const buildingClass = searchParams.get('building_class');
    const qualityType = searchParams.get('quality_type');
    const minCost = searchParams.get('min_cost');
    const maxCost = searchParams.get('max_cost');
    const sortBy = searchParams.get('sort_by') || 'cost_sq_ft';
    const sortDir = (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc';
    const { page, perPage, from } = parsePaginationParams(searchParams);

    const supabase = createServerClient();

    const validSortColumns = ['cost_sq_ft', 'cost_sq_m', 'cost_cu_ft', 'building_class', 'quality_type', 'source_page', 'occupancy_name'] as const;
    const sortColumn = validSortColumns.includes(sortBy as (typeof validSortColumns)[number])
      ? (sortBy as (typeof validSortColumns)[number])
      : 'cost_sq_ft';

    const latestExtractionDate = await getLatestCceExtractionDate(supabase);

    const idsParam = searchParams.get('ids');
    const rowIds: string[] = idsParam
      ? idsParam
          .split(',')
          .map((s) => s.trim())
          .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
      : [];

    const occupancyCodesParam = searchParams.get('occupancy_codes');
    let occupancyIdFilter: string | null = null;
    let occupancyIds: string[] = [];
    if (rowIds.length > 0) {
      // Favorites: filter by exact row IDs only (no occupancy_codes)
    } else if (occupancyCodesParam) {
      const codes = occupancyCodesParam
        .split(',')
        .map((c) => parseInt(c.trim(), 10))
        .filter((c) => !Number.isNaN(c));
      if (codes.length > 0) {
        const { data: occs } = await supabase
          .from('cce_occupancies')
          .select('id')
          .in('occupancy_code', codes);
        occupancyIds = (occs || []).map((o) => o.id);
      }
    } else if (occupancyCode) {
      const code = parseInt(occupancyCode, 10);
      if (!Number.isNaN(code)) {
        const { data: occ } = await supabase
          .from('cce_occupancies')
          .select('id')
          .eq('occupancy_code', code)
          .limit(1)
          .maybeSingle();
        if (occ?.id) occupancyIdFilter = occ.id;
      }
    }

    const scope = searchParams.get('scope');
    if (scope === 'outdoor_hospitality' && rowIds.length === 0) {
      const { data: namedOccs, error: namedErr } = await supabase
        .from('cce_occupancies')
        .select('id, occupancy_name');
      if (namedErr && namedErr.code !== '42P01') throw namedErr;

      const allowedIds = (namedOccs || [])
        .filter((o) => isOutdoorHospitalityOccupancyName(o.occupancy_name))
        .map((o) => o.id);

      if (allowedIds.length === 0) {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message:
            'No outdoor-hospitality occupancies found. Clear the scope filter or re-run PDF extraction.',
        });
      }

      const allowed = new Set(allowedIds);

      if (occupancyIds.length > 0) {
        occupancyIds = occupancyIds.filter((id) => allowed.has(id));
        occupancyIdFilter = null;
      } else if (occupancyIdFilter) {
        if (!allowed.has(occupancyIdFilter)) {
          return NextResponse.json({
            success: true,
            rows: [],
            pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
            message: 'Selected occupancy is outside the outdoor hospitality scope.',
          });
        }
      } else {
        occupancyIds = allowedIds;
        occupancyIdFilter = null;
      }

      if (occupancyIds.length === 0 && !occupancyIdFilter) {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message: 'No rows match the current filters within the outdoor hospitality scope.',
        });
      }
    }

    let query = supabase
      .from('cce_cost_rows')
      .select(
        `
        id,
        building_class,
        quality_type,
        exterior_walls,
        interior_finish,
        lighting_plumbing,
        heat,
        cost_sq_m,
        cost_cu_ft,
        cost_sq_ft,
        source_page,
        cce_occupancies!inner(occupancy_code, occupancy_name)
      `,
        { count: 'exact' }
      );

    if (sortColumn === 'occupancy_name') {
      query = query.order('cce_occupancies(occupancy_name)', { ascending: sortDir === 'asc', nullsFirst: true });
    } else if (sortColumn === 'cost_sq_ft' || sortColumn === 'cost_sq_m' || sortColumn === 'cost_cu_ft' || sortColumn === 'source_page') {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: false });
    } else {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: true });
    }

    if (rowIds.length > 0) {
      query = query.in('id', rowIds);
    } else if (occupancyIds.length > 0) {
      query = query.in('occupancy_id', occupancyIds);
    } else if (occupancyIdFilter) {
      query = query.eq('occupancy_id', occupancyIdFilter);
    }
    if (latestExtractionDate) {
      query = query.eq('extraction_date', latestExtractionDate);
    }
    // When latestExtractionDate is null (no column or all null): show all rows (legacy behavior)
    if (buildingClass) {
      query = query.eq('building_class', buildingClass);
    }
    if (qualityType) {
      const variants = expandQualityTypeForFilter(qualityType);
      query = query.in('quality_type', variants);
    }
    if (minCost) {
      const val = parseFloat(minCost);
      if (!Number.isNaN(val)) query = query.gte('cost_sq_ft', val);
    }
    if (maxCost) {
      const val = parseFloat(maxCost);
      if (!Number.isNaN(val)) query = query.lte('cost_sq_ft', val);
    }

    if (search) {
      const pattern = `%${escapeIlike(search)}%`;
      // PostgREST .or() cannot filter on nested/embedded table columns (cce_occupancies.occupancy_name).
      // Use two-step: first get matching occupancy IDs, then OR with main-table columns.
      const { data: occMatches } = await supabase
        .from('cce_occupancies')
        .select('id')
        .ilike('occupancy_name', pattern);
      const occupancyIdsFromSearch = (occMatches || []).map((o) => o.id);

      const orConditions: string[] = [
        `exterior_walls.ilike.${pattern}`,
        `interior_finish.ilike.${pattern}`,
        `building_class.ilike.${pattern}`,
        `quality_type.ilike.${pattern}`,
      ];
      if (occupancyIdsFromSearch.length > 0) {
        const quotedIds = occupancyIdsFromSearch.map((id) => `"${id}"`).join(',');
        orConditions.unshift(`occupancy_id.in.(${quotedIds})`);
      }
      query = query.or(orConditions.join(','));
    }

    const { data, error, count } = await query.range(from, from + perPage - 1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message: 'CCE tables not yet created. Run scripts/migrations/create-cce-costs-tables.sql',
        });
      }
      throw error;
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      success: true,
      rows: data || [],
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    });
  } catch (err) {
    console.error('[api/admin/cce-costs] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCE costs' },
      { status: 500 }
    );
  }
});
