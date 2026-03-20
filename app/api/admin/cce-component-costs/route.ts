/**
 * API Route: List / search CCE component costs (Wall Costs, Doors, etc.)
 * GET /api/admin/cce-component-costs
 *
 * Query params:
 *   search     - ilike on section_name, item_name
 *   section    - filter by section_name (exact)
 *   min_cost   - filter by cost column >= value
 *   max_cost   - filter by cost column <= value
 *   cost_col   - which column to filter (1-4, default 1). 1=col_1 (Low), 2=col_2, etc.
 *   page       - 1-indexed page number
 *   per_page   - results per page (default 50)
 *   sort_by    - item_name | section_name | col_1 | col_2 | col_3 | col_4 | source_page
 *   sort_dir   - asc | desc (default asc for section_name)
 *   scope      - outdoor_hospitality | outdoor_hospitality_strict (denylist + optional allowlist + occupancy OR null)
 *   extraction_flag - sparse_tiers | layout_parsed | single_column | had_dot_leaders | normalized_changed | component_table_gated (JSONB contains)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePaginationParams } from '@/lib/validate-pagination';
import {
  componentItemExcludeIlikePatterns,
  componentSectionAllowIlikePatterns,
  componentSectionExcludeIlikePatterns,
  isOutdoorHospitalityOccupancyName,
} from '@/lib/cce-outdoor-hospitality-scope';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const section = searchParams.get('section');
    const minCost = searchParams.get('min_cost');
    const maxCost = searchParams.get('max_cost');
    const costCol = Math.min(4, Math.max(1, parseInt(searchParams.get('cost_col') || '1', 10)));
    const sortBy = searchParams.get('sort_by') || 'section_name';
    const sortDir = (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc';
    const { page, perPage, from } = parsePaginationParams(searchParams);

    const extractionFlag = (searchParams.get('extraction_flag') || '').trim();
    const allowedExtractionFlags = [
      'sparse_tiers',
      'layout_parsed',
      'single_column',
      'had_dot_leaders',
      'normalized_changed',
      'component_table_gated',
    ] as const;

    const supabase = createServerClient();

    const validSortColumns = [
      'item_name',
      'section_name',
      'col_1',
      'col_2',
      'col_3',
      'col_4',
      'source_page',
      'price', // alias for col_1 (low cost)
    ] as const;
    const sortColumnRaw = validSortColumns.includes(sortBy as (typeof validSortColumns)[number])
      ? (sortBy as (typeof validSortColumns)[number])
      : 'section_name';
    const sortColumn = sortColumnRaw === 'price' ? 'col_1' : sortColumnRaw;

    let query = supabase
      .from('cce_component_costs')
      .select('*', { count: 'exact' });

    if (sortColumn === 'item_name' || sortColumn === 'section_name') {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: true });
    } else {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: false });
    }

    if (section) {
      query = query.eq('section_name', section);
    }
    const costColKey = `col_${costCol}` as 'col_1' | 'col_2' | 'col_3' | 'col_4';
    if (minCost) {
      const val = parseFloat(minCost);
      if (!Number.isNaN(val)) query = query.gte(costColKey, val);
    }
    if (maxCost) {
      const val = parseFloat(maxCost);
      if (!Number.isNaN(val)) query = query.lte(costColKey, val);
    }

    if (search) {
      const pattern = `%${escapeIlike(search)}%`;
      query = query.or([`section_name.ilike.${pattern}`, `item_name.ilike.${pattern}`].join(','));
    }

    if (
      extractionFlag &&
      (allowedExtractionFlags as readonly string[]).includes(extractionFlag)
    ) {
      query = query.contains('extraction_flags', { [extractionFlag]: true });
    }

    const scope = searchParams.get('scope');
    const outdoorScope =
      scope === 'outdoor_hospitality' || scope === 'outdoor_hospitality_strict';

    if (outdoorScope) {
      for (const p of componentSectionExcludeIlikePatterns()) {
        query = query.not('section_name', 'ilike', p);
      }
      for (const p of componentItemExcludeIlikePatterns()) {
        query = query.not('item_name', 'ilike', p);
      }

      if (scope === 'outdoor_hospitality_strict') {
        const allows = componentSectionAllowIlikePatterns();
        const orClause = allows.map((pat) => `section_name.ilike.${pat}`).join(',');
        query = query.or(orClause);
      }

      const { data: occRows, error: occErr } = await supabase
        .from('cce_occupancies')
        .select('id, occupancy_name');
      if (!occErr) {
        const allowedIds = (occRows || [])
          .filter((o) => isOutdoorHospitalityOccupancyName(o.occupancy_name))
          .map((o) => o.id);
        if (allowedIds.length > 0) {
          query = query.or(
            `occupancy_id.is.null,occupancy_id.in.(${allowedIds.join(',')})`
          );
        }
      }
    }

    const { data, error, count } = await query.range(from, from + perPage - 1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message:
            'CCE component costs table not yet created. Run scripts/migrations/create-cce-costs-tables.sql',
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
    console.error('[api/admin/cce-component-costs] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCE component costs' },
      { status: 500 }
    );
  }
});
