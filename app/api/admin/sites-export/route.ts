import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { sitesExportFromJsonBody } from '@/lib/sites-export/run-export';

export const dynamic = 'force-dynamic';

/** Large XLSX builds exceed the default ~10s platform limit without this. */
export const maxDuration = 300;

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    const userId = auth.session.user.id;
    const rlKey = `sites-export:${userId}:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many export requests. Try again shortly.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const supabase = createServerClient();
    const result = await sitesExportFromJsonBody(supabase, body, 'export', userId);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    if (!('body' in result)) {
      return NextResponse.json({ success: false, message: 'Unexpected response.' }, { status: 500 });
    }

    const { body: outBody, contentType, filename } = result;

    if (outBody instanceof ReadableStream) {
      return new NextResponse(outBody, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(outBody), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[api/admin/sites-export]', err);
    return NextResponse.json(
      { success: false, message: 'Failed to export sites.' },
      { status: 500 }
    );
  }
});
