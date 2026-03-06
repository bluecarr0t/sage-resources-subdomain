/**
 * API Route: Download original .xlsx file for a feasibility study
 * GET /api/admin/comparables/:studyId/download
 *
 * Returns the original uploaded workbook file from Supabase storage.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { logAdminAudit } from '@/lib/admin-audit';

const BUCKET_NAME = 'report-uploads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { studyId } = await params;

    const supabaseAdmin = createServerClient();

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, csv_file_path')
      .eq('study_id', studyId)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report?.csv_file_path) {
      return NextResponse.json(
        { success: false, message: 'Original file not found for this study' },
        { status: 404 }
      );
    }

    const path = report.csv_file_path;
    if (path.includes('..') || path.startsWith('/') || /[<>"|?*]/.test(path)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file path' },
        { status: 400 }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(path);

    if (downloadError || !fileData) {
      console.error('[comparables/download] Storage error:', downloadError);
      const hint = downloadError?.message?.includes('Bucket') || downloadError?.message?.includes('not found')
        ? ' The storage bucket may need to be configured. Run: npx tsx scripts/create-report-uploads-bucket.ts'
        : '';
      return NextResponse.json(
        { success: false, message: `Failed to retrieve file from storage.${hint}` },
        { status: 500 }
      );
    }

    const filename = path.split('/').pop() || `${studyId}.xlsx`;

    await logAdminAudit(
      {
        user_id: session.user.id,
        user_email: session.user.email ?? undefined,
        action: 'download',
        resource_type: 'study',
        resource_id: report.id,
        study_id: studyId,
        details: { file_type: 'xlsx', filename },
        source: 'session',
      },
      request
    );

    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[comparables/download] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Download failed' },
      { status: 500 }
    );
  }
}
