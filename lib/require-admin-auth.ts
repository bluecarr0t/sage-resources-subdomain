/**
 * Reusable admin auth check for API routes.
 * Returns either an error response to return, or the auth context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { isManagedUser, isAllowedEmailDomain, getManagedUser } from '@/lib/auth-helpers';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

export interface AdminAuthContext {
  supabase: Awaited<ReturnType<typeof createServerClientWithCookies>>;
  session: { user: { id: string; email?: string | null } };
}

export type RequireAdminAuthResult =
  | { ok: true; supabase: AdminAuthContext['supabase']; session: AdminAuthContext['session'] }
  | { ok: false; response: ReturnType<typeof unauthorizedResponse> | ReturnType<typeof forbiddenResponse> };

export interface WithAdminAuthOptions {
  /** Require role === 'admin' in managed_users. Use for sensitive operations (e.g. uploads). */
  requireRole?: 'admin';
}

/**
 * Require admin auth. Returns auth context or error response.
 */
export async function requireAdminAuth(request?: NextRequest): Promise<RequireAdminAuthResult> {
  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const session = { user: { id: user.id, email: user.email } };

  if (!isAllowedEmailDomain(session.user.email)) {
    return { ok: false, response: forbiddenResponse() };
  }

  const hasAccess = await isManagedUser(session.user.id);
  if (!hasAccess) {
    return { ok: false, response: forbiddenResponse() };
  }

  return { ok: true, supabase, session };
}

/**
 * Wrapper for admin API route handlers. Enforces session + domain + managed_users.
 * Use for all /api/admin/* routes to avoid missing auth in new endpoints.
 *
 * @example
 * export const GET = withAdminAuth(async (req, auth) => {
 *   const data = await fetchData(auth.supabase);
 *   return NextResponse.json(data);
 * });
 *
 * @example With RBAC (admin role required)
 * export const POST = withAdminAuth(async (req, auth) => { ... }, { requireRole: 'admin' });
 */
export function withAdminAuth<
  TContext extends { params?: Promise<Record<string, string>> } | undefined = undefined,
>(
  handler: (
    request: NextRequest,
    auth: AdminAuthContext,
    context?: TContext
  ) => Promise<NextResponse>,
  options?: WithAdminAuthOptions
) {
  return async (request: NextRequest, context?: TContext): Promise<NextResponse> => {
    const authResult = await requireAdminAuth(request);
    if (!authResult.ok) return authResult.response;

    if (options?.requireRole === 'admin') {
      const user = await getManagedUser(authResult.session.user.id);
      if (!user || user.role !== 'admin') {
        return forbiddenResponse();
      }
    }

    return handler(request, { supabase: authResult.supabase, session: authResult.session }, context);
  };
}
