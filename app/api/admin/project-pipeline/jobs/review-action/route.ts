import { NextRequest, NextResponse } from 'next/server';
import { getManagedUser } from '@/lib/auth-helpers';
import { canViewAllPipelineJobs } from '@/lib/managed-users-pipeline';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { resolveProjectPipelineEditUser } from '@/lib/project-pipeline/author-preview';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import {
  fetchProjectPipelineJobByJobNumber,
  upsertProjectPipelineJobMirror,
} from '@/lib/project-pipeline/fetch-from-supabase';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import { canEditProjectPipelineJob } from '@/lib/project-pipeline/resolve-job-for-edit';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  applyProjectPipelineReviewAction,
  filterProjectPipelineJobReviewNotesForViewer,
  isProjectPipelineReviewStatusApproved,
} from '@/lib/project-pipeline/review-workflow';
import {
  PROJECT_PIPELINE_REVIEW_NOTE_TYPES,
  type ProjectPipelineReviewNoteType,
} from '@/lib/project-pipeline/review-notes';
import { getReviewStatusDropdownLabel } from '@/lib/project-pipeline/review-status';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import { notifyPipelineJobChangesAsync } from '@/lib/project-pipeline/notifications/notify-pipeline-job-change';
import { recordReviewActionActivityAsync } from '@/lib/project-pipeline/activity/record-activity';

export const dynamic = 'force-dynamic';

function isProjectPipelineJobRef(value: unknown): value is ProjectPipelineJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as ProjectPipelineJob;
  return typeof job.jobNumber === 'string' && job.jobNumber.trim().length > 0;
}

function isReviewAction(value: unknown): value is ProjectPipelineReviewNoteType {
  return (
    typeof value === 'string' &&
    (PROJECT_PIPELINE_REVIEW_NOTE_TYPES as readonly string[]).includes(value)
  );
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  let body: {
    job?: unknown;
    action?: unknown;
    note?: unknown;
    reviewStatus?: unknown;
    previewAsDisplayName?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobRef(body.job) || !isReviewAction(body.action)) {
    return NextResponse.json({ error: 'Invalid review action payload' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note : '';
  const reviewStatus = typeof body.reviewStatus === 'string' ? body.reviewStatus : undefined;
  const jobRef = body.job;
  const sheetName = resolveProjectPipelineSheetTab(jobRef.pipelineSheetName);
  const managedUser = await getManagedUser(auth.session.user.id);
  const viewerDisplayName = managedUser?.display_name ?? null;
  const viewerEmail = auth.session.user.email ?? '';
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
    jobNumber: jobRef.jobNumber,
  });

  if (!existingJob) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (
    !canEditProjectPipelineJob({
      job: jobRef,
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
    const updatedJob = applyProjectPipelineReviewAction({
      job: {
        ...existingJob,
        pipelineSheetName: sheetName,
      },
      action: body.action,
      note,
      reviewStatus,
      actorEmail: viewerEmail,
      actorDisplayName: editUser.displayName ?? viewerEmail,
      managedUser,
    });

    const savedJob = await upsertProjectPipelineJobMirror(supabase, updatedJob, {
      sheetId,
      sheetName,
    });

    const managedUsers = await loadActiveManagedUsersForPipeline(supabase);
    const trimmedNote = note.trim();
    const normalizedReviewStatus =
      typeof reviewStatus === 'string' ? reviewStatus.trim() : '';
    const reviewActionNote =
      trimmedNote ||
      (body.action === 'review_feedback' &&
      normalizedReviewStatus &&
      isProjectPipelineReviewStatusApproved(normalizedReviewStatus)
        ? getReviewStatusDropdownLabel(normalizedReviewStatus)
        : undefined);

    notifyPipelineJobChangesAsync({
      existingJob,
      savedJob,
      actorEmail: viewerEmail,
      actorDisplayName: editUser.displayName ?? viewerEmail,
      managedUsers,
      reviewAction: body.action,
      reviewActionNote,
    });

    recordReviewActionActivityAsync({
      supabase,
      sheetId,
      sheetName,
      existingJob,
      savedJob,
      reviewAction: body.action,
      note,
      actorUserId: auth.session.user.id,
      actorEmail: viewerEmail,
      actorDisplayName: editUser.displayName ?? viewerEmail,
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
    const message = error instanceof Error ? error.message : 'Review action failed';
    const status = message.includes('cannot') || message.includes('required') ? 403 : 500;
    return NextResponse.json({ error: message, message }, { status });
  }
});
