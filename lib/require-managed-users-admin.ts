import { NextResponse } from 'next/server';
import { isManagedUsersAdminEmail } from '@/lib/managed-users-admin';
import { forbiddenResponse } from '@/lib/api-auth-errors';
import type { AdminAuthContext } from '@/lib/require-admin-auth';

export function requireManagedUsersAdmin(auth: AdminAuthContext): NextResponse | null {
  if (!isManagedUsersAdminEmail(auth.session.user.email)) {
    return forbiddenResponse();
  }
  return null;
}
