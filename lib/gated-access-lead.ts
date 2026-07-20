/**
 * Server-only lookups for gated-content lead rows (magic-link registrants).
 */

import { createServerClient } from '@/lib/supabase';
import { joinFullName } from '@/lib/person-name';

export type GatedLeadLookup = {
  exists: boolean;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
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
      .select('name, first_name, last_name')
      .eq('email', email.trim().toLowerCase())
      .eq('page_slug', pageSlug)
      .maybeSingle();

    if (!data) {
      return { exists: false, name: null, firstName: null, lastName: null };
    }

    const firstName =
      typeof data.first_name === 'string' && data.first_name.trim().length > 0
        ? data.first_name.trim()
        : null;
    const lastName =
      typeof data.last_name === 'string' && data.last_name.trim().length > 0
        ? data.last_name.trim()
        : null;
    const combined =
      typeof data.name === 'string' && data.name.trim().length > 0
        ? data.name.trim()
        : joinFullName(firstName ?? '', lastName ?? '') || null;

    return {
      exists: true,
      name: combined,
      firstName,
      lastName,
    };
  } catch {
    return { exists: false, name: null, firstName: null, lastName: null };
  }
}
