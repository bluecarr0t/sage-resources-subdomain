/**
 * Count verified gated-content leads for Slack ordinals / totals.
 *
 * Prefers a SECURITY DEFINER RPC so the total is never clipped by RLS or by
 * HEAD/Content-Range quirks on serverless runtimes. Falls back to a GET select.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

function asPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return null;
}

async function countViaRpc(
  supabase: SupabaseClient,
  pageSlug: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc('count_verified_gated_leads', {
    p_page_slug: pageSlug,
  });
  if (error) {
    console.warn(
      '[gated-content-signup-count] RPC count_verified_gated_leads failed:',
      error.message
    );
    return null;
  }
  return asPositiveInt(data);
}

async function countViaSelect(
  supabase: SupabaseClient,
  pageSlug: string
): Promise<{ count: number; error: string | null }> {
  const { data, count, error } = await supabase
    .from('gated_content_leads')
    .select('id', { count: 'exact' })
    .eq('page_slug', pageSlug)
    .not('verified_at', 'is', null);

  if (error) {
    return { count: 0, error: error.message };
  }

  const fromRows = Array.isArray(data) ? data.length : 0;
  const fromHeader = asPositiveInt(count) ?? 0;
  // Prefer the larger value: Content-Range can under-report on some runtimes;
  // row length is authoritative when under the API max-rows limit.
  return { count: Math.max(fromRows, fromHeader), error: null };
}

/**
 * Total rows in gated_content_leads with verified_at set for a page slug.
 */
export async function countVerifiedGatedLeads(
  supabase: SupabaseClient,
  pageSlug: string
): Promise<{ count: number; error: string | null }> {
  const rpcCount = await countViaRpc(supabase, pageSlug);
  if (rpcCount != null) {
    return { count: rpcCount, error: null };
  }

  return countViaSelect(supabase, pageSlug);
}

/**
 * How many times this email has completed magic-link verify for a gated page.
 * Includes the current event if it was already inserted.
 */
export async function countAuthVerifiedForEmail(
  supabase: SupabaseClient,
  email: string,
  pageSlug: string
): Promise<number> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;

  const { data, count, error } = await supabase
    .from('gated_content_access_events')
    .select('id', { count: 'exact' })
    .eq('email', normalized)
    .eq('page_slug', pageSlug)
    .eq('event_type', 'auth_verified');

  if (error) {
    console.warn(
      '[gated-content-signup-count] auth_verified count failed:',
      error.message
    );
    return 0;
  }

  const fromRows = Array.isArray(data) ? data.length : 0;
  const fromHeader = asPositiveInt(count) ?? 0;
  return Math.max(fromRows, fromHeader);
}
