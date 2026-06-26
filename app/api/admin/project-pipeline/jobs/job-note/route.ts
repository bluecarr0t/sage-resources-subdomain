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
import { appendProjectPipelineJobNote } from '@/lib/project-pipeline/job-notes';
import { filterProjectPipelineJobReviewNotesForViewer } from '@/lib/project-pipeline/review-workflow';

export const dynamic = 'force-dynamic';

function isProjectPipelineJobRef(value: unknown): value is ProjectPipelineJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as ProjectPipelineJob;
  return typeof job.jobNumber === 'string' && job.jobNumber.trim().length > 0;
}

export const POST = withAdminAuth(async (request: NextRequest, auth) => {
  let body: {
    job?: unknown;
    note?: unknown;
    previewAsDisplayName?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isProjectPipelineJobRef(body.job)) {
    return NextResponse.json({ error: 'Invalid job reference' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note) {
    return NextResponse.json(
      { error: 'Note is required', message: 'Note is required' },
      { status: 400 }
    );
  }

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
    const updatedJob: ProjectPipelineJob = {
      ...existingJob,
      pipelineSheetName: sheetName,
      jobNotes: appendProjectPipelineJobNote(existingJob.jobNotes ?? [], {
        note,
        createdByEmail: viewerEmail,
        createdByDisplayName: editUser.displayName ?? viewerEmail,
      }),
    };

    const savedJob = await upsertProjectPipelineJobMirror(supabase, updatedJob, {
      sheetId,
      sheetName,
    });

    return NextResponse.json({
      success: true,
      job: filterProjectPipelineJobReviewNotesForViewer(savedJob, {
        displayName: editUser.displayName,
        isAdmin,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add note';
    return NextResponse.json({ error: message, message }, { status: 500 });
  }
});
