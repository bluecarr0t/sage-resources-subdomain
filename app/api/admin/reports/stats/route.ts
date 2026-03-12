/**
 * API Route: Past Reports summary stats for dashboard
 * GET /api/admin/reports/stats
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const GET = withAdminAuth(async (_request, _auth) => {
  try {
    const supabaseAdmin = createServerClient();
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('reports')
      .select('id, state')
      .is('deleted_at', null);

    if (reportsError) {
      if (reportsError.code === '42P01') {
        return NextResponse.json({
          success: true,
          studies: 0,
          comparables: 0,
          unit_records: 0,
          states_covered: 0,
        });
      }
      throw reportsError;
    }

    const reportIds = (reports || []).map((r) => r.id);
    const states = new Set((reports || []).map((r) => r.state).filter(Boolean) as string[]);

    let comparables = 0;
    let unitRecords = 0;

    if (reportIds.length > 0) {
      const { count: compCount } = await supabaseAdmin
        .from('feasibility_comparables')
        .select('id', { count: 'exact', head: true })
        .in('report_id', reportIds);

      const { count: unitCount } = await supabaseAdmin
        .from('feasibility_comp_units')
        .select('id', { count: 'exact', head: true })
        .in('report_id', reportIds);

      comparables = compCount ?? 0;
      unitRecords = unitCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      studies: reportIds.length,
      comparables,
      unit_records: unitRecords,
      states_covered: states.size,
    });
  } catch (err) {
    console.error('[api/admin/reports/stats] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
});
