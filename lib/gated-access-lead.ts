/**
 * Server-only lookups for gated-content lead rows (magic-link registrants).
 */

import { createServerClient } from '@/lib/supabase';

export type GatedLeadLookup = {
  exists: boolean;
  name: string | null;
};

/**
 * Whether this email has a lead row for the gated page (any verification state).
 */
export async function lookupGatedLead(
  email: string,
  pageSlug: string
): Promise<GatedLeadLookup> {
  try {
    const admin = createServerClient();
    const { data } = await admin
      .from('gated_content_leads')
      .select('name')
      .eq('email', email.trim().toLowerCase())
      .eq('page_slug', pageSlug)
      .maybeSingle();

    if (!data) {
      return { exists: false, name: null };
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    return { exists: true, name: name.length > 0 ? name : null };
  } catch {
    return { exists: false, name: null };
  }
}
