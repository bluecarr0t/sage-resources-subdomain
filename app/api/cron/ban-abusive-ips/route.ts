/**
 * Cron endpoint: promote repeat abusers to the Vercel Firewall IP block list.
 *
 * Flow:
 *   1. Rate limiter records offenses per IP (lib/public-map-api-abuse.ts).
 *   2. IPs past PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD land in a Redis candidate set.
 *   3. This cron drains candidates and submits each to the Vercel Firewall
 *      (ip.insert, action deny) via lib/vercel-firewall.ts.
 *
 * Safety:
 *   - Opt-in: does nothing unless PUBLIC_MAP_API_AUTO_BAN_ENABLED=true.
 *   - Idempotent: each IP is claimed atomically (Redis SET NX) so it is only
 *     submitted once, and removed from the candidate set after a successful ban.
 *
 * Schedule in vercel.json:
 *   { "path": "/api/cron/ban-abusive-ips", "schedule": "*\/10 * * * *" }
 *
 * Auth: Authorization: Bearer ${CRON_SECRET} (see lib/vercel-cron-auth.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import {
  claimIpForBan,
  clearAbuseCandidate,
  getAbuseCandidateIps,
  isAutoBanEnabled,
} from '@/lib/public-map-api-abuse';
import {
  blockIpOnVercelFirewall,
  isVercelFirewallConfigured,
} from '@/lib/vercel-firewall';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Cap submissions per run so a flood of candidates can't exhaust the API budget. */
const MAX_BANS_PER_RUN = 25;

async function run(request: NextRequest): Promise<NextResponse> {
  if (!authorizeVercelCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  if (!isAutoBanEnabled()) {
    return NextResponse.json({
      success: true,
      enabled: false,
      message: 'Auto-ban disabled (set PUBLIC_MAP_API_AUTO_BAN_ENABLED=true).',
    });
  }

  if (!isVercelFirewallConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Vercel Firewall not configured (set VERCEL_FIREWALL_API_TOKEN/VERCEL_TOKEN and VERCEL_PROJECT_ID).',
      },
      { status: 500 }
    );
  }

  const candidates = await getAbuseCandidateIps();
  const banned: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ ip: string; error: string }> = [];

  for (const ip of candidates.slice(0, MAX_BANS_PER_RUN)) {
    // Atomic claim so concurrent runs don't double-submit.
    const claimed = await claimIpForBan(ip);
    if (!claimed) {
      await clearAbuseCandidate(ip);
      skipped.push(ip);
      continue;
    }

    const result = await blockIpOnVercelFirewall(
      ip,
      `Auto-banned: repeated public map API abuse (${new Date().toISOString()})`
    );

    if (result.ok) {
      await clearAbuseCandidate(ip);
      banned.push(ip);
    } else if (result.skipped) {
      // Invalid IP / misconfig — drop from candidates so it doesn't loop forever.
      await clearAbuseCandidate(ip);
      skipped.push(ip);
    } else {
      failed.push({ ip, error: `${result.status}: ${result.error}` });
    }
  }

  if (failed.length > 0) {
    console.error('[cron/ban-abusive-ips] some bans failed:', failed);
  }

  return NextResponse.json({
    success: failed.length === 0,
    enabled: true,
    candidates: candidates.length,
    banned,
    skipped,
    failed,
    elapsed_ms: Date.now() - started,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return run(request);
}
