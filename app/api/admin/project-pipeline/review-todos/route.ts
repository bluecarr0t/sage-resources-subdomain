import { NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import { isProjectPipelineConfigured } from '@/lib/project-pipeline/auth';
import { loadVisibleProjectPipelineJobs } from '@/lib/project-pipeline/load-visible-pipeline-jobs';
import { DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER } from '@/lib/project-pipeline/sheet-tabs';
import { countProjectPipelineReviewTodos } from '@/lib/project-pipeline/review-todos';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async (_request, auth) => {
  if (!isProjectPipelineConfigured()) {
    return NextResponse.json({ count: 0 });
  }

  const managedUser = await getManagedUser(auth.session.user.id);
  const displayName = managedUser?.display_name ?? null;
  const email = auth.session.user.email;
  const pipelineViewAll = canViewAllPipelineJobs(managedUser);

  const supabase = createServerClient();
  const { jobs } = await loadVisibleProjectPipelineJobs({
    supabase,
    sheetName: DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER,
    email,
    displayName,
    pipelineViewAll,
    viewerIsAdmin: isManagedUserAdmin(managedUser),
    allowOAuthSheets: false,
    includeFieldColumnMap: false,
  });

  const count = countProjectPipelineReviewTodos(jobs, {
    email,
    displayName,
    pipelineViewAll,
    managedUser,
  });

  return NextResponse.json({ count });
});
