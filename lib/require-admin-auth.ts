/**
 * Reusable admin auth check for API routes.
 * Returns either an error response to return, or the auth context.
 */

import { NextRequest } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

export interface AdminAuthContext {
  supabase: Awaited<ReturnType<typeof createServerClientWithCookies>>;
  session: { user: { id: string; email?: string | null } };
}

export type RequireAdminAuthResult =
  | { ok: true; supabase: AdminAuthContext['supabase']; session: AdminAuthContext['session'] }
  | { ok: false; response: ReturnType<typeof unauthorizedResponse> | ReturnType<typeof forbiddenResponse> };

/**
 * Require admin auth. Returns auth context or error response.
 */
export async function requireAdminAuth(request?: NextRequest): Promise<RequireAdminAuthResult> {
  const supabase = await createServerClientWithCookies();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  if (!isAllowedEmailDomain(session.user.email)) {
    return { ok: false, response: forbiddenResponse() };
  }

  const hasAccess = await isManagedUser(session.user.id);
  if (!hasAccess) {
    return { ok: false, response: forbiddenResponse() };
  }

  return { ok: true, supabase, session };
}
