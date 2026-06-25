import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { fetchProjectPipelineJobActivity } from '@/lib/project-pipeline/activity/fetch-activity';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const managedUser = await getManagedUser(auth.session.user.id);
  const pipelineViewAll = canViewAllPipelineJobs(managedUser);
  const params = request.nextUrl.searchParams;

  const page = Number(params.get('page') ?? '1');
  const perPage = Number(params.get('perPage') ?? '50');
  const jobNumber = params.get('jobNumber') ?? undefined;
  const actorQuery = params.get('actor') ?? undefined;
  const sheetNameParam = params.get('sheetName');
  const sheetName = sheetNameParam ? resolveProjectPipelineSheetTab(sheetNameParam) : undefined;

  try {
    const supabase = createServerClient();
    const result = await fetchProjectPipelineJobActivity({
      supabase,
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 50,
      pipelineViewAll,
      viewerEmail: auth.session.user.email,
      jobNumber,
      actorQuery,
      sheetName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[project-pipeline/activity] fetch failed', error);
    return NextResponse.json(
      {
        error: 'Failed to load job activity',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
