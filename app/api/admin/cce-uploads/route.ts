/**
 * API Route: List uploaded CCE PDFs
 * GET /api/admin/cce-uploads
 *
 * Returns list of PDF files in local_data/CCE_uploads/
 */

import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  try {
    const uploadsDir = resolve(process.cwd(), 'local_data', 'CCE_uploads');
    let files: string[] = [];
    try {
      const entries = await readdir(uploadsDir, { withFileTypes: true });
      files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
        .map((e) => e.name)
        .sort();
    } catch {
      // Directory may not exist
    }
    return NextResponse.json({ files });
  } catch (err) {
    console.error('[cce-uploads] Error:', err);
    return NextResponse.json(
      { error: 'Failed to list uploads' },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
