/**
 * API Route: List / search CCE catalog units (Converted Containers, etc.)
 * GET /api/admin/cce-catalog-units
 *
 * Query params:
 *   search        - ilike on manufacturer, product_model, catalog_section
 *   manufacturer  - filter by manufacturer
 *   unit_type     - filter by catalog_section (e.g. Converted Container Manufacturers)
 *   min_price     - filter by price >= value
 *   max_price     - filter by price <= value
 *   min_floor_area - filter by floor_area_sqft >= value
 *   max_floor_area - filter by floor_area_sqft <= value
 *   page          - 1-indexed page number
 *   per_page      - results per page (default 50)
 *   sort_by       - price | floor_area_sqft | manufacturer | product_model | source_page
 *   sort_dir      - asc | desc (default asc for price/area, asc for name)
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
    const manufacturer = searchParams.get('manufacturer');
    const unitType = searchParams.get('unit_type');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const minFloorArea = searchParams.get('min_floor_area');
    const maxFloorArea = searchParams.get('max_floor_area');
    const sortBy = searchParams.get('sort_by') || 'price';
    const sortDir = (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc';
    const { page, perPage, from } = parsePaginationParams(searchParams);

    const supabase = createServerClient();

    const validSortColumns = [
      'price',
      'floor_area_sqft',
      'manufacturer',
      'product_model',
      'source_page',
    ] as const;
    const sortColumn = validSortColumns.includes(sortBy as (typeof validSortColumns)[number])
      ? (sortBy as (typeof validSortColumns)[number])
      : 'price';

    let query = supabase
      .from('cce_catalog_units')
      .select('*', { count: 'exact' });

    if (sortColumn === 'manufacturer' || sortColumn === 'product_model') {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: true });
    } else {
      query = query.order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: false });
    }

    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer);
    }
    if (unitType) {
      const pattern = `%${escapeIlike(unitType)}%`;
      query = query.ilike('catalog_section', pattern);
    }
    if (minPrice) {
      const val = parseFloat(minPrice);
      if (!Number.isNaN(val)) query = query.gte('price', val);
    }
    if (maxPrice) {
      const val = parseFloat(maxPrice);
      if (!Number.isNaN(val)) query = query.lte('price', val);
    }
    if (minFloorArea) {
      const val = parseFloat(minFloorArea);
      if (!Number.isNaN(val)) query = query.gte('floor_area_sqft', val);
    }
    if (maxFloorArea) {
      const val = parseFloat(maxFloorArea);
      if (!Number.isNaN(val)) query = query.lte('floor_area_sqft', val);
    }

    if (search) {
      const pattern = `%${escapeIlike(search)}%`;
      query = query.or(
        [`manufacturer.ilike.${pattern}`, `product_model.ilike.${pattern}`, `catalog_section.ilike.${pattern}`].join(
          ','
        )
      );
    }

    const { data, error, count } = await query.range(from, from + perPage - 1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          rows: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message: 'CCE catalog units table not yet created. Run scripts/migrations/create-cce-catalog-units.sql',
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
    console.error('[api/admin/cce-catalog-units] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCE catalog units' },
      { status: 500 }
    );
  }
});
