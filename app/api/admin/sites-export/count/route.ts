import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { sitesExportFromJsonBody } from '@/lib/sites-export/run-export';

export const dynamic = 'force-dynamic';

/** Full-table counts can run longer than the default serverless cap. */
export const maxDuration = 300;

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    const userId = auth.session.user.id;
    const rlKey = `sites-export-count:${userId}:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Try again shortly.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const supabase = createServerClient();
    const result = await sitesExportFromJsonBody(supabase, body, 'count', userId);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    if (!('count' in result) || !('cacheKey' in result)) {
      return NextResponse.json({ success: false, message: 'Unexpected response.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      cacheKey: result.cacheKey,
    });
  } catch (err) {
    console.error('[api/admin/sites-export/count]', err);
    return NextResponse.json(
      { success: false, message: 'Failed to count sites for export.' },
      { status: 500 }
    );
  }
});
