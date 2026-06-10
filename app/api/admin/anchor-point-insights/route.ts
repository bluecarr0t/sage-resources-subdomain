/**
 * API Route: Anchor Point Insights (Ski Resort / National Park Proximity Analytics)
 * GET /api/admin/anchor-point-insights
 *
 * Compares glamping/camping data from hipcamp and all_sage_data
 * against ski_resorts or national-parks. Returns distance bands,
 * winter rates, trends, drive-time estimates, and county population/GDP enrichment.
 *
 * Query params: state (optional), anchor_type=ski|national-parks (default: ski),
 * anchor_id (ski drill-down), anchor_slug (national-parks drill-down),
 * distance_bands (optional, e.g. 10,25,50),
 * location (optional city or ZIP) + radius_mi (optional; defaults to max distance band or 30),
 * compare=true for dual-anchor mode with anchor_a_type, anchor_a_id, anchor_a_slug,
 * anchor_b_type, anchor_b_id, anchor_b_slug.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { getCache, setCache } from '@/lib/redis';
import { areaFilterCacheKeyPart } from '@/lib/anchor-point-insights/area-filter';
import { parseAnchorPointAnchorType } from '@/lib/anchor-point-insights/anchor-type';
import { computeAnchorPointInsightsCached } from '@/lib/anchor-point-insights/cached-compute';
import { CACHE_TTL_SECONDS } from '@/lib/anchor-point-insights/constants';
import { parseAnchorInsightsRequestFilters } from '@/lib/anchor-point-insights/parse-request-params';

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
    const parsedFilters = await parseAnchorInsightsRequestFilters(searchParams);
    if (!parsedFilters.ok) {
      return NextResponse.json({ success: false, message: parsedFilters.message }, { status: 400 });
    }
    const { stateFilter, distanceBandThresholds, areaFilter } = parsedFilters.filters;
    const compare = searchParams.get('compare') === 'true';

    const bandsKey = distanceBandThresholds ? distanceBandThresholds.join(',') : 'default';
    const areaKey = areaFilterCacheKeyPart(areaFilter);
    const typeParam = (searchParams.get('type') || 'glamping').toLowerCase();
    const propertyTypeFilter = (typeParam === 'rv' || typeParam === 'all' ? typeParam : 'glamping') as 'glamping' | 'rv' | 'all';
    const typeKey = propertyTypeFilter;

    const supabaseAdmin = createServerClient();

    if (compare) {
      const anchorAType = parseAnchorPointAnchorType(searchParams.get('anchor_a_type') || 'ski');
      const anchorAIdParam = searchParams.get('anchor_a_id');
      const anchorASlugParam = searchParams.get('anchor_a_slug')?.trim() || null;
      const anchorAId = anchorAIdParam ? parseInt(anchorAIdParam, 10) : null;
      const anchorASlug = anchorASlugParam || null;

      const anchorBType = parseAnchorPointAnchorType(
        searchParams.get('anchor_b_type') || 'national-parks'
      );
      const anchorBIdParam = searchParams.get('anchor_b_id');
      const anchorBSlugParam = searchParams.get('anchor_b_slug')?.trim() || null;
      const anchorBId = anchorBIdParam ? parseInt(anchorBIdParam, 10) : null;
      const anchorBSlug = anchorBSlugParam || null;

      const keyA = `anchor-insights:${anchorAType}:${stateFilter ?? 'all'}:${anchorAId ?? anchorASlug ?? 'all'}:${bandsKey}:${areaKey}:${typeKey}`;
      const keyB = `anchor-insights:${anchorBType}:${stateFilter ?? 'all'}:${anchorBId ?? anchorBSlug ?? 'all'}:${bandsKey}:${areaKey}:${typeKey}`;
      const cacheKeyCompare = `compare:${keyA}:${keyB}`;

      const cached = await getCache<{ success: true; insights_a: object; insights_b: object }>(cacheKeyCompare);
      if (cached) {
        return NextResponse.json(cached);
      }

      const [resultA, resultB] = await Promise.all([
        computeAnchorPointInsightsCached(supabaseAdmin, {
          stateFilter,
          anchorType: anchorAType,
          anchorId: anchorAId,
          anchorSlug: anchorASlug,
          propertyTypeFilter,
          distanceBandThresholds: distanceBandThresholds ?? undefined,
          areaFilter: areaFilter ?? undefined,
        }),
        computeAnchorPointInsightsCached(supabaseAdmin, {
          stateFilter,
          anchorType: anchorBType,
          anchorId: anchorBId,
          anchorSlug: anchorBSlug,
          propertyTypeFilter,
          distanceBandThresholds: distanceBandThresholds ?? undefined,
          areaFilter: areaFilter ?? undefined,
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

    const anchorType = parseAnchorPointAnchorType(searchParams.get('anchor_type') || 'ski');
    const anchorIdParam = searchParams.get('anchor_id');
    const anchorSlugParam = searchParams.get('anchor_slug')?.trim() || null;
    const anchorId = anchorIdParam ? parseInt(anchorIdParam, 10) : null;
    const anchorSlug = anchorSlugParam || null;

    const cacheKey = `anchor-insights:${anchorType}:${stateFilter ?? 'all'}:${anchorId ?? anchorSlug ?? 'all'}:${bandsKey}:${areaKey}:${typeKey}`;
    const cached = await getCache<{ success: true; insights: object }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await computeAnchorPointInsightsCached(supabaseAdmin, {
      stateFilter,
      anchorType,
      anchorId,
      anchorSlug,
      propertyTypeFilter,
      distanceBandThresholds: distanceBandThresholds ?? undefined,
      areaFilter: areaFilter ?? undefined,
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
