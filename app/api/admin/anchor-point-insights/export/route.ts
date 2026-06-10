/**
 * API Route: Export Anchor Point Insights (raw property data for Excel)
 * GET /api/admin/anchor-point-insights/export
 *
 * Returns paginated raw property rows with proximity for full dataset export.
 * Same params as main insights: anchor_type, state, anchor_id, anchor_slug, distance_bands.
 * Pagination: page (default 1), limit (default 5000, max 10000).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { parseAnchorPointAnchorType } from '@/lib/anchor-point-insights/anchor-type';
import { exportAnchorPointInsightsRaw } from '@/lib/anchor-point-insights/export';
import { parseAnchorInsightsRequestFilters } from '@/lib/anchor-point-insights/parse-request-params';

const RATE_LIMIT = 5;
const RATE_LIMIT_PREVIEW = 30; // Higher limit for demo/preview
const RATE_WINDOW_MS = 60 * 1000;

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const limit = isPreview ? RATE_LIMIT_PREVIEW : RATE_LIMIT;
    const rlKey = `anchor-insights-export:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, limit, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many export requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedFilters = await parseAnchorInsightsRequestFilters(searchParams);
    if (!parsedFilters.ok) {
      return NextResponse.json({ success: false, message: parsedFilters.message }, { status: 400 });
    }
    const { stateFilter, distanceBandThresholds, areaFilter } = parsedFilters.filters;
    const anchorType = parseAnchorPointAnchorType(searchParams.get('anchor_type') || 'ski');
    const anchorIdParam = searchParams.get('anchor_id');
    const anchorSlugParam = searchParams.get('anchor_slug')?.trim() || null;
    const anchorId = anchorIdParam ? parseInt(anchorIdParam, 10) : null;
    const anchorSlug = anchorSlugParam || null;
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    const propertyTypeFilter = (typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping') as 'glamping' | 'rv' | 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = parseInt(searchParams.get('limit') || '5000', 10);
    const pageLimit = Math.min(Math.max(1, limitParam), 10000);

    const supabaseAdmin = createServerClient();
    const result = await exportAnchorPointInsightsRaw(supabaseAdmin, {
      stateFilter,
      anchorType,
      anchorId,
      anchorSlug,
      propertyTypeFilter,
      distanceBandThresholds: distanceBandThresholds ?? undefined,
      areaFilter: areaFilter ?? undefined,
      page,
      limit: pageLimit,
    });

    return NextResponse.json({
      success: true,
      rows: result.rows,
      total_count: result.total_count,
      has_more: result.has_more,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    console.error('[anchor-point-insights/export] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to export anchor point insights' },
      { status: 500 }
    );
  }
});
