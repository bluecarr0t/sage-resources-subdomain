/**
 * GET /api/admin/sage-glamping-data/pipeline-coverage
 *
 * Per-state / per-province pipeline coverage: sweep metadata plus live
 * Proposed Development / Under Construction / Cancelled counts from all_sage_data.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  fetchPipelineCoverageSnapshot,
  sageDataEditorHrefForRegion,
} from '@/lib/glamping-pipeline/state-coverage';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createServerClient();
    const rows = await fetchPipelineCoverageSnapshot(supabase);

    const summary = rows.reduce(
      (acc, row) => {
        acc.proposed += row.live.proposed;
        acc.underConstruction += row.live.underConstruction;
        acc.cancelled += row.live.cancelled;
        if (row.sweepStatus === 'pending') acc.pendingSweeps += 1;
        if (row.sweepStatus === 'complete') acc.completeSweeps += 1;
        if (row.sweepStatus === 'no_projects_found') acc.noProjectsFound += 1;
        if (row.live.proposed + row.live.underConstruction === 0) {
          acc.regionsWithZeroPipeline += 1;
        }
        return acc;
      },
      {
        proposed: 0,
        underConstruction: 0,
        cancelled: 0,
        pendingSweeps: 0,
        completeSweeps: 0,
        noProjectsFound: 0,
        regionsWithZeroPipeline: 0,
      }
    );

    return NextResponse.json({
      success: true,
      summary,
      regions: rows.map((row) => ({
        ...row,
        editorHref: sageDataEditorHrefForRegion(row.country, row.regionCode),
      })),
    });
  } catch (err) {
    console.error('[api/admin/sage-glamping-data/pipeline-coverage]', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load pipeline coverage',
      },
      { status: 500 }
    );
  }
});
