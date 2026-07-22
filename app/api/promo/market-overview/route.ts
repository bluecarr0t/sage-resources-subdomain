/**
 * GET  /api/promo/market-overview — whether this visitor IP should see the promo
 * POST /api/promo/market-overview — mark this IP as having seen the promo
 *
 * Uses Upstash when configured; otherwise returns show:true on GET and no-ops on
 * POST so the client can rely on localStorage alone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/upstash';
import {
  hashVisitorIp,
  marketOverviewPromoRedisKey,
} from '@/lib/promo-market-overview';

export const dynamic = 'force-dynamic';

/** Keep seen flags for ~1 year (campaign lifetime). */
const SEEN_TTL_SECONDS = 60 * 60 * 24 * 365;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function GET(request: NextRequest) {
  // Local dev: always allow the promo so it can be QA'd on every refresh.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ show: true, tracked: false, force: true });
  }

  const ip = getClientIp(request);
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ show: true, tracked: false });
  }

  try {
    const ipHash = hashVisitorIp(ip);
    const seen = await redis.get(marketOverviewPromoRedisKey(ipHash));
    return NextResponse.json({ show: !seen, tracked: true });
  } catch (err) {
    console.error('[promo/market-overview] GET failed:', err);
    return NextResponse.json({ show: true, tracked: false });
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ ok: true, tracked: false, force: true });
  }

  const ip = getClientIp(request);
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  try {
    const ipHash = hashVisitorIp(ip);
    await redis.set(marketOverviewPromoRedisKey(ipHash), '1', { ex: SEEN_TTL_SECONDS });
    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    console.error('[promo/market-overview] POST failed:', err);
    return NextResponse.json({ ok: true, tracked: false });
  }
}
