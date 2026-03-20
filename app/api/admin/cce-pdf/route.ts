/**
 * API Route: Serve CCE PDF for admin (walden/catalog/upload) or redirect to month route
 * GET /api/admin/cce-pdf
 *
 * Query:
 *   pdf=walden|catalog - serve Walden catalog
 *   file=<name> - serve from CCE_uploads
 *   (none) - redirect to /api/admin/cce-pdf/March_2026
 *
 * For CCE reports by month, use GET /api/admin/cce-pdf/[month] (e.g. March_2026)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

const WALDEN_PDF = 'Walden_2025_Unique_Accommodation_Buyers_Guide_1.1 (2).pdf';
const DEFAULT_MONTH = 'March_2026';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const base = resolve(process.cwd());
    const fileParam = request.nextUrl.searchParams.get('file');
    const pdfParam = request.nextUrl.searchParams.get('pdf');

    if (pdfParam === 'walden' || pdfParam === 'catalog') {
      const pdfPath = resolve(base, 'local_data', WALDEN_PDF);
      if (!existsSync(pdfPath)) {
        return NextResponse.json(
          { error: 'Walden PDF not found in local_data/' },
          { status: 404 }
        );
      }
      const buffer = await readFile(pdfPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${WALDEN_PDF}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
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
      return new NextResponse(buffer, {
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
