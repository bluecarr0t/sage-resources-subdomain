/**
 * POST /api/admin/reports/import-stdb
 * Multipart: file (required) + optional studyId.
 * Parses STDB CSV/XLSX export and stores the raw upload under report-uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { parseStdbUpload } from '@/lib/ai-report-builder/stdb-import';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'report-uploads';
const MAX_BYTES = 25 * 1024 * 1024;

function contentTypeForFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return 'text/csv';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsm')) {
    return 'application/vnd.ms-excel.sheet.macroEnabled.12';
  }
  return 'application/octet-stream';
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180) || 'stdb-export';
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) return auth.response;

    const form = await request.formData();
    const file = form.get('file');
    const studyIdRaw = form.get('studyId');
    const studyId =
      typeof studyIdRaw === 'string' && studyIdRaw.trim() ? studyIdRaw.trim() : null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing file (multipart field "file")' },
        { status: 400 }
      );
    }

    const filename = file.name || 'stdb-export.xlsx';
    const lower = filename.toLowerCase();
    const allowed =
      lower.endsWith('.csv') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.xls') ||
      lower.endsWith('.xlsm');
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Only CSV or Excel STDB exports are supported' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 25 MB limit' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parse = await parseStdbUpload(buffer, filename);

    const userId = auth.session.user.id;
    const stamp = Date.now();
    const storagePath = `stdb/${userId}/${stamp}-${safeFilename(filename)}`;

    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
      contentType: contentTypeForFilename(filename),
      upsert: false,
    });

    if (uploadError) {
      console.error('[import-stdb] storage upload failed:', uploadError);
      const isBucketErr =
        uploadError.message?.includes('Bucket not found') ||
        uploadError.message?.includes('not found');
      return NextResponse.json(
        {
          success: false,
          error: isBucketErr
            ? 'Storage bucket report-uploads does not exist. Create it in Supabase Dashboard.'
            : `Failed to upload STDB file: ${uploadError.message}`,
          parse,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      parse,
      storagePath,
      studyId,
    });
  } catch (err) {
    console.error('[import-stdb]', err);
    const message = err instanceof Error ? err.message : 'Failed to import STDB file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
