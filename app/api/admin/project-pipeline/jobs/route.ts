import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { resolveProjectPipelineEditUser } from '@/lib/project-pipeline/author-preview';
import {
  assertProjectPipelineJobFieldEditsAllowed,
  canDeleteProjectPipelineJob,
  isManagedUserAdmin,
} from '@/lib/project-pipeline/job-edit-permissions';
import {
  deleteProjectPipelineJobMirror,
  fetchProjectPipelineJobByJobNumber,
  upsertProjectPipelineJobMirror,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import { normalizeProjectPipelineFlag } from '@/lib/project-pipeline/project-flag';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import { canEditProjectPipelineJob } from '@/lib/project-pipeline/resolve-job-for-edit';
import {
  canCreateProjectPipelineJob,
  validateNewProjectPipelineJob,
} from '@/lib/project-pipeline/create-job';
import {
  isProjectPipelineJobPayload,
  normalizeUiCreatedProjectPipelineJobPayload,
} from '@/lib/project-pipeline/parse-job-payload';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import { notifyPipelineJobChangesAsync } from '@/lib/project-pipeline/notifications/notify-pipeline-job-change';
import { recordProjectPipelineJobActivityAsync } from '@/lib/project-pipeline/activity/record-activity';
import {
  getReviewStatusDropdownLabel,
  normalizeProjectPipelineReviewStatus,
} from '@/lib/project-pipeline/review-status';
import {
  canAddProjectPipelineReviewerFeedback,
  filterProjectPipelineJobReviewNotesForViewer,
  isProjectPipelineReviewStatusApproved,
  isProjectPipelineReviewStatusChangesRequested,
} from '@/lib/project-pipeline/review-workflow';
import {
  appendProjectPipelineReviewNote,
  parseProjectPipelineReviewNotes,
} from '@/lib/project-pipeline/review-notes';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  let body: { job?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobPayload(body.job)) {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
  }

  const job = normalizeUiCreatedProjectPipelineJobPayload(body.job);
  const managedUser = await getManagedUser(auth.session.user.id);
  const viewerDisplayName = managedUser?.display_name ?? null;
  const pipelineViewAll = canViewAllPipelineJobs(managedUser);
  const isAdmin = isManagedUserAdmin(managedUser);

  if (!canCreateProjectPipelineJob({ pipelineViewAll, isAdmin })) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'You do not have permission to create projects' },
      { status: 403 }
    );
  }

  const validationError = validateNewProjectPipelineJob(job);
  if (validationError) {
    return NextResponse.json({ error: validationError, message: validationError }, { status: 400 });
  }

  const sheetName = resolveProjectPipelineSheetTab(job.pipelineSheetName);
  const supabase = createServerClient();
  const sheetId = getProjectPipelineSheetId();

  const existing = await fetchProjectPipelineJobByJobNumber(supabase, {
    sheetId,
    sheetName,
    jobNumber: job.jobNumber.trim(),
  });

  if (existing) {
    return NextResponse.json(
      {
        error: 'Job number already exists',
        message: `Job ${job.jobNumber.trim()} already exists for ${sheetName}`,
      },
      { status: 409 }
    );
  }

  const jobForMirror = withDerivedProjectPipelineProjectStatus({
    ...job,
    jobNumber: job.jobNumber.trim(),
    pipelineSheetName: sheetName,
    uiSourceOfTruth: true,
    flag: normalizeProjectPipelineFlag(isAdmin ? job.flag : undefined),
    jobNotes: [],
    reviewNotes: [],
    projectStatusManual: Boolean(job.projectStatusManual && isAdmin),
  });

  try {
    const savedJob = await upsertProjectPipelineJobMirror(supabase, jobForMirror, {
      sheetId,
      sheetName,
    });

    const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
    recordProjectPipelineJobActivityAsync({
      supabase,
      sheetId,
      sheetName,
      job: savedJob,
      action: 'job_created',
      actorUserId: auth.session.user.id,
      actorEmail: auth.session.user.email,
      actorDisplayName: viewerDisplayName ?? auth.session.user.email ?? 'Unknown user',
      managedUsers,
    });

    return NextResponse.json({
      success: true,
      job: filterProjectPipelineJobReviewNotesForViewer(savedJob, {
        displayName: viewerDisplayName,
        isAdmin,
      }),
    });
  } catch (error) {
    console.error('[project-pipeline/jobs] create failed', error);
    return NextResponse.json(
      {
        error: 'Failed to create project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const PUT = withAdminAuth(async (request: NextRequest, auth) => {
  let body: {
    job?: unknown;
    previewAsDisplayName?: unknown;
    reviewFeedbackNote?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobPayload(body.job)) {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
  }

  const job = normalizeUiCreatedProjectPipelineJobPayload(body.job);
  const sheetName = resolveProjectPipelineSheetTab(job.pipelineSheetName);
  const managedUser = await getManagedUser(auth.session.user.id);
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

  const jobWithSheet = {
    ...job,
    pipelineSheetName: sheetName,
    flag: normalizeProjectPipelineFlag(isAdmin ? job.flag : existingJob?.flag ?? job.flag),
    jobNotes: existingJob?.jobNotes ?? [],
    reviewNotes: parseProjectPipelineReviewNotes(existingJob?.reviewNotes ?? []),
    sheetFieldSnapshot: existingJob?.sheetFieldSnapshot,
  };

  const previousReviewStatus = normalizeProjectPipelineReviewStatus(
    existingJob?.reviewStatus ?? ''
  );
  const nextReviewStatus = normalizeProjectPipelineReviewStatus(jobWithSheet.reviewStatus);
  const reviewStatusChanged = previousReviewStatus !== nextReviewStatus;
  const reviewFeedbackNote =
    typeof body.reviewFeedbackNote === 'string' ? body.reviewFeedbackNote.trim() : '';

    if (reviewStatusChanged && canAddProjectPipelineReviewerFeedback(jobWithSheet, editUser.displayName, { isAdmin })) {
    if (isProjectPipelineReviewStatusChangesRequested(nextReviewStatus) && !reviewFeedbackNote) {
      return NextResponse.json(
        { error: 'A note is required when requesting changes', message: 'A note is required when requesting changes' },
        { status: 400 }
      );
    }

    const noteForEntry =
      reviewFeedbackNote ||
      (isProjectPipelineReviewStatusApproved(nextReviewStatus)
        ? getReviewStatusDropdownLabel(nextReviewStatus)
        : '');

    if (noteForEntry) {
      jobWithSheet.reviewNotes = appendProjectPipelineReviewNote(jobWithSheet.reviewNotes ?? [], {
        type: 'review_feedback',
        note: noteForEntry,
        reviewStatus: nextReviewStatus,
        createdByEmail: viewerEmail ?? '',
        createdByDisplayName: editUser.displayName ?? viewerEmail ?? 'Reviewer',
      });
    }
  }

  if (existingJob) {
    try {
      assertProjectPipelineJobFieldEditsAllowed(
        existingJob,
        jobWithSheet,
        editUser.displayName,
        { isAdmin }
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Forbidden field change',
          message: error instanceof Error ? error.message : 'Forbidden field change',
        },
        { status: 403 }
      );
    }
  }

  const jobForMirror =
    job.projectStatusManual || job.uiSourceOfTruth
      ? {
          ...jobWithSheet,
          projectStatus: job.projectStatus,
          projectStatusManual: Boolean(job.projectStatusManual),
        }
      : withDerivedProjectPipelineProjectStatus(jobWithSheet);

  try {
    const savedJob = await upsertProjectPipelineJobMirror(supabase, jobForMirror, {
      sheetId,
      sheetName,
    });

    const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
    notifyPipelineJobChangesAsync({
      existingJob,
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
      existingJob,
      action: 'job_updated',
      actorUserId: auth.session.user.id,
      actorEmail: auth.session.user.email,
      actorDisplayName: editUser.displayName ?? auth.session.user.email ?? 'Unknown user',
      managedUsers,
    });

    return NextResponse.json({
      success: true,
      job: filterProjectPipelineJobReviewNotesForViewer(savedJob, {
        displayName: editUser.displayName,
        isAdmin,
      }),
    });
  } catch (error) {
    console.error('[project-pipeline/jobs] update failed', error);
    return NextResponse.json(
      {
        error: 'Failed to save project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth(async (request: NextRequest, auth) => {
  let body: { job?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobPayload(body.job)) {
    return NextResponse.json({ error: 'Invalid job payload' }, { status: 400 });
  }

  const job = normalizeUiCreatedProjectPipelineJobPayload(body.job);
  const sheetName = resolveProjectPipelineSheetTab(job.pipelineSheetName);
  const managedUser = await getManagedUser(auth.session.user.id);
  const viewerDisplayName = managedUser?.display_name ?? null;

  if (!canDeleteProjectPipelineJob(managedUser)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Only admins can delete projects' },
      { status: 403 }
    );
  }

  const supabase = createServerClient();
  const sheetId = getProjectPipelineSheetId();

  const existingJob = await fetchProjectPipelineJobByJobNumber(supabase, {
    sheetId,
    sheetName,
    jobNumber: job.jobNumber,
  });

  if (!existingJob) {
    return NextResponse.json(
      { error: 'Not found', message: `Job ${job.jobNumber.trim()} was not found` },
      { status: 404 }
    );
  }

  try {
    const deleted = await deleteProjectPipelineJobMirror(supabase, {
      sheetId,
      sheetName,
      jobNumber: job.jobNumber,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Not found', message: `Job ${job.jobNumber.trim()} was not found` },
        { status: 404 }
      );
    }

    const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
    recordProjectPipelineJobActivityAsync({
      supabase,
      sheetId,
      sheetName,
      job: existingJob,
      existingJob,
      action: 'job_deleted',
      actorUserId: auth.session.user.id,
      actorEmail: auth.session.user.email,
      actorDisplayName: viewerDisplayName ?? auth.session.user.email ?? 'Unknown user',
      managedUsers,
    });

    return NextResponse.json({ success: true, jobNumber: job.jobNumber.trim() });
  } catch (error) {
    console.error('[project-pipeline/jobs] delete failed', error);
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
