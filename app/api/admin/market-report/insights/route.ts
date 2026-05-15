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

/** Coerce JSON-ish values for cache keys and empty-cohort checks (avoid strict Zod on the full summary). */
function finiteNonNegInt(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.trunc(n);
  }
  return fallback;
}

const BodySchema = z.object({
  segment: z.enum(['glamping', 'rv_resort']),
  scope: z.enum(['local', 'national']).default('local'),
  addressLine: z.string().max(500).trim().default(''),
  radiusMiles: z.coerce.number().min(0).max(250).default(0),
  adrMin: z.coerce.number().min(0).max(50_000).nullish(),
  adrMax: z.coerce.number().min(0).max(50_000).nullish(),
  minSiteUnitCount: z.coerce.number().int().min(0).max(100_000).optional(),
  summary: z.custom<Record<string, unknown>>(
    (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
    { message: 'summary must be a non-array object' }
  ),
  noCache: z.boolean().optional().default(false),
});

function buildCacheKey(parsed: z.infer<typeof BodySchema>): string {
  const s = parsed.summary;
  const topRaw = s.topUnitTypesWithAdr;
  const topArr = Array.isArray(topRaw) ? topRaw : [];
  const topSig = topArr
    .map((u) => {
      if (!u || typeof u !== 'object' || Array.isArray(u)) return '';
      const o = u as Record<string, unknown>;
      const unit = o.unit_type != null ? String(o.unit_type) : '';
      const count = finiteNonNegInt(o.count, 0);
      return `${unit}:${count}`;
    })
    .filter(Boolean)
    .join('|');
  const scoreObj = s.opportunityScore;
  let score: number | 'na' = 'na';
  if (scoreObj && typeof scoreObj === 'object' && !Array.isArray(scoreObj)) {
    const raw = (scoreObj as Record<string, unknown>).score;
    if (typeof raw === 'number' && Number.isFinite(raw)) score = raw;
  }
  const inv = finiteNonNegInt(s.inventoryRowCount, finiteNonNegInt(s.propertyCount, 0));
  const distinct = finiteNonNegInt(s.distinctListingCount, inv);
  return [
    'market-insights:v2',
    parsed.segment,
    parsed.scope,
    parsed.scope === 'local' ? parsed.addressLine.toLowerCase() : 'us',
    parsed.scope === 'local' ? parsed.radiusMiles : 0,
    parsed.adrMin ?? 'min-any',
    parsed.adrMax ?? 'max-any',
    `minSu:${parsed.minSiteUnitCount ?? 'default'}`,
    `inv:${inv}`,
    `dist:${distinct}`,
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

  const summaryPayload = body.summary;
  const inventoryRows = finiteNonNegInt(
    summaryPayload.inventoryRowCount,
    finiteNonNegInt(summaryPayload.propertyCount, 0)
  );
  if (inventoryRows === 0) {
    // Nothing to summarize — return an empty success rather than calling the LLM.
    return NextResponse.json(
      { success: true, bullets: [], cached: false, model: null },
      { headers: { 'X-Market-Report-Insights-Ms': '0' } }
    );
  }

  const wallStartedAt = Date.now();
  const timingHeader = () => ({
    'X-Market-Report-Insights-Ms': String(Date.now() - wallStartedAt),
  });

  const cacheKey = buildCacheKey(body);
  try {
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
          summary: summaryPayload as MarketSummarySection,
        });
        return result;
      },
      { force: body.noCache }
    );

    if (!lookup.value) {
      return NextResponse.json(
        {
          success: true,
          bullets: [],
          cached: lookup.cached,
          model: null,
          generatedAt: lookup.cachedAt,
        },
        { headers: timingHeader() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        bullets: lookup.value.bullets,
        cached: lookup.cached,
        model: lookup.value.model,
        tokensUsed: lookup.value.tokensUsed,
        generatedAt: lookup.cachedAt,
      },
      { headers: timingHeader() }
    );
  } catch (err) {
    console.error('[market-report:insights]', err);
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Insight generation failed.',
      },
      { status: 500, headers: timingHeader() }
    );
  }
});
