/**
 * API Route: Serve CCE PDF uploads or redirect to default month edition
 * GET /api/admin/cce-pdf
 *
 * Query:
 *   pdf=walden|catalog - redirect to /api/admin/walden-pdf (Walden is not a CCE file)
 *   file=<name> - serve from CCE_uploads
 *   (none) - redirect to /api/admin/cce-pdf/March_2026
 *
 * CCE reports by month: GET /api/admin/cce-pdf/[month]
 * Walden Buyers Guide: GET /api/admin/walden-pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_MONTH = 'March_2026';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const base = resolve(process.cwd());
    const fileParam = request.nextUrl.searchParams.get('file');
    const pdfParam = request.nextUrl.searchParams.get('pdf');

    if (pdfParam === 'walden' || pdfParam === 'catalog') {
      return NextResponse.redirect(
        new URL('/api/admin/walden-pdf', request.url),
        307
      );
    }

    if (fileParam) {
      const uploadsDir = resolve(base, 'local_data', 'CCE_uploads');
      const sanitized = fileParam.replace(/[^a-zA-Z0-9._-]/g, '_');
      const pdfPath = resolve(uploadsDir, sanitized);
      if (!existsSync(pdfPath)) {
        return NextResponse.json(
          { error: 'Uploaded PDF not found' },
          { status: 404 }
        );
      }
      const buffer = await readFile(pdfPath);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${sanitized}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Default: redirect to month route (month is always in the filename)
    return NextResponse.redirect(
      new URL(`/api/admin/cce-pdf/${DEFAULT_MONTH}`, request.url),
      302
    );
  } catch (err) {
    console.error('[cce-pdf] Error:', err);
    return NextResponse.json(
      { error: 'Failed to serve PDF' },
      { status: 500 }
    );
  }
});
