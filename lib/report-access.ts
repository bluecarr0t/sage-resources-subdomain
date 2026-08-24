/**
 * Owner-or-admin access for reports.
 * Authors may only touch their own rows; admin role may access any report.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getManagedUser } from '@/lib/auth-helpers';
import type { AdminAuthContext } from '@/lib/require-admin-auth';

export type ReportAccessRole = 'admin' | 'author';

export type ReportAccessActor = {
  userId: string;
  role: ReportAccessRole;
};

export async function getReportAccessActor(userId: string): Promise<ReportAccessActor> {
  const user = await getManagedUser(userId);
  return {
    userId,
    role: user?.role === 'admin' ? 'admin' : 'author',
  };
}

export type ReportAccessDenied = {
  ok: false;
  status: 403 | 404;
  error: string;
};

export type ReportAccessAllowed = { ok: true };

export function assertReportAccess(
  actor: ReportAccessActor,
  report: { user_id?: string | null } | null | undefined
): ReportAccessAllowed | ReportAccessDenied {
  if (!report) {
    return { ok: false, status: 404, error: 'Report not found' };
  }
  if (actor.role !== 'admin' && report.user_id !== actor.userId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

export function reportAccessDeniedResponse(
  result: ReportAccessDenied
): NextResponse {
  return NextResponse.json({ success: false, error: result.error }, { status: result.status });
}

/**
 * Session client for authors (RLS). Service-role client for admins so they can
 * list/update reports owned by others without changing Postgres RLS.
 */
export async function reportsDbForAuth(auth: AdminAuthContext): Promise<{
  actor: ReportAccessActor;
  supabase: AdminAuthContext['supabase'] | ReturnType<typeof createServerClient>;
}> {
  const actor = await getReportAccessActor(auth.session.user.id);
  if (actor.role === 'admin') {
    return { actor, supabase: createServerClient() };
  }
  return { actor, supabase: auth.supabase };
}
