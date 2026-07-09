/**
 * Service-role Supabase client for Sage AI server-side writes.
 *
 * Tool code receives the cookie-based (anon-key) client from the chat route,
 * which is correct for reads but hits RLS walls on tables whose write
 * policies are service-role only (`reports` drafts, `property_geocode`,
 * `sage_ai_tool_events`). Those writes were silently failing. Use this
 * helper for such writes; it returns null when the service key is not
 * configured (tests / local dev) so callers can fall back to the provided
 * client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase';

let cached: SupabaseClient | null | undefined;

export function getSageAiServiceRoleClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createServerClient();
  return cached;
}

/**
 * Preferred client for Sage AI server-side writes: the service-role client
 * when configured, otherwise the caller-provided (user-scoped) client.
 */
export function sageAiWriteClient(fallback: SupabaseClient): SupabaseClient {
  return getSageAiServiceRoleClient() ?? fallback;
}
