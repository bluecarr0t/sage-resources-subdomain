/**
 * API Route: Download DOCX file for a report
 * GET /api/admin/reports/study/[studyId]/download-docx
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
  const { studyId } = await params;

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

    const supabaseAdmin = createServerClient();

    const { data: report, error: queryError } = await supabaseAdmin
      .from('reports')
      .select('id, docx_file_path, narrative_file_path, study_id')
      .eq('study_id', studyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error('[download-docx] DB query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to look up report' },
        { status: 500 }
      );
    }

    const docxPath = report?.docx_file_path;
    const narrativePath = report?.narrative_file_path;
    const hasAnyPath = docxPath || (narrativePath && /\.(docx|doc)$/i.test(narrativePath));

    if (!hasAnyPath) {
      return NextResponse.json(
        { success: false, error: 'No DOCX file found for this report' },
        { status: 404 }
      );
    }

    const pathsToTry: string[] = [];
    if (docxPath) pathsToTry.push(docxPath);
    if (narrativePath && /\.(docx|doc)$/i.test(narrativePath) && !pathsToTry.includes(narrativePath)) {
      pathsToTry.push(narrativePath);
    }
    if (docxPath?.endsWith('/report.docx') && !pathsToTry.includes(docxPath.replace(/\/report\.docx$/i, '/narrative.docx'))) {
      pathsToTry.push(docxPath.replace(/\/report\.docx$/i, '/narrative.docx'));
    }

    const isValidPath = (p: string) =>
      !p.includes('..') && !p.startsWith('/') && !/[<>"|?*]/.test(p);

    let fileData: Blob | null = null;
    let usedPath: string | null = null;

    for (const filePath of pathsToTry) {
      if (!isValidPath(filePath)) continue;
      const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(filePath);
      if (!error && data) {
        fileData = data;
        usedPath = filePath;
        break;
      }
    }

    if (!fileData && pathsToTry.length > 0 && pathsToTry[0].includes('/')) {
      const folder = pathsToTry[0].split('/').slice(0, -1).join('/');
      if (isValidPath(folder)) {
        const { data: list } = await supabaseAdmin.storage.from(BUCKET_NAME).list(folder, { limit: 50 });
        const docFile = list?.find(
          (f) =>
            !f.name?.startsWith('.') &&
            (f.name?.toLowerCase().endsWith('.docx') || f.name?.toLowerCase().endsWith('.doc'))
        );
        if (docFile) {
          const foundPath = `${folder}/${docFile.name}`;
          const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(foundPath);
          if (!error && data) {
            fileData = data;
            usedPath = foundPath;
          }
        }
        if (!fileData && report?.id) {
          const { data: wbList } = await supabaseAdmin.storage.from(BUCKET_NAME).list(`${folder}/workbooks`, { limit: 50 });
          const wbDoc = wbList?.find(
            (f) =>
              !f.name?.startsWith('.') &&
              (f.name?.toLowerCase().endsWith('.docx') || f.name?.toLowerCase().endsWith('.doc'))
          );
          if (wbDoc) {
            const wbPath = `${folder}/workbooks/${wbDoc.name}`;
            const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(wbPath);
            if (!error && data) {
              fileData = data;
              usedPath = wbPath;
            }
          }
        }
      }
    }

    if (fileData && usedPath) {
      const arrayBuffer = await fileData.arrayBuffer();
      const filename = `${report!.study_id}-report.docx`;

      await logAdminAudit(
        {
          user_id: session.user.id,
          user_email: session.user.email ?? undefined,
          action: 'download',
          resource_type: 'report',
          resource_id: report!.id,
          study_id: report!.study_id ?? undefined,
          details: { file_type: 'docx', filename },
          source: 'session',
        },
        request
      );

      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': arrayBuffer.byteLength.toString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No DOCX file found in storage. This report may have been uploaded without a Word document.',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('[download-docx] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
}
