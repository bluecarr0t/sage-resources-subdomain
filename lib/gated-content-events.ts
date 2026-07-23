/**
 * Append-only event log for gated content form submits and magic-link re-auths.
 * Inserts are best-effort via service role; failures must never block user flows.
 */

import { isGatedPageSlug } from '@/lib/gated-access';
import { createServerClient } from '@/lib/supabase';

export type GatedContentEventType = 'form_submit' | 'auth_verified';

export type GatedContentEventMetadata = {
  email_only?: boolean;
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  /** True when this auth_verified is the lead's first magic-link verify. */
  is_new_signup?: boolean;
  /** True when this auth_verified is a later return sign-in. */
  is_return?: boolean;
};

export type LogGatedContentEventParams = {
  eventType: GatedContentEventType;
  email: string;
  pageSlug: string;
  userId?: string | null;
  metadata?: GatedContentEventMetadata;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Record a gated-access event. Never throws; logs insert errors to stderr.
 */
export async function logGatedContentEvent(params: LogGatedContentEventParams): Promise<void> {
  const email = normalizeEmail(params.email);
  if (!email) return;
  if (!isGatedPageSlug(params.pageSlug)) return;

  const metadata = params.metadata ?? {};

  try {
    const { error } = await createServerClient().from('gated_content_access_events').insert({
      event_type: params.eventType,
      email,
      page_slug: params.pageSlug,
      user_id: params.userId ?? null,
      metadata,
    });

    if (error) {
      console.error('[gated-content-events] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[gated-content-events] insert failed:', err);
  }
}
