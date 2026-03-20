/**
 * API Route: Download Cost Analysis XLSX for a report
 * GET /api/admin/reports/study/[studyId]/download-cost-analysis
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { logAdminAudit } from '@/lib/admin-audit';

const BUCKET_NAME = 'report-uploads';

type ParamsContext = { params: Promise<{ studyId: string }> };

export const GET = withAdminAuth<ParamsContext>(async (request, auth, context) => {
  const { studyId } = await context!.params;

  try {
    const supabaseAdmin = createServerClient();

    const { data: report, error: queryError } = await supabaseAdmin
      .from('reports')
      .select('id, cost_analysis_file_path, study_id')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error('[download-cost-analysis] DB query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to look up report' },
        { status: 500 }
      );
    }

    if (!report?.cost_analysis_file_path) {
      return NextResponse.json(
        { success: false, error: 'No Cost Analysis file found for this report' },
        { status: 404 }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(report.cost_analysis_file_path);

    if (downloadError || !fileData) {
      console.error('[download-cost-analysis] Storage error:', downloadError);
      return NextResponse.json(
        { success: false, error: 'Cost Analysis file not found in storage' },
        { status: 404 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const filename = `${report.study_id}-cost-analysis.xlsx`;

    await logAdminAudit(
      {
        user_id: auth.session.user.id,
        user_email: auth.session.user.email ?? undefined,
        action: 'download',
        resource_type: 'report',
        resource_id: report.id,
        study_id: report.study_id ?? undefined,
        details: { file_type: 'cost-analysis-xlsx', filename },
        source: 'session',
      },
      request
    );

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[download-cost-analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
});
