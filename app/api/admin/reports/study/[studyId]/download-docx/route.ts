/**
 * API Route: Download DOCX file for a report
 * GET /api/admin/reports/study/[studyId]/download-docx
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

const BUCKET_NAME = 'report-uploads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  const { studyId } = await params;

  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createServerClient();

    const { data: report, error: queryError } = await supabaseAdmin
      .from('reports')
      .select('id, docx_file_path, study_id')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      console.error('[download-docx] DB query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to look up report' },
        { status: 500 }
      );
    }

    if (!report?.docx_file_path) {
      return NextResponse.json(
        { success: false, error: 'No DOCX file found for this report' },
        { status: 404 }
      );
    }

    const filePath = report.docx_file_path;

    if (filePath.includes('..') || filePath.startsWith('/') || /[<>"|?*]/.test(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Try direct download first
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (!downloadError && fileData) {
      const arrayBuffer = await fileData.arrayBuffer();
      const filename = `${report.study_id}-report.docx`;

      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': arrayBuffer.byteLength.toString(),
        },
      });
    }

    console.error(`[download-docx] Storage download failed for path "${filePath}":`, downloadError);

    // Fallback: try a signed URL redirect
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60);

    if (!signedUrlError && signedUrlData?.signedUrl) {
      return NextResponse.redirect(signedUrlData.signedUrl);
    }

    console.error(`[download-docx] Signed URL also failed for path "${filePath}":`, signedUrlError);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download file. The file may not exist in storage.',
        detail: downloadError?.message || 'Unknown storage error',
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('[download-docx] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
}
