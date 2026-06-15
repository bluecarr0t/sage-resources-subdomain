/**
 * POST /api/gated-access/request
 *
 * Public endpoint that captures a name + email lead and sends a Supabase
 * magic link so the visitor can unlock a gated content page (currently
 * `/glamping-market-overview`).
 *
 * Security notes:
 * - Responses are always a generic `{ ok: true }` to avoid email enumeration.
 * - Rate limited per-email and per-IP via Upstash (fails open when Upstash is
 *   not configured locally).
 * - Uses the cookie-backed SSR client so the PKCE code_verifier is stored for
 *   the `/auth/callback` exchange.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';
import { limit } from '@/lib/upstash';
import { logGatedContentEvent } from '@/lib/gated-content-events';
import { lookupGatedLead } from '@/lib/gated-access-lead';
import {
  GATED_ACCESS_EXISTING_LEAD_CODE,
  GATED_ACCESS_EXISTING_LEAD_MESSAGE,
  GATED_ACCESS_NAME_MIN_LENGTH,
  GATED_ACCESS_REQUIRE_LEAD_FORM_CODE,
  GATED_ACCESS_REQUIRE_LEAD_FORM_MESSAGE,
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  buildMagicLinkRedirectUrl,
  formatGatedAccessOtpErrorMessage,
  parseSupabaseOtpCooldownSeconds,
  isEmailOnlyGatedRequest,
  isGatedPageSlug,
  isValidEmail,
  normalizeAuthSiteOrigin,
} from '@/lib/gated-access';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getRequestOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return normalizeAuthSiteOrigin(envOrigin);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) return normalizeAuthSiteOrigin(`${forwardedProto}://${forwardedHost}`);
  return normalizeAuthSiteOrigin(new URL(request.url).origin);
}

async function lookupLeadName(email: string, pageSlug: string): Promise<string | null> {
  const lead = await lookupGatedLead(email, pageSlug);
  const name = lead.name?.trim() ?? '';
  return name.length >= GATED_ACCESS_NAME_MIN_LENGTH ? name : null;
}

export async function POST(request: NextRequest) {
  let body: { name?: unknown; email?: unknown; pageSlug?: unknown; emailOnly?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const emailOnly = isEmailOnlyGatedRequest(body.emailOnly);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const pageSlug = isGatedPageSlug(body.pageSlug)
    ? body.pageSlug
    : GATED_PAGE_GLAMPING_MARKET_OVERVIEW;

  if (!emailOnly && name.length < GATED_ACCESS_NAME_MIN_LENGTH) {
    return NextResponse.json({ ok: false, error: 'Please enter your name.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  if (emailOnly) {
    const lead = await lookupGatedLead(email, pageSlug);
    if (!lead.exists) {
      return NextResponse.json(
        {
          ok: false,
          code: GATED_ACCESS_REQUIRE_LEAD_FORM_CODE,
          error: GATED_ACCESS_REQUIRE_LEAD_FORM_MESSAGE,
        },
        { status: 400 }
      );
    }
  } else {
    const lead = await lookupGatedLead(email, pageSlug);
    if (lead.exists) {
      return NextResponse.json(
        {
          ok: false,
          code: GATED_ACCESS_EXISTING_LEAD_CODE,
          error: GATED_ACCESS_EXISTING_LEAD_MESSAGE,
          name: lead.name,
        },
        { status: 400 }
      );
    }
  }

  // Rate limits: 3 / email / hour and 10 / IP / hour. Fail open if Upstash is
  // unavailable. Return generic 429 without leaking which limit was hit.
  const ip = getClientIp(request);
  const [emailLimit, ipLimit] = await Promise.all([
    limit('gated_access_email', email, 3, '1 h'),
    limit('gated_access_ip', ip, 10, '1 h'),
  ]);
  if (!emailLimit.success || !ipLimit.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  void logGatedContentEvent({
    eventType: 'form_submit',
    email,
    pageSlug,
    metadata: { email_only: emailOnly },
  });

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteHandlerClient(request, response);

  try {
    // Clear any stale session so Supabase always sends a fresh magic link
    // (returning-user sign-in can noop when a partial session is present).
    await supabase.auth.signOut();

    const leadName = name || (emailOnly ? await lookupLeadName(email, pageSlug) : null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Always allow account creation so we never need a second OTP call in the
        // same request (Supabase enforces a short cooldown between sends).
        shouldCreateUser: true,
        data: {
          ...(leadName ? { full_name: leadName } : {}),
          gated_page: pageSlug,
        },
        emailRedirectTo: buildMagicLinkRedirectUrl(getRequestOrigin(request), pageSlug),
      },
    });

    if (error) {
      console.error('[gated-access/request] signInWithOtp failed:', error.message);
      const otpErrorMessage = formatGatedAccessOtpErrorMessage(error.message);
      if (otpErrorMessage) {
        return NextResponse.json(
          {
            ok: false,
            error: otpErrorMessage,
            code: parseSupabaseOtpCooldownSeconds(error.message) !== null
              ? 'email_cooldown'
              : 'email_rate_limited',
          },
          { status: 429 }
        );
      }
    }
  } catch (err) {
    console.error('[gated-access/request] Unexpected error:', err);
  }

  return response;
}
