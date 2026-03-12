/**
 * API Route: Anchor Point Insights (Ski Resort / National Park Proximity Analytics)
 * GET /api/admin/anchor-point-insights
 *
 * Compares glamping/camping data from hipcamp and all_glamping_properties
 * against ski_resorts or national-parks. Returns distance bands,
 * winter rates, trends, drive-time estimates, and county population/GDP enrichment.
 *
 * Query params: state (optional), anchor_type=ski|national-parks (default: ski),
 * anchor_id (ski drill-down), anchor_slug (national-parks drill-down),
 * distance_bands (optional, e.g. 10,25,50),
 * compare=true for dual-anchor mode with anchor_a_type, anchor_a_id, anchor_a_slug,
 * anchor_b_type, anchor_b_id, anchor_b_slug.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { getCache, setCache } from '@/lib/redis';
import { computeAnchorPointInsights } from '@/lib/anchor-point-insights';
import { CACHE_TTL_SECONDS } from '@/lib/anchor-point-insights/constants';
import { parseDistanceBandsParam } from '@/lib/proximity-utils';

const RATE_LIMIT = 30;
const RATE_LIMIT_PREVIEW = 120; // Higher limit for demo/preview (shared IP testing)
const RATE_WINDOW_MS = 60 * 1000;

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const isPreview = process.env.VERCEL_ENV === 'preview';
    const limit = isPreview ? RATE_LIMIT_PREVIEW : RATE_LIMIT;
    const rlKey = `anchor-insights:${getRateLimitKey(request)}`;
    const { allowed } = await checkRateLimitAsync(rlKey, limit, RATE_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const stateFilter = searchParams.get('state')?.trim().toUpperCase() || null;
    const compare = searchParams.get('compare') === 'true';

    const distanceBandsParam = searchParams.get('distance_bands')?.trim() || null;
    const distanceBandThresholds = parseDistanceBandsParam(distanceBandsParam);
    const bandsKey = distanceBandThresholds ? distanceBandThresholds.join(',') : 'default';
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    const propertyTypeFilter = (typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping') as 'glamping' | 'rv' | 'all';
    const typeKey = propertyTypeFilter;

    const supabaseAdmin = createServerClient();

    if (compare) {
      const anchorAType = (searchParams.get('anchor_a_type') || 'ski').toLowerCase();
      const anchorAIdParam = searchParams.get('anchor_a_id');
      const anchorASlugParam = searchParams.get('anchor_a_slug')?.trim() || null;
      const anchorAId = anchorAIdParam ? parseInt(anchorAIdParam, 10) : null;
      const anchorASlug = anchorASlugParam || null;

      const anchorBType = (searchParams.get('anchor_b_type') || 'national-parks').toLowerCase();
      const anchorBIdParam = searchParams.get('anchor_b_id');
      const anchorBSlugParam = searchParams.get('anchor_b_slug')?.trim() || null;
      const anchorBId = anchorBIdParam ? parseInt(anchorBIdParam, 10) : null;
      const anchorBSlug = anchorBSlugParam || null;

      const keyA = `anchor-insights:${anchorAType}:${stateFilter ?? 'all'}:${anchorAId ?? anchorASlug ?? 'all'}:${bandsKey}:${typeKey}`;
      const keyB = `anchor-insights:${anchorBType}:${stateFilter ?? 'all'}:${anchorBId ?? anchorBSlug ?? 'all'}:${bandsKey}:${typeKey}`;
      const cacheKeyCompare = `compare:${keyA}:${keyB}`;

      const cached = await getCache<{ success: true; insights_a: object; insights_b: object }>(cacheKeyCompare);
      if (cached) {
        return NextResponse.json(cached);
      }

      const [resultA, resultB] = await Promise.all([
        computeAnchorPointInsights(supabaseAdmin, {
          stateFilter,
          anchorType: anchorAType === 'national-parks' ? 'national-parks' : 'ski',
          anchorId: anchorAId,
          anchorSlug: anchorASlug,
          propertyTypeFilter,
          distanceBandThresholds: distanceBandThresholds ?? undefined,
        }),
        computeAnchorPointInsights(supabaseAdmin, {
          stateFilter,
          anchorType: anchorBType === 'national-parks' ? 'national-parks' : 'ski',
          anchorId: anchorBId,
          anchorSlug: anchorBSlug,
          propertyTypeFilter,
          distanceBandThresholds: distanceBandThresholds ?? undefined,
        }),
      ]);

      const compareResult = {
        success: true as const,
        insights_a: resultA.insights,
        insights_b: resultB.insights,
      };
      await setCache(cacheKeyCompare, compareResult, CACHE_TTL_SECONDS);
      return NextResponse.json(compareResult);
    }

    const anchorType = (searchParams.get('anchor_type') || 'ski').toLowerCase();
    const anchorIdParam = searchParams.get('anchor_id');
    const anchorSlugParam = searchParams.get('anchor_slug')?.trim() || null;
    const anchorId = anchorIdParam ? parseInt(anchorIdParam, 10) : null;
    const anchorSlug = anchorSlugParam || null;

    const cacheKey = `anchor-insights:${anchorType}:${stateFilter ?? 'all'}:${anchorId ?? anchorSlug ?? 'all'}:${bandsKey}:${typeKey}`;
    const cached = await getCache<{ success: true; insights: object }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await computeAnchorPointInsights(supabaseAdmin, {
      stateFilter,
      anchorType: anchorType === 'national-parks' ? 'national-parks' : 'ski',
      anchorId,
      anchorSlug,
      propertyTypeFilter,
      distanceBandThresholds: distanceBandThresholds ?? undefined,
    });

    await setCache(cacheKey, result, CACHE_TTL_SECONDS);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[anchor-point-insights] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch anchor point insights' },
      { status: 500 }
    );
  }
});
