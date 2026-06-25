import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { resolveProjectPipelineEditUser } from '@/lib/project-pipeline/author-preview';
import {
  fetchProjectPipelineJobByJobNumber,
  updateProjectPipelineJobProjectStatus,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import { normalizeProjectPipelineProjectStatus, isStickyProjectPipelineProjectStatus } from '@/lib/project-pipeline/project-status';
import {
  canManuallyEditProjectPipelineStatus,
  isManagedUserAdmin,
} from '@/lib/project-pipeline/job-edit-permissions';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import { canEditProjectPipelineJob } from '@/lib/project-pipeline/resolve-job-for-edit';
import { isProjectPipelineJobPayload } from '@/lib/project-pipeline/parse-job-payload';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import { notifyPipelineJobChangesAsync } from '@/lib/project-pipeline/notifications/notify-pipeline-job-change';
import { recordProjectPipelineJobActivityAsync } from '@/lib/project-pipeline/activity/record-activity';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export const dynamic = 'force-dynamic';

export const PATCH = withAdminAuth(async (request: NextRequest, auth) => {
  let body: {
    job?: unknown;
    projectStatus?: unknown;
    manualOverride?: unknown;
    previewAsDisplayName?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobPayload(body.job)) {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
  }

  const sheetName = resolveProjectPipelineSheetTab(body.job.pipelineSheetName);
  const baseJob = { ...body.job, pipelineSheetName: sheetName };
  const managedUser = await getManagedUser(auth.session.user.id);
  const manualOverrideRequested = body.manualOverride === true;
  const requestedStatus =
    typeof body.projectStatus === 'string'
      ? normalizeProjectPipelineProjectStatus(body.projectStatus)
      : withDerivedProjectPipelineProjectStatus(baseJob).projectStatus;
  const manualOverride =
    (manualOverrideRequested || isStickyProjectPipelineProjectStatus(requestedStatus)) &&
    canManuallyEditProjectPipelineStatus(managedUser);

  if (
    (manualOverrideRequested || isStickyProjectPipelineProjectStatus(requestedStatus)) &&
    !manualOverride
  ) {
    return NextResponse.json(
      { error: 'Only admins can manually override project status' },
      { status: 403 }
    );
  }

  const projectStatus = requestedStatus;
  const job = { ...baseJob, projectStatus };
  const viewerDisplayName = managedUser?.display_name ?? null;
  const viewerEmail = auth.session.user.email;
  const pipelineViewAll = canViewAllPipelineJobs(managedUser);
  const isAdmin = isManagedUserAdmin(managedUser);

  const editUser = {
    ...resolveProjectPipelineEditUser({
      viewerEmail,
      viewerDisplayName,
      previewAsDisplayName: body.previewAsDisplayName,
    }),
    pipelineViewAll,
  };

  const supabase = createServerClient();
  const sheetId = getProjectPipelineSheetId();

  const existingJob = await fetchProjectPipelineJobByJobNumber(supabase, {
    sheetId,
    sheetName,
    jobNumber: job.jobNumber,
  });

  if (
    !canEditProjectPipelineJob({
      job,
      sheetName,
      pipelineViewAll,
      isAdmin,
      existingJob,
      viewerDisplayName: editUser.displayName,
    })
  ) {
    return NextResponse.json({ error: 'You cannot edit this project' }, { status: 403 });
  }

  try {
    const savedJob = await updateProjectPipelineJobProjectStatus(
      supabase,
      { ...job, pipelineSheetName: sheetName },
      {
        sheetId: getProjectPipelineSheetId(),
        sheetName,
        projectStatus,
        manualOverride,
      }
    );

    const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
    notifyPipelineJobChangesAsync({
      existingJob: existingJob ?? undefined,
      savedJob,
      actorEmail: auth.session.user.email,
      actorDisplayName: editUser.displayName ?? auth.session.user.email ?? 'A team member',
      managedUsers,
    });

    recordProjectPipelineJobActivityAsync({
      supabase,
      sheetId,
      sheetName,
      job: savedJob,
      existingJob: existingJob ?? undefined,
      action: 'project_status_updated',
      actorUserId: auth.session.user.id,
      actorEmail: auth.session.user.email,
      actorDisplayName: editUser.displayName ?? auth.session.user.email ?? 'Unknown user',
      managedUsers,
    });

    return NextResponse.json({
      success: true,
      job: savedJob,
    });
  } catch (error) {
    console.error('[project-pipeline/jobs/project-status] update failed', error);
    return NextResponse.json(
      {
        error: 'Failed to save project status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
