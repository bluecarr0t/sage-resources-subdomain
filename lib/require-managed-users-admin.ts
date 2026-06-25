import { NextResponse } from 'next/server';
import { isManagedUsersAdminEmail } from '@/lib/managed-users-admin';
import { forbiddenResponse } from '@/lib/api-auth-errors';
import type { RequireAdminAuthResult } from '@/lib/require-admin-auth';

export function requireManagedUsersAdmin(
  authResult: Extract<RequireAdminAuthResult, { ok: true }>
): NextResponse | null {
  if (!isManagedUsersAdminEmail(authResult.session.user.email)) {
    return forbiddenResponse();
  }
  return null;
}
