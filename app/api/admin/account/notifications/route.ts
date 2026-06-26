import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import {
  mergePipelineEmailPreferences,
  parsePipelineEmailPreferences,
  parsePipelineEmailPreferencesPatch,
} from '@/lib/project-pipeline/notifications/email-preferences';
import {
  mergePipelineSlackPreferences,
  parsePipelineSlackPreferences,
  parsePipelineSlackPreferencesPatch,
} from '@/lib/project-pipeline/notifications/slack-preferences';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

  const isProjectManager = Boolean(managedUser.is_project_manager);

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const channel = body.channel;
  if (channel !== 'email' && channel !== 'slack') {
    return NextResponse.json(
      {
        error: 'Invalid preferences',
        message: 'Provide channel ("email" or "slack") and at least one boolean preference field.',
      },
      { status: 400 }
    );
  }

  const { channel: _channel, ...preferenceBody } = body;
  const emailPatch =
    channel === 'email'
      ? parsePipelineEmailPreferencesPatch(preferenceBody, { isProjectManager })
      : null;
  const slackPatch =
    channel === 'slack'
      ? parsePipelineSlackPreferencesPatch(preferenceBody, { isProjectManager })
      : null;

  if (!emailPatch && !slackPatch) {
    return NextResponse.json(
      {
        error: 'Invalid preferences',
        message: 'Provide at least one boolean preference field.',
      },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (emailPatch) {
    const current = parsePipelineEmailPreferences(managedUser.pipeline_email_preferences);
    updatePayload.pipeline_email_preferences = mergePipelineEmailPreferences(current, emailPatch);
  }

  if (slackPatch) {
    const current = parsePipelineSlackPreferences(managedUser.pipeline_slack_preferences);
    updatePayload.pipeline_slack_preferences = mergePipelineSlackPreferences(current, slackPatch);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('managed_users')
    .update(updatePayload)
    .eq('id', managedUser.id)
    .select('pipeline_email_preferences, pipeline_slack_preferences')
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
    pipeline_email_preferences: parsePipelineEmailPreferences(data?.pipeline_email_preferences),
    pipeline_slack_preferences: parsePipelineSlackPreferences(data?.pipeline_slack_preferences),
  });
});
