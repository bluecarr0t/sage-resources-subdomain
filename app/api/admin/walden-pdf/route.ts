/**
 * API Route: Serve Walden Unique Accommodation Buyers Guide (catalog), admin-only.
 * GET /api/admin/walden-pdf
 *
 * CCE edition PDFs stay under /api/admin/cce-pdf/[month].
 * Link format: /api/admin/walden-pdf#page=69 (hash is client-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';

import {
  loadWaldenPdfFromLocalOrBlob,
  WALDEN_PDF_FILENAME,
} from '@/lib/cce-pdf-from-storage';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    const base = resolve(process.cwd());
    const loaded = await loadWaldenPdfFromLocalOrBlob(base);
    if (!loaded) {
      return NextResponse.json(
        {
          error:
            'Walden PDF not found in local_data/ or blob storage. Upload with: npx tsx scripts/upload-cce-pdfs-to-blob.ts',
        },
        { status: 404 }
      );
    }
    return new NextResponse(new Uint8Array(loaded.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${WALDEN_PDF_FILENAME}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[walden-pdf] Error:', err);
    return NextResponse.json(
      { error: 'Failed to serve PDF' },
      { status: 500 }
    );
  }
});
