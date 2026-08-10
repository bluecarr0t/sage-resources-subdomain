/**
 * Server-only: whether the current Supabase user may view a gated page.
 * Access is granted when either:
 * - The user is an active admin (`managed_users` + allowed email domain), or
 * - They completed the magic-link flow (`gated_content_leads` with `verified_at`).
 */

import type { User } from '@supabase/supabase-js';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';
import {
  parseGatedAccessBusinessType,
  type GatedAccessBusinessType,
} from '@/lib/gated-access-business-type';
import { createServerClient } from '@/lib/supabase';

/** Legacy slugs that still grant access after a gated page rename. */
const GATED_PAGE_SLUG_ALIASES: Record<string, readonly string[]> = {
  'outdoor-hospitality-pipeline': ['glamping-pipeline-quarterly'],
};

function gatedPageSlugsToCheck(pageSlug: string): string[] {
  const aliases = GATED_PAGE_SLUG_ALIASES[pageSlug] ?? [];
  return [pageSlug, ...aliases];
}

export type VerifiedGatedLead = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  businessType: GatedAccessBusinessType | null;
  verifiedAt: string | null;
};

/**
 * Load the verified gated-content lead for this user+page, if any.
 * Prefers user_id match, then email match (same order as access checks).
 */
export async function findVerifiedGatedLead(
  user: User,
  pageSlug: string
): Promise<VerifiedGatedLead | null> {
  const admin = createServerClient();
  const pageSlugs = gatedPageSlugsToCheck(pageSlug);
  const selectCols =
    'id, email, name, first_name, last_name, business_type, verified_at';

  const mapRow = (data: {
    id: string;
    email: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    business_type: string | null;
    verified_at: string | null;
  }): VerifiedGatedLead => ({
    id: data.id,
    email: data.email,
    name: data.name,
    firstName: data.first_name,
    lastName: data.last_name,
    businessType: parseGatedAccessBusinessType(data.business_type),
    verifiedAt: data.verified_at,
  });

  if (user.id) {
    const { data, error } = await admin
      .from('gated_content_leads')
      .select(selectCols)
      .in('page_slug', pageSlugs)
      .eq('user_id', user.id)
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return mapRow(data);
  }

  if (user.email) {
    const { data, error } = await admin
      .from('gated_content_leads')
      .select(selectCols)
      .in('page_slug', pageSlugs)
      .eq('email', user.email.toLowerCase())
      .not('verified_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!error && data) return mapRow(data);
  }

  return null;
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

  return (await findVerifiedGatedLead(user, pageSlug)) != null;
}
