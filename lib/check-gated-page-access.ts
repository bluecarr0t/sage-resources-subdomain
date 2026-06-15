/**
 * Server-only: whether the current Supabase user may view a gated page.
 * Access is granted when either:
 * - The user is an active admin (`managed_users` + allowed email domain), or
 * - They completed the magic-link flow (`gated_content_leads` with `verified_at`).
 */

import type { User } from '@supabase/supabase-js';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';

/** Legacy slugs that still grant access after a gated page rename. */
const GATED_PAGE_SLUG_ALIASES: Record<string, readonly string[]> = {
  'outdoor-hospitality-pipeline': ['glamping-pipeline-quarterly'],
};

function gatedPageSlugsToCheck(pageSlug: string): string[] {
  const aliases = GATED_PAGE_SLUG_ALIASES[pageSlug] ?? [];
  return [pageSlug, ...aliases];
}

export async function checkGatedPageAccess(
  _supabase: unknown,
  user: User | null | undefined,
  pageSlug: string
): Promise<boolean> {
  if (!user?.id && !user?.email) return false;

  if (user.id && isAllowedEmailDomain(user.email) && (await isManagedUser(user.id))) {
    return true;
  }

  const admin = createServerClient();
  const pageSlugs = gatedPageSlugsToCheck(pageSlug);

  if (user.id) {
    const { data, error } = await admin
      .from('gated_content_leads')
      .select('id')
      .in('page_slug', pageSlugs)
      .eq('user_id', user.id)
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return true;
  }

  if (user.email) {
    const { data, error } = await admin
      .from('gated_content_leads')
      .select('id')
      .in('page_slug', pageSlugs)
      .eq('email', user.email.toLowerCase())
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return true;
  }

  return false;
}
