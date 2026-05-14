/**
 * AI-generated bullet narrative for the Market Summary card.
 *
 * - Auth: admin-only (same as the parent /market-report endpoint).
 * - Rate-limited per-user (separate bucket from /market-report; LLM calls are pricier).
 * - Cached: identical (segment + scope + anchor + ADR filter + cohort fingerprint)
 *   inputs reuse the previous bullets for `MARKET_INSIGHTS` TTL — saves LLM spend
 *   when an analyst tweaks an unrelated UI control and re-runs the report.
 * - Force refresh: clients pass `noCache: true` (mirrors the parent route's flag).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cacheGetOrFetch } from '@/lib/market-report/cache';
import { generateMarketSummaryInsights } from '@/lib/market-report/insights-llm';
import { checkRateLimitAsync, getRateLimitKey } from '@/lib/rate-limit';
import { withAdminAuth } from '@/lib/require-admin-auth';
import type { MarketSummarySection } from '@/lib/market-report/types';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const INSIGHTS_TTL_MS = 30 * 60 * 1000;

// Permissive structural validation — the summary shape is generated server-side
// in the sibling route, so we trust it but defend against missing top-level fields.
const SummarySchema: z.ZodType<MarketSummarySection> = z.any();

const BodySchema = z.object({
  segment: z.enum(['glamping', 'rv_resort']),
  scope: z.enum(['local', 'national']).default('local'),
  addressLine: z.string().max(500).trim().default(''),
  radiusMiles: z.coerce.number().min(0).max(250).default(0),
  adrMin: z.coerce.number().min(0).max(50_000).nullish(),
  adrMax: z.coerce.number().min(0).max(50_000).nullish(),
  summary: SummarySchema,
  noCache: z.boolean().optional().default(false),
});

function buildCacheKey(parsed: z.infer<typeof BodySchema>): string {
  const s = parsed.summary;
  // Fingerprint: cohort size + top unit type signature + opportunity score id.
  // We deliberately do NOT key on every numeric field — small drift (e.g. one
  // additional property reported) shouldn't invalidate the cache. The TTL
  // does the rest.
  const topSig = (s.topUnitTypesWithAdr ?? [])
    .map((u) => `${u.unit_type}:${u.count}`)
    .join('|');
  const score = s.opportunityScore?.score ?? 'na';
  return [
    'market-insights:v1',
    parsed.segment,
    parsed.scope,
    parsed.scope === 'local' ? parsed.addressLine.toLowerCase() : 'us',
    parsed.scope === 'local' ? parsed.radiusMiles : 0,
    parsed.adrMin ?? 'min-any',
    parsed.adrMax ?? 'max-any',
    s.propertyCount,
    topSig,
    score,
  ].join('::');
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const userId = auth.session.user.id;
  const rlKey = `market-report-insights:${userId}:${getRateLimitKey(request)}`;
  const { allowed } = await checkRateLimitAsync(rlKey, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many insight requests. Try again in a minute.',
      },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, code: 'INVALID_JSON', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? 'Bad request' },
      { status: 400 }
    );
  }

  const body = parsed.data;

  if (!body.summary || body.summary.propertyCount === 0) {
    // Nothing to summarize — return an empty success rather than calling the LLM.
    return NextResponse.json({ success: true, bullets: [], cached: false, model: null });
  }

  const cacheKey = buildCacheKey(body);
  const lookup = await cacheGetOrFetch(
    cacheKey,
    INSIGHTS_TTL_MS,
    async () => {
      const result = await generateMarketSummaryInsights({
        segment: body.segment,
        scope: body.scope,
        addressLine: body.addressLine,
        radiusMiles: body.radiusMiles,
        adrMin: body.adrMin ?? null,
        adrMax: body.adrMax ?? null,
        summary: body.summary,
      });
      return result;
    },
    { force: body.noCache }
  );

  if (!lookup.value) {
    return NextResponse.json({
      success: true,
      bullets: [],
      cached: lookup.cached,
      model: null,
      generatedAt: lookup.cachedAt,
    });
  }

  return NextResponse.json({
    success: true,
    bullets: lookup.value.bullets,
    cached: lookup.cached,
    model: lookup.value.model,
    tokensUsed: lookup.value.tokensUsed,
    generatedAt: lookup.cachedAt,
  });
});
