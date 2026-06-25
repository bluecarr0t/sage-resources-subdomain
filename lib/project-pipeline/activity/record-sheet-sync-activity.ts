import type { SupabaseClient } from '@supabase/supabase-js';
import { detectProjectPipelineActivityChanges } from '@/lib/project-pipeline/activity/detect-activity-changes';
import { PROJECT_PIPELINE_JOB_ACTIVITY_TABLE } from '@/lib/project-pipeline/activity/record-activity';
import type {
  ProjectPipelineActivityAction,
  ProjectPipelineActivityChange,
} from '@/lib/project-pipeline/activity/types';
import { resolveProjectPipelineActivityVisibleEmails } from '@/lib/project-pipeline/activity/visible-to-emails';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export const PROJECT_PIPELINE_SHEET_SYNC_ACTOR_DISPLAY_NAME = 'Google Sheets';

const ACTIVITY_INSERT_BATCH_SIZE = 50;

type SheetSyncRemovedJob = Pick<
  ProjectPipelineJob,
  'jobNumber' | 'client' | 'appraiserConsultant' | 'projMgr'
>;

type SheetSyncActivityRow = {
  sheet_id: string;
  sheet_name: string;
  job_number: string;
  client: string;
  appraiser_consultant: string;
  proj_mgr: string;
  action: ProjectPipelineActivityAction;
  actor_user_id: null;
  actor_email: string;
  actor_display_name: string;
  changes: ProjectPipelineActivityChange[];
  metadata: { source: 'sheet_sync'; syncRunId: string };
  visible_to_emails: string[];
};

function buildSheetSyncActivityRow(input: {
  sheetId: string;
  sheetName: string;
  job: Pick<ProjectPipelineJob, 'jobNumber' | 'client' | 'appraiserConsultant' | 'projMgr'>;
  action: Extract<
    ProjectPipelineActivityAction,
    'sheet_sync_created' | 'sheet_sync_updated' | 'sheet_sync_removed'
  >;
  changes: ProjectPipelineActivityChange[];
  syncRunId: string;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
}): SheetSyncActivityRow {
  return {
    sheet_id: input.sheetId,
    sheet_name: input.sheetName,
    job_number: input.job.jobNumber,
    client: input.job.client ?? '',
    appraiser_consultant: input.job.appraiserConsultant ?? '',
    proj_mgr: input.job.projMgr ?? '',
    action: input.action,
    actor_user_id: null,
    actor_email: '',
    actor_display_name: PROJECT_PIPELINE_SHEET_SYNC_ACTOR_DISPLAY_NAME,
    changes: input.changes,
    metadata: { source: 'sheet_sync', syncRunId: input.syncRunId },
    visible_to_emails: resolveProjectPipelineActivityVisibleEmails({
      job: input.job,
      actorEmail: null,
      managedUsers: input.managedUsers,
    }),
  };
}

export function buildProjectPipelineSheetSyncActivityRows(input: {
  sheetId: string;
  sheetName: string;
  syncRunId: string;
  previousJobsByNumber: ReadonlyMap<string, ProjectPipelineJob>;
  syncedJobs: readonly ProjectPipelineJob[];
  removedJobs: readonly SheetSyncRemovedJob[];
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
}): SheetSyncActivityRow[] {
  const rows: SheetSyncActivityRow[] = [];

  for (const syncedJob of input.syncedJobs) {
    const jobNumber = syncedJob.jobNumber.trim();
    if (!jobNumber) continue;

    const existing = input.previousJobsByNumber.get(jobNumber);
    if (!existing) {
      rows.push(
        buildSheetSyncActivityRow({
          sheetId: input.sheetId,
          sheetName: input.sheetName,
          job: syncedJob,
          action: 'sheet_sync_created',
          changes: [],
          syncRunId: input.syncRunId,
          managedUsers: input.managedUsers,
        })
      );
      continue;
    }

    const changes = detectProjectPipelineActivityChanges(existing, syncedJob);
    if (!changes.length) continue;

    rows.push(
      buildSheetSyncActivityRow({
        sheetId: input.sheetId,
        sheetName: input.sheetName,
        job: syncedJob,
        action: 'sheet_sync_updated',
        changes,
        syncRunId: input.syncRunId,
        managedUsers: input.managedUsers,
      })
    );
  }

  for (const removedJob of input.removedJobs) {
    const jobNumber = removedJob.jobNumber.trim();
    if (!jobNumber) continue;

    rows.push(
      buildSheetSyncActivityRow({
        sheetId: input.sheetId,
        sheetName: input.sheetName,
        job: removedJob,
        action: 'sheet_sync_removed',
        changes: [],
        syncRunId: input.syncRunId,
        managedUsers: input.managedUsers,
      })
    );
  }

  return rows;
}

async function insertSheetSyncActivityRows(
  supabase: SupabaseClient,
  rows: readonly SheetSyncActivityRow[]
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += ACTIVITY_INSERT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + ACTIVITY_INSERT_BATCH_SIZE);
    const { error } = await supabase.from(PROJECT_PIPELINE_JOB_ACTIVITY_TABLE).insert(batch);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function recordProjectPipelineSheetSyncActivity(input: {
  supabase: SupabaseClient;
  sheetId: string;
  sheetName: string;
  syncRunId: string;
  previousJobsByNumber: ReadonlyMap<string, ProjectPipelineJob>;
  syncedJobs: readonly ProjectPipelineJob[];
  removedJobs: readonly SheetSyncRemovedJob[];
  managedUsers?: readonly ManagedUserWorkloadAuthorRow[];
}): Promise<{ recorded: number }> {
  const managedUsers = input.managedUsers ?? (await loadActiveManagedUsersForPipeline(input.supabase));
  const rows = buildProjectPipelineSheetSyncActivityRows({
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    syncRunId: input.syncRunId,
    previousJobsByNumber: input.previousJobsByNumber,
    syncedJobs: input.syncedJobs,
    removedJobs: input.removedJobs,
    managedUsers,
  });

  if (!rows.length) {
    return { recorded: 0 };
  }

  await insertSheetSyncActivityRows(input.supabase, rows);
  return { recorded: rows.length };
}

export async function recordProjectPipelineSheetSyncActivitySafe(
  input: Parameters<typeof recordProjectPipelineSheetSyncActivity>[0]
): Promise<void> {
  try {
    await recordProjectPipelineSheetSyncActivity(input);
  } catch (error) {
    console.error('[project-pipeline-activity] sheet sync record failed:', error);
  }
}
