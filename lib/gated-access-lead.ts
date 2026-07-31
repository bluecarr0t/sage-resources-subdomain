/**
 * Server-only lookups for gated-content lead rows (magic-link registrants).
 */

import {
  parseGatedAccessBusinessType,
  type GatedAccessBusinessType,
} from '@/lib/gated-access-business-type';
import { createServerClient } from '@/lib/supabase';
import { joinFullName } from '@/lib/person-name';

export type GatedLeadLookup = {
  exists: boolean;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  businessType: GatedAccessBusinessType | null;
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
      .select('name, first_name, last_name, business_type')
      .eq('email', email.trim().toLowerCase())
      .eq('page_slug', pageSlug)
      .maybeSingle();

    if (!data) {
      return {
        exists: false,
        name: null,
        firstName: null,
        lastName: null,
        businessType: null,
      };
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
      businessType: parseGatedAccessBusinessType(data.business_type),
    };
  } catch {
    return {
      exists: false,
      name: null,
      firstName: null,
      lastName: null,
      businessType: null,
    };
  }
}
