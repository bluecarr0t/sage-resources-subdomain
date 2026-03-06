/**
 * Server-side admin auth check for layouts and server components.
 * Use before rendering admin UI to avoid client-side flash.
 */

import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isAllowedEmailDomain, isManagedUser } from '@/lib/auth-helpers';

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  userEmail?: string | null;
}

/**
 * Check if the current request has a valid admin session (session + domain + managed_users).
 * Call from server components/layouts before rendering admin content.
 */
export async function getAdminAuthServer(): Promise<AdminAuthResult> {
  try {
    const supabase = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { authorized: false };
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return { authorized: false };
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return { authorized: false };
    }

    return {
      authorized: true,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
    };
  } catch {
    return { authorized: false };
  }
}
