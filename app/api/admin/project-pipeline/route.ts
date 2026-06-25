import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { buildProjectPipelineApiResponse } from '@/lib/project-pipeline/build-api-response';
import { isProjectPipelineConfigured } from '@/lib/project-pipeline/auth';
import { resolveProjectPipelineSheetTab, resolveProjectPipelineSheetSelection } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';

async function handleProjectPipelineRequest(
  auth: { session: { user: { id: string; email?: string | null } } },
  options: { accessToken?: string; sheetName?: string } = {}
) {
  if (!isProjectPipelineConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: 'Project Pipeline is not configured',
        message:
          'Set GOOGLE_SERVICE_ACCOUNT_JSON (or email + private key), or NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID for OAuth.',
      },
      { status: 503 }
    );
  }

  try {
    const payload = await buildProjectPipelineApiResponse({
      userId: auth.session.user.id,
      email: auth.session.user.email,
      accessToken: options.accessToken,
      sheetName: options.sheetName,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[project-pipeline] failed to load jobs', error);
    return NextResponse.json(
      {
        error: 'Failed to load project pipeline',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const sheetName = request.nextUrl.searchParams.get('sheetName') ?? undefined;
  return handleProjectPipelineRequest(auth, { sheetName });
});

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  let body: { accessToken?: unknown; sheetName?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const accessToken =
    typeof body.accessToken === 'string' && body.accessToken.trim()
      ? body.accessToken.trim()
      : undefined;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing accessToken for Google Sheets OAuth' },
      { status: 400 }
    );
  }

  const sheetName =
    typeof body.sheetName === 'string' && body.sheetName.trim()
      ? resolveProjectPipelineSheetSelection(body.sheetName)
      : undefined;

  return handleProjectPipelineRequest(auth, { accessToken, sheetName });
});
