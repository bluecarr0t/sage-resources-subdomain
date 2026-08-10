/**
 * POST /api/admin/reports/parse-engagement-letter
 * Multipart form field `file` — Sage Feasibility Study Engagement Letter PDF.
 * Returns structured fields to prefill Report Builder.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import {
  MAX_PDF_BYTES,
  parseEngagementLetterPdf,
} from '@/lib/ai-report-builder/parse-engagement-letter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.ok) return auth.response;

    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing file (multipart field "file")' },
        { status: 400 }
      );
    }

    const name = file.name || 'engagement.pdf';
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF engagement letters are supported' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { success: false, error: 'PDF exceeds 20 MB limit' },
        { status: 400 }
      );
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);
    const { extract } = await parseEngagementLetterPdf(buffer);

    return NextResponse.json({
      success: true,
      extract,
      source_filename: name,
    });
  } catch (err) {
    console.error('[parse-engagement-letter]', err);
    const message = err instanceof Error ? err.message : 'Failed to parse engagement letter';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
