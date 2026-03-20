/**
 * API Route: List / search CCE cost percentage data (e.g. Section 54 ELECTRICAL)
 * GET /api/admin/cce-cost-percentages
 *
 * Query params:
 *   search       - ilike on occupancy, category, section_name
 *   section      - filter by section_name (e.g. ELECTRICAL)
 *   category     - filter by category
 *   occupancy    - filter by occupancy (building type)
 *   page         - 1-indexed page number
 *   per_page     - results per page (default 50)
 *   sort_by      - section_name | occupancy | category | median_pct | low_pct | high_pct | source_page
 *   sort_dir     - asc | desc
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePaginationParams } from '@/lib/validate-pagination';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const section = searchParams.get('section');
    const category = searchParams.get('category');
    const occupancy = searchParams.get('occupancy');
    const sortBy = searchParams.get('sort_by') || 'occupancy';
    const sortDir = (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc';
    const { page, perPage, from } = parsePaginationParams(searchParams);

    const supabase = createServerClient();

    const validSortColumns = ['section_name', 'occupancy', 'category', 'median_pct', 'low_pct', 'high_pct', 'source_page'] as const;
    const sortColumn = validSortColumns.includes(sortBy as (typeof validSortColumns)[number])
      ? (sortBy as (typeof validSortColumns)[number])
      : 'occupancy';

    let query = supabase
      .from('cce_cost_percentages')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: sortColumn.includes('pct') ? false : true });

    if (section) query = query.eq('section_name', section);
    if (category) query = query.eq('category', category);
    if (occupancy) query = query.ilike('occupancy', `%${escapeIlike(occupancy)}%`);

    if (search) {
      const pattern = `%${escapeIlike(search)}%`;
      query = query.or(
        [`occupancy.ilike.${pattern}`, `category.ilike.${pattern}`, `section_name.ilike.${pattern}`].join(',')
      );
    }

    const { data, error, count } = await query.range(from, from + perPage - 1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message: 'cce_cost_percentages table not yet created. Run apply-cce-cost-percentages-migration.',
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
    console.error('[api/admin/cce-cost-percentages] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCE cost percentages' },
      { status: 500 }
    );
  }
});
