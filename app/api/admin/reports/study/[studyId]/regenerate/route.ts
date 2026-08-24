/**
 * API Route: Regenerate report DOCX + XLSX from existing report data
 * POST /api/admin/reports/study/[studyId]/regenerate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { executeGenerateDraft, StudyIdConflictError } from '@/lib/ai-report-builder/execute-generate-draft';
import { mapReportRowToDraftInput } from '@/lib/ai-report-builder/report-row-to-input';
import {
  assertReportAccess,
  getReportAccessActor,
  reportAccessDeniedResponse,
} from '@/lib/report-access';
import {
  acquireRegenerateLock,
  checkReportRateLimit,
  generationInProgressResponse,
  rateLimitExceededResponse,
  releaseRegenerateLock,
} from '@/lib/report-builder-limits';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type ParamsContext = { params: Promise<{ studyId: string }> };

export const POST = withAdminAuth<ParamsContext>(async (request: NextRequest, auth, context) => {
  const { studyId } = await context!.params;
  let lockHeld = false;

  try {
    const rate = await checkReportRateLimit('regenerate', auth.session.user.id);
    if (!rate.allowed) {
      return rateLimitExceededResponse(rate.resetAt);
    }

    const actor = await getReportAccessActor(auth.session.user.id);
    const supabaseAdmin = createServerClient();

    const { data: report, error: fetchError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[regenerate] Fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    const access = assertReportAccess(actor, report);
    if (!access.ok) {
      return reportAccessDeniedResponse(access);
    }

    if (!report!.property_name || !report!.city || !report!.state) {
      return NextResponse.json(
        { success: false, error: 'Report missing required fields (property_name, city, state)' },
        { status: 400 }
      );
    }

    lockHeld = await acquireRegenerateLock(studyId);
    if (!lockHeld) {
      return generationInProgressResponse();
    }

    const input = mapReportRowToDraftInput(report!, studyId);
    const result = await executeGenerateDraft({
      input,
      userId: report!.user_id ?? auth.session.user.id,
      userEmail: auth.session.user.email ?? undefined,
      draftMode: true,
      existingReportId: report!.id,
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Report regenerated successfully',
      docx_size: result.docxBuffer.length,
      xlsx_size: result.xlsxBuffer.length,
    });
  } catch (err) {
    console.error('[regenerate] Error:', err);
    if (err instanceof StudyIdConflictError) {
      return NextResponse.json(
        { success: false, error: err.message, studyId: err.studyId, reportId: err.reportId },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Regeneration failed',
      },
      { status: 500 }
    );
  } finally {
    if (lockHeld) {
      await releaseRegenerateLock(studyId);
    }
  }
});
