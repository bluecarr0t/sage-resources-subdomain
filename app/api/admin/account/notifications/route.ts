import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import {
  mergePipelineEmailPreferences,
  parsePipelineEmailPreferences,
  parsePipelineEmailPreferencesPatch,
} from '@/lib/project-pipeline/notifications/email-preferences';

export const dynamic = 'force-dynamic';

export const PATCH = withAdminAuth(async (request: NextRequest, auth) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const managedUser = await getManagedUser(auth.session.user.id);
  if (!managedUser) {
    return NextResponse.json({ error: 'Managed user not found' }, { status: 404 });
  }

  const patch = parsePipelineEmailPreferencesPatch(body, {
    isProjectManager: Boolean(managedUser.is_project_manager),
  });
  if (!patch) {
    return NextResponse.json(
      {
        error: 'Invalid preferences',
        message: 'Provide at least one boolean preference field.',
      },
      { status: 400 }
    );
  }

  const current = parsePipelineEmailPreferences(managedUser.pipeline_email_preferences);
  const pipeline_email_preferences = mergePipelineEmailPreferences(current, patch);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('managed_users')
    .update({
      pipeline_email_preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', managedUser.id)
    .select('pipeline_email_preferences')
    .single();

  if (error) {
    const status = error.code === '42703' ? 503 : 500;
    return NextResponse.json(
      {
        error: 'Failed to update notification preferences',
        message: error.message,
      },
      { status }
    );
  }

  return NextResponse.json({
    pipeline_email_preferences: parsePipelineEmailPreferences(
      data?.pipeline_email_preferences
    ),
  });
});
