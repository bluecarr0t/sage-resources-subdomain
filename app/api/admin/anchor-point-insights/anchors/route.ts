/**
 * GET /api/admin/anchor-point-insights/anchors
 * Lightweight anchor name search for Proximity Insights typeahead.
 *
 * Query: anchor_type=ski|national-parks|wineries, q=search text, limit=50
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import {
  parseAnchorSearchTypeParam,
  searchAnchorsByName,
} from '@/lib/anchor-point-insights/search-anchors';

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const rlKey = `anchor-insights-search:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const anchorType = parseAnchorSearchTypeParam(searchParams.get('anchor_type'));
    const q = searchParams.get('q')?.trim() ?? '';
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isNaN(limitParam) ? 50 : limitParam;

    if (!q) {
      return NextResponse.json({ success: true, anchors: [] });
    }

    const supabase = createServerClient();
    const anchors = await searchAnchorsByName(supabase, anchorType, q, limit);

    return NextResponse.json({ success: true, anchors });
  } catch (err) {
    console.error('[anchor-point-insights/anchors] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to search anchors' },
      { status: 500 }
    );
  }
});
