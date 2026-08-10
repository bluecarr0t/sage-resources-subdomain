/**
 * POST /api/gated-access/business-type
 *
 * Authenticated endpoint for unlocked Market Overview leads who signed up
 * before “I am a…” existed (or returned via email-only without a role).
 * Sets `business_type` once when currently null; syncs Zapier + Slack.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findVerifiedGatedLead } from '@/lib/check-gated-page-access';
import {
  GATED_PAGE_GLAMPING_MARKET_OVERVIEW,
  isGatedPageSlug,
} from '@/lib/gated-access';
import {
  gatedAccessBusinessTypeLabel,
  parseGatedAccessBusinessType,
} from '@/lib/gated-access-business-type';
import { logGatedContentEvent } from '@/lib/gated-content-events';
import { joinFullName } from '@/lib/person-name';
import { notifyMarketOverviewBusinessTypeBackfillSlack } from '@/lib/slack/website-slack-client';
import { createServerClient } from '@/lib/supabase';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';
import { notifyZapierGatedLead } from '@/lib/zapier-webhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteHandlerClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id && !user?.email) {
    return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
  }

  let body: { businessType?: unknown; pageSlug?: unknown };
  try {
    body = (await request.json()) as { businessType?: unknown; pageSlug?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const pageSlug =
    typeof body.pageSlug === 'string' && isGatedPageSlug(body.pageSlug)
      ? body.pageSlug
      : GATED_PAGE_GLAMPING_MARKET_OVERVIEW;

  if (pageSlug !== GATED_PAGE_GLAMPING_MARKET_OVERVIEW) {
    return NextResponse.json(
      { ok: false, error: 'Business type backfill is only available for Market Overview.' },
      { status: 400 }
    );
  }

  const businessType = parseGatedAccessBusinessType(body.businessType);
  if (!businessType) {
    return NextResponse.json(
      { ok: false, error: 'Please select what best describes you.' },
      { status: 400 }
    );
  }

  const lead = await findVerifiedGatedLead(user, pageSlug);
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'No verified Market Overview access found.' },
      { status: 403 }
    );
  }

  if (lead.businessType) {
    // Already set — treat as success so the client can dismiss the modal.
    return NextResponse.json({ ok: true, alreadySet: true });
  }

  const admin = createServerClient();
  const { data: updated, error } = await admin
    .from('gated_content_leads')
    .update({ business_type: businessType })
    .eq('id', lead.id)
    .select('id, email, name, first_name, last_name, verified_at, business_type')
    .maybeSingle();

  if (error) {
    console.error('[gated-access/business-type] update failed:', error.message);
    return NextResponse.json(
      { ok: false, error: 'Could not save. Please try again.' },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: 'Could not save. Please try again.' },
      { status: 500 }
    );
  }

  const email = (updated.email || lead.email || user.email || '').toLowerCase();
  const firstName =
    typeof updated.first_name === 'string' ? updated.first_name : lead.firstName;
  const lastName =
    typeof updated.last_name === 'string' ? updated.last_name : lead.lastName;
  const name =
    (typeof updated.name === 'string' && updated.name.trim()) ||
    lead.name ||
    joinFullName(firstName ?? '', lastName ?? '') ||
    null;
  const verifiedAt =
    (typeof updated.verified_at === 'string' && updated.verified_at) ||
    lead.verifiedAt ||
    new Date().toISOString();
  const businessTypeLabel = gatedAccessBusinessTypeLabel(businessType);

  await logGatedContentEvent({
    eventType: 'form_submit',
    email,
    pageSlug,
    userId: user.id,
    metadata: {
      business_type: businessType,
      business_type_backfill: true,
      ...(name ? { name, first_name: firstName, last_name: lastName } : {}),
    },
  });

  notifyZapierGatedLead({
    email,
    name,
    first_name: firstName,
    last_name: lastName,
    business_type: businessType,
    page_slug: pageSlug,
    verified_at: verifiedAt,
    update_source: 'business_type_backfill',
  });

  await notifyMarketOverviewBusinessTypeBackfillSlack({
    email,
    name,
    businessType: businessTypeLabel,
  });

  return NextResponse.json({ ok: true });
}
