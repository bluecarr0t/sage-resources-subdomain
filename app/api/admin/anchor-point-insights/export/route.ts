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

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { exportAnchorPointInsightsRaw } from '@/lib/anchor-point-insights/export';
import { parseDistanceBandsParam } from '@/lib/proximity-utils';

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const rlKey = `anchor-insights-export:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many export requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { searchParams } = new URL(request.url);
    const stateFilter = searchParams.get('state')?.trim().toUpperCase() || null;
    const anchorType = (searchParams.get('anchor_type') || 'ski').toLowerCase();
    const anchorIdParam = searchParams.get('anchor_id');
    const anchorSlugParam = searchParams.get('anchor_slug')?.trim() || null;
    const anchorId = anchorIdParam ? parseInt(anchorIdParam, 10) : null;
    const anchorSlug = anchorSlugParam || null;
    const distanceBandsParam = searchParams.get('distance_bands')?.trim() || null;
    const distanceBandThresholds = parseDistanceBandsParam(distanceBandsParam);
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    const propertyTypeFilter = (typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping') as 'glamping' | 'rv' | 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limitParam = parseInt(searchParams.get('limit') || '5000', 10);
    const limit = Math.min(Math.max(1, limitParam), 10000);

    const supabaseAdmin = createServerClient();
    const result = await exportAnchorPointInsightsRaw(supabaseAdmin, {
      stateFilter,
      anchorType: anchorType === 'national-parks' ? 'national-parks' : 'ski',
      anchorId,
      anchorSlug,
      propertyTypeFilter,
      distanceBandThresholds: distanceBandThresholds ?? undefined,
      page,
      limit,
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
}
