/**
 * Cron endpoint: refresh the `unified_comps` materialized view.
 *
 * Primary refresh is scheduled inside Postgres via pg_cron (see
 * `scripts/migrations/unified-comps-matview.sql`). This HTTP endpoint is a
 * Vercel Cron fallback for Supabase projects where pg_cron isn't enabled.
 *
 * Schedule in vercel.json:
 *   {
 *     "path": "/api/cron/refresh-unified-comps",
 *     "schedule": "0 9 * * *"
 *   }
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — matches the convention used by
 * `/api/cron/discover-glamping`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getRedis } from '@/lib/upstash';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FACETS_CACHE_KEY = 'admin:comps-unified:facets:v2';

async function refresh(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  try {
    const supabase = createServerClient();

    // Try CONCURRENTLY first (matview already populated) — falls back to a
    // plain refresh if the concurrent variant errors (e.g. first run after a
    // migration rebuild, or missing unique index).
    const { error: concurrentError } = await supabase.rpc('refresh_unified_comps_concurrently');

    if (concurrentError) {
      // RPC is optional. Fall back to a raw SQL refresh via supabase-js when
      // available; otherwise return a clear error so the operator knows to
      // either enable pg_cron or create the helper RPC below.
      console.warn(
        '[cron/refresh-unified-comps] concurrent refresh failed, attempting plain refresh:',
        concurrentError.message
      );
      const { error: plainError } = await supabase.rpc('refresh_unified_comps');
      if (plainError) {
        throw new Error(
          `Neither refresh_unified_comps_concurrently nor refresh_unified_comps is available: ${plainError.message}. ` +
            `Create them via SQL: CREATE FUNCTION refresh_unified_comps_concurrently() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps; $$;`
        );
      }
    }

    // Invalidate the facets cache so fresh values appear on the next page load.
    const redis = getRedis();
    if (redis) {
      await redis.del(FACETS_CACHE_KEY);
    }

    return NextResponse.json({
      success: true,
      elapsed_ms: Date.now() - started,
    });
  } catch (err) {
    console.error('[cron/refresh-unified-comps] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Refresh failed',
        elapsed_ms: Date.now() - started,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return refresh(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return refresh(request);
}
