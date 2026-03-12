/**
 * API Route: List admin audit logs
 * GET /api/admin/audit-log
 *
 * Query params: action, resource_type, study_id, page, per_page
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePaginationParams } from '@/lib/validate-pagination';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resource_type');
    const studyId = searchParams.get('study_id');
    const { page, perPage, from } = parsePaginationParams(searchParams);

    const supabase = createServerClient();
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (studyId) query = query.eq('study_id', studyId);

    const { data, error, count } = await query.range(from, from + perPage - 1);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          logs: [],
          pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          message: 'Audit log table not yet created. Run the admin-audit-log migration.',
        });
      }
      throw error;
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      success: true,
      logs: data || [],
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    });
  } catch (err) {
    console.error('[api/admin/audit-log] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
});
