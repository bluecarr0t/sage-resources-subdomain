import { NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { parsePipelineEmailPreferences } from '@/lib/project-pipeline/notifications/email-preferences';
import { normalizeManagedUserRole } from '@/lib/managed-user-roles';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request, auth) => {
  const managedUser = await getManagedUser(auth.session.user.id);

  if (!managedUser) {
    return NextResponse.json({ error: 'Managed user not found' }, { status: 404 });
  }

  return NextResponse.json({
    email: managedUser.email,
    display_name: managedUser.display_name,
    role: normalizeManagedUserRole(managedUser.role),
    is_project_manager: Boolean(managedUser.is_project_manager),
    pipeline_email_preferences: parsePipelineEmailPreferences(
      managedUser.pipeline_email_preferences
    ),
  });
});
