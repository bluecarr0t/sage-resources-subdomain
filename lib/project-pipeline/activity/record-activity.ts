import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectPipelineReviewNoteType } from '@/lib/project-pipeline/review-notes';
import { detectProjectPipelineActivityChanges } from '@/lib/project-pipeline/activity/detect-activity-changes';
import { getProjectPipelineActivityFieldLabel } from '@/lib/project-pipeline/activity/field-labels';
import { resolveProjectPipelineActivityVisibleEmails } from '@/lib/project-pipeline/activity/visible-to-emails';
import type {
  ProjectPipelineActivityAction,
  ProjectPipelineActivityChange,
} from '@/lib/project-pipeline/activity/types';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export const PROJECT_PIPELINE_JOB_ACTIVITY_TABLE = 'project_pipeline_job_activity';

export type RecordProjectPipelineJobActivityInput = {
  supabase: SupabaseClient;
  sheetId: string;
  sheetName: string;
  job: ProjectPipelineJob;
  action: ProjectPipelineActivityAction;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorDisplayName: string;
  existingJob?: ProjectPipelineJob | null;
  changes?: ProjectPipelineActivityChange[];
  metadata?: Record<string, unknown>;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
};

export async function recordProjectPipelineJobActivity(
  input: RecordProjectPipelineJobActivityInput
): Promise<void> {
  const changes =
    input.changes ??
    (input.action === 'job_created'
      ? []
      : detectProjectPipelineActivityChanges(input.existingJob, input.job));

  if (input.action === 'job_updated' && !changes.length) {
    return;
  }

  const visibleToEmails = resolveProjectPipelineActivityVisibleEmails({
    job: input.job,
    actorEmail: input.actorEmail,
    managedUsers: input.managedUsers,
  });

  const { error } = await input.supabase.from(PROJECT_PIPELINE_JOB_ACTIVITY_TABLE).insert({
    sheet_id: input.sheetId,
    sheet_name: input.sheetName,
    job_number: input.job.jobNumber,
    client: input.job.client ?? '',
    appraiser_consultant: input.job.appraiserConsultant ?? '',
    proj_mgr: input.job.projMgr ?? '',
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail?.trim() ?? '',
    actor_display_name: input.actorDisplayName.trim() || 'Unknown user',
    changes,
    metadata: input.metadata ?? {},
    visible_to_emails: visibleToEmails,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function buildReviewActionActivityChanges(input: {
  previousStatus: string;
  newStatus: string;
}): ProjectPipelineActivityChange[] {
  return [
    {
      field: 'reviewStatus',
      label: getProjectPipelineActivityFieldLabel('reviewStatus'),
      previousValue: input.previousStatus,
      newValue: input.newStatus,
    },
  ];
}

export function recordProjectPipelineJobActivityAsync(
  input: RecordProjectPipelineJobActivityInput
): void {
  void recordProjectPipelineJobActivity(input).catch((error) => {
    console.error('[project-pipeline-activity] record failed:', error);
  });
}

export function recordReviewActionActivityAsync(input: {
  supabase: SupabaseClient;
  sheetId: string;
  sheetName: string;
  existingJob: ProjectPipelineJob;
  savedJob: ProjectPipelineJob;
  reviewAction: ProjectPipelineReviewNoteType;
  note?: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorDisplayName: string;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
}): void {
  recordProjectPipelineJobActivityAsync({
    supabase: input.supabase,
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    job: input.savedJob,
    existingJob: input.existingJob,
    action: 'review_action',
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorDisplayName: input.actorDisplayName,
    managedUsers: input.managedUsers,
    changes: buildReviewActionActivityChanges({
      previousStatus: input.existingJob.reviewStatus,
      newStatus: input.savedJob.reviewStatus,
    }),
    metadata: {
      reviewAction: input.reviewAction,
      note: input.note?.trim() || null,
    },
  });
}
