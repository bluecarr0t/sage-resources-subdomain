/**
 * Best-effort POST to Zapier Catch Hook URLs. Used to sync leads to GoHighLevel
 * via Zapier when native Supabase integration is unavailable.
 *
 * Set env vars in Vercel (server-only, no NEXT_PUBLIC_ prefix):
 * - ZAPIER_NEWSLETTER_WEBHOOK_URL
 * - ZAPIER_GATED_LEAD_WEBHOOK_URL
 */

import { joinFullName, splitFullName } from '@/lib/person-name';

const WEBHOOK_TIMEOUT_MS = 8_000;

async function postZapierWebhook(
  envKey: 'ZAPIER_NEWSLETTER_WEBHOOK_URL' | 'ZAPIER_GATED_LEAD_WEBHOOK_URL',
  payload: Record<string, string | null | undefined>
): Promise<void> {
  const url = process.env[envKey]?.trim();
  if (!url) return;

  const body = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value != null && value !== '')
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[zapier-webhook] ${envKey} returned ${res.status}`);
    }
  } catch (err) {
    console.error(`[zapier-webhook] ${envKey} failed:`, err);
  }
}

export type NewsletterZapierPayload = {
  email: string;
  first_name: string;
  last_name: string;
  source: string;
  subscribed_at: string;
};

export function notifyZapierNewsletterSignup(payload: NewsletterZapierPayload): void {
  void postZapierWebhook('ZAPIER_NEWSLETTER_WEBHOOK_URL', {
    lead_type: 'newsletter',
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    name: joinFullName(payload.first_name, payload.last_name),
    source: payload.source,
    subscribed_at: payload.subscribed_at,
  });
}

export type GatedLeadZapierPayload = {
  email: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  page_slug: string;
  verified_at: string;
};

export function notifyZapierGatedLead(payload: GatedLeadZapierPayload): void {
  const split = splitFullName(payload.name ?? '');
  const first_name = payload.first_name?.trim() || split.first_name;
  const last_name = payload.last_name?.trim() || split.last_name;

  void postZapierWebhook('ZAPIER_GATED_LEAD_WEBHOOK_URL', {
    lead_type: 'gated_content',
    email: payload.email,
    first_name,
    last_name,
    name:
      payload.name?.trim() || joinFullName(first_name, last_name) || undefined,
    page_slug: payload.page_slug,
    verified_at: payload.verified_at,
  });
}
