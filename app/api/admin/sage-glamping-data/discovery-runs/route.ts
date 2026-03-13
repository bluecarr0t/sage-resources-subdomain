/**
 * API Route: Get glamping discovery pipeline run history
 * GET /api/admin/sage-glamping-data/discovery-runs
 *
 * Returns recent discovery runs with metrics (paginated, last 50 by default).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const RUNS_TABLE = 'glamping_discovery_runs';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const GET = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient();
    const url = new URL(request.url);
    const limitParam = url?.searchParams.get('limit');
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
      MAX_LIMIT
    );

    const { data: runs, error } = await supabase
      .from(RUNS_TABLE)
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          runs: [],
          message: 'Run history table not yet created. Run scripts/apply-discovery-runs-migration.ts',
        });
      }
      console.error('[api/admin/sage-glamping-data/discovery-runs] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      runs: runs || [],
    });
  } catch (err) {
    console.error('[api/admin/sage-glamping-data/discovery-runs] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discovery runs' },
      { status: 500 }
    );
  }
});
