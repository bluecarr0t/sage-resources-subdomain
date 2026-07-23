/**
 * Count / rank verified gated-content leads for Slack ordinals / totals.
 *
 * Prefers SECURITY DEFINER RPCs so totals are never clipped by RLS or by
 * HEAD/Content-Range quirks on serverless runtimes. Falls back to GET selects.
 *
 * Signup ordinals use rank-for-email (not a bare total) so two near-simultaneous
 * signups cannot both claim the same "#N" when a count snapshot lags an upsert.
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

async function rankViaRpc(
  supabase: SupabaseClient,
  pageSlug: string,
  email: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc('rank_verified_gated_lead', {
    p_page_slug: pageSlug,
    p_email: email,
  });
  if (error) {
    console.warn(
      '[gated-content-signup-count] RPC rank_verified_gated_lead failed:',
      error.message
    );
    return null;
  }
  return asPositiveInt(data);
}

async function rankViaSelect(
  supabase: SupabaseClient,
  pageSlug: string,
  email: string
): Promise<{ rank: number; error: string | null }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { rank: 0, error: 'missing email' };

  const { data: me, error: meError } = await supabase
    .from('gated_content_leads')
    .select('verified_at, created_at, email')
    .eq('page_slug', pageSlug)
    .ilike('email', normalized)
    .not('verified_at', 'is', null)
    .maybeSingle();

  if (meError) return { rank: 0, error: meError.message };
  if (!me?.verified_at) return { rank: 0, error: null };

  const { data, count, error } = await supabase
    .from('gated_content_leads')
    .select('id, verified_at, created_at, email', { count: 'exact' })
    .eq('page_slug', pageSlug)
    .not('verified_at', 'is', null)
    .lte('verified_at', me.verified_at);

  if (error) return { rank: 0, error: error.message };

  const rows = Array.isArray(data) ? data : [];
  // Filter in JS for created_at / email tie-break when verified_at ties.
  const meCreated = me.created_at ? Date.parse(me.created_at) : 0;
  const meEmail = String(me.email ?? normalized).toLowerCase();
  const ranked = rows.filter((row) => {
    const rowVerified = row.verified_at ? Date.parse(row.verified_at) : 0;
    const meVerified = Date.parse(me.verified_at);
    if (rowVerified < meVerified) return true;
    if (rowVerified > meVerified) return false;
    const rowCreated = row.created_at ? Date.parse(row.created_at) : 0;
    if (rowCreated < meCreated) return true;
    if (rowCreated > meCreated) return false;
    return String(row.email ?? '').toLowerCase() <= meEmail;
  });

  const fromRows = ranked.length;
  const fromHeader = asPositiveInt(count) ?? 0;
  // When verified_at values are unique, header count for lte is fine; with ties
  // prefer the filtered row length.
  return { rank: Math.max(fromRows, fromHeader > 0 && fromRows > 0 ? fromRows : fromHeader), error: null };
}

/**
 * 1-based ordinal of this email among verified leads for the page.
 * Prefer this over a bare total for Slack "#N" labels.
 */
export async function rankVerifiedGatedLead(
  supabase: SupabaseClient,
  pageSlug: string,
  email: string
): Promise<{ rank: number; error: string | null }> {
  const rpcRank = await rankViaRpc(supabase, pageSlug, email);
  if (rpcRank != null && rpcRank > 0) {
    return { rank: rpcRank, error: null };
  }

  return rankViaSelect(supabase, pageSlug, email);
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
