/**
 * Server-only: whether the current Supabase user may view a gated page.
 * Access is granted when either:
 * - The user is an active admin (`managed_users` + allowed email domain), or
 * - They completed the magic-link flow (`gated_content_leads` with `verified_at`).
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';

export async function checkGatedPageAccess(
  supabase: SupabaseClient,
  user: User | null | undefined,
  pageSlug: string
): Promise<boolean> {
  if (!user?.id && !user?.email) return false;

  if (user.id && isAllowedEmailDomain(user.email) && (await isManagedUser(user.id))) {
    return true;
  }

  if (user.id) {
    const { data, error } = await supabase
      .from('gated_content_leads')
      .select('id')
      .eq('page_slug', pageSlug)
      .eq('user_id', user.id)
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return true;
  }

  if (user.email) {
    const { data, error } = await supabase
      .from('gated_content_leads')
      .select('id')
      .eq('page_slug', pageSlug)
      .eq('email', user.email.toLowerCase())
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return true;
  }

  return false;
}
