/**
 * API Route: Serve CCE PDF by month (e.g. March_2026)
 * GET /api/admin/cce-pdf/[month]
 *
 * The month segment matches the filename: CCE_March_2026.pdf -> month=March_2026
 * Query: page (optional) - page number for #page=N in Content-Disposition hint
 *
 * Link format: /api/admin/cce-pdf/March_2026#page=42 (hash is client-side)
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';

import { loadCcePdfFromLocalOrBlob } from '@/lib/cce-pdf-from-storage';
import { withAdminAuth } from '@/lib/require-admin-auth';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(
  async (
    request: NextRequest,
    _auth: { supabase: unknown; session: unknown },
    context?: { params?: Promise<{ month: string }> }
  ) => {
    try {
      const params = await (context?.params ?? Promise.resolve({ month: '' }));
      let month = params.month;
      if (!month) {
        const segments = request.nextUrl.pathname.split('/').filter(Boolean);
        month = segments[segments.length - 1] ?? '';
      }
      const base = resolve(process.cwd());

      // Sanitize month: allow alphanumeric, underscores, hyphens (e.g. March_2026)
      const sanitized = month.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!sanitized) {
        return NextResponse.json(
          { error: 'Invalid month parameter' },
          { status: 400 }
        );
      }

      const filename = `CCE_${sanitized}.pdf`;
      const loaded = await loadCcePdfFromLocalOrBlob(filename, base);

      if (!loaded) {
        return NextResponse.json(
          {
            error: `CCE PDF not found for ${filename} in local_data/ or blob storage. Upload with: npx tsx scripts/upload-cce-pdfs-to-blob.ts`,
          },
          { status: 404 }
        );
      }

      return new NextResponse(new Uint8Array(loaded.buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (err) {
      console.error('[cce-pdf] Error:', err);
      return NextResponse.json(
        { error: 'Failed to serve PDF' },
        { status: 500 }
      );
    }
  }
);
