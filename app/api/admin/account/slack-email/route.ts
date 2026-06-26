import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import {
  isValidSlackEmailInput,
  normalizeSlackEmailInput,
} from '@/lib/managed-users/slack-email';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import {
  isPipelineSlackEnabled,
  lookupSlackUserProfileByEmail,
} from '@/lib/slack/pipeline-slack-client';

export const dynamic = 'force-dynamic';

function slackLookupErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'users_not_found':
      return 'No Slack user found with that email in the Sage workspace.';
    case 'invalid_auth':
    case 'not_authed':
      return 'Slack is not configured for lookups. Contact an administrator.';
    default:
      return 'Could not verify that email with Slack.';
  }
}

async function verifySlackEmail(email: string) {
  if (!isPipelineSlackEnabled()) {
    return {
      ok: false as const,
      status: 503,
      message: 'Slack is not enabled on this server.',
    };
  }

  try {
    const profile = await lookupSlackUserProfileByEmail(email);
    if (!profile) {
      return {
        ok: false as const,
        status: 404,
        message: 'No Slack user found with that email in the Sage workspace.',
      };
    }

    return {
      ok: true as const,
      profile,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? slackLookupErrorMessage(error.message)
        : 'Could not verify that email with Slack.';
    return {
      ok: false as const,
      status: 502,
      message,
    };
  }
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
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

  const candidate =
    typeof body === 'object' &&
    body !== null &&
    'email' in body &&
    typeof (body as { email?: unknown }).email === 'string'
      ? (body as { email: string }).email
      : managedUser.email;

  const normalized = normalizeSlackEmailInput(candidate);
  if (!normalized || !isValidSlackEmailInput(normalized)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const result = await verifySlackEmail(normalized);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    email: result.profile.email,
    slack_name: result.profile.name,
    slack_user_id: result.profile.userId,
  });
});

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

  if (typeof body !== 'object' || body === null || !('slack_email' in body)) {
    return NextResponse.json({ error: 'Provide slack_email.' }, { status: 400 });
  }

  const raw = (body as { slack_email: unknown }).slack_email;
  if (raw !== null && typeof raw !== 'string') {
    return NextResponse.json({ error: 'slack_email must be a string or null.' }, { status: 400 });
  }

  const normalized = raw === null || raw.trim() === '' ? null : normalizeSlackEmailInput(raw);
  if (normalized && !isValidSlackEmailInput(normalized)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  let slackName: string | null = null;
  let slackUserId: string | null = null;

  if (normalized) {
    const result = await verifySlackEmail(normalized);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    slackName = result.profile.name;
    slackUserId = result.profile.userId;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('managed_users')
    .update({
      slack_email: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', managedUser.id)
    .select('slack_email')
    .single();

  if (error) {
    const status = error.code === '42703' ? 503 : 500;
    return NextResponse.json(
      {
        error: 'Failed to save Slack email',
        message: error.message,
      },
      { status }
    );
  }

  return NextResponse.json({
    slack_email: data?.slack_email ?? null,
    slack_name: slackName,
    slack_user_id: slackUserId,
  });
});
