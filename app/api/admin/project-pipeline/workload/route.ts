import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { requireManagedUsersAdmin } from '@/lib/require-managed-users-admin';
import { buildProjectPipelineWorkloadApiResponse } from '@/lib/project-pipeline/build-workload-api-response';
import { isProjectPipelineConfigured } from '@/lib/project-pipeline/auth';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';

async function handleWorkloadRequest(
  options: {
    accessToken?: string;
    sheetName?: string;
    incompleteOnly?: boolean;
    segmentFilter?: string | null;
    view?: string | null;
    allowOAuthSheets?: boolean;
  } = {}
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
    const payload = await buildProjectPipelineWorkloadApiResponse(options);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[project-pipeline/workload] failed to load workload', error);
    return NextResponse.json(
      {
        error: 'Failed to load pipeline workload',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const forbidden = requireManagedUsersAdmin(auth);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const sheetName = searchParams.get('sheetName') ?? undefined;
  const incompleteOnly = searchParams.get('incompleteOnly') !== 'false';
  const segmentFilter = searchParams.get('segmentFilter');
  const view = searchParams.get('view');

  return handleWorkloadRequest({ sheetName, incompleteOnly, segmentFilter, view });
});

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  const forbidden = requireManagedUsersAdmin(auth);
  if (forbidden) return forbidden;

  let body: {
    accessToken?: unknown;
    sheetName?: unknown;
    incompleteOnly?: unknown;
    segmentFilter?: unknown;
    view?: unknown;
  };
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
      ? resolveProjectPipelineSheetTab(body.sheetName)
      : undefined;

  const incompleteOnly = body.incompleteOnly !== false;
  const segmentFilter =
    typeof body.segmentFilter === 'string' ? body.segmentFilter : undefined;
  const view = typeof body.view === 'string' ? body.view : undefined;

  return handleWorkloadRequest({ accessToken, sheetName, incompleteOnly, segmentFilter, view, allowOAuthSheets: true });
});
