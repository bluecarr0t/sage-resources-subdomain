/**
 * API Route: Upload CCE PDF for extraction
 * POST /api/admin/cce-upload
 *
 * Accepts multipart/form-data with a single PDF file.
 * Saves to local_data/CCE_uploads/ with sanitized filename.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = 'CCE_uploads';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_') || 'upload.pdf';
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file?.size || !file.name?.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'A PDF file is required' },
        { status: 400 }
      );
    }

    const base = resolve(process.cwd(), 'local_data');
    const uploadDir = resolve(base, UPLOAD_DIR);

    if (!existsSync(base)) {
      await mkdir(base, { recursive: true });
    }
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = sanitizeFilename(file.name);
    const destPath = resolve(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      path: destPath,
      relativePath: `local_data/${UPLOAD_DIR}/${filename}`,
    });
  } catch (err) {
    console.error('[cce-upload] Error:', err);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
