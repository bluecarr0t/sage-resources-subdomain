import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getProjectPipelineAuthMode, isProjectPipelineConfigured } from './auth';
import {
  getProjectPipelineSheetId,
  fetchProjectPipelineJobs,
} from './fetch-jobs';
import {
  PROJECT_PIPELINE_JOBS_TABLE,
  PROJECT_PIPELINE_SYNC_RUNS_TABLE,
  projectPipelineJobToDbRow,
  projectPipelineJobToSheetSyncDbRow,
} from './db-row';
import {
  fetchProjectPipelineJobsFromSupabase,
  fetchProjectPipelineStoredStatusMap,
  fetchProjectPipelineUiEditedJobsMap,
} from './fetch-from-supabase';
import { recordProjectPipelineSheetSyncActivitySafe } from './activity/record-sheet-sync-activity';
import { resolveSheetSyncProjectPipelineJob } from './resolve-sheet-sync-job';
import { isStickyProjectPipelineProjectStatus } from './project-status';
import {
  PROJECT_PIPELINE_SHEET_TABS,
  parseProjectPipelineSheetYear,
  type ProjectPipelineSheetTab,
} from './sheet-tabs';

const UPSERT_BATCH_SIZE = 100;

export type SyncProjectPipelineToSupabaseResult = {
  syncRunId: string;
  sheetId: string;
  sheetName: string;
  jobsFetched: number;
  jobsUpserted: number;
  jobsRemoved: number;
  lastSyncedAt: string;
};

export type SyncAllProjectPipelineSheetsResult = {
  sheetId: string;
  sheets: SyncProjectPipelineToSupabaseResult[];
  totalJobsFetched: number;
  totalJobsUpserted: number;
  totalJobsRemoved: number;
};

export function assertProjectPipelineCronSyncConfigured(
  env: NodeJS.ProcessEnv = process.env
): void {
  if (getProjectPipelineAuthMode(env) !== 'service_account') {
    throw new Error(
      'Project pipeline cron sync requires Google service account credentials (GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). OAuth-only setup cannot run server-side sync.'
    );
  }
}

export async function syncProjectPipelineSheetToSupabase(
  supabase: SupabaseClient,
  sheetName: ProjectPipelineSheetTab,
  options: { env?: NodeJS.ProcessEnv; accessToken?: string } = {}
): Promise<SyncProjectPipelineToSupabaseResult> {
  const env = options.env ?? process.env;
  const accessToken = options.accessToken?.trim();

  if (accessToken) {
    if (!isProjectPipelineConfigured(env)) {
      throw new Error('Project pipeline is not configured');
    }
  } else {
    assertProjectPipelineCronSyncConfigured(env);
  }

  const sheetId = getProjectPipelineSheetId(env);
  const syncRunId = randomUUID();
  const syncedAt = new Date().toISOString();
  const sheetYear = parseProjectPipelineSheetYear(sheetName);

  const { data: runRow, error: runInsertError } = await supabase
    .from(PROJECT_PIPELINE_SYNC_RUNS_TABLE)
    .insert({
      id: syncRunId,
      sheet_id: sheetId,
      sheet_name: sheetName,
      started_at: syncedAt,
    })
    .select('id')
    .single();

  if (runInsertError) {
    throw new Error(`Failed to create sync run: ${runInsertError.message}`);
  }

  const runId = runRow.id as string;

  try {
    const { jobs } = await fetchProjectPipelineJobs({
      env,
      sheetName,
      accessToken,
      bypassCache: true,
    });
    const storedStatusByJobNumber = await fetchProjectPipelineStoredStatusMap(supabase, {
      sheetId,
      sheetName,
      env,
    });
    const uiEditedByJobNumber = await fetchProjectPipelineUiEditedJobsMap(supabase, {
      sheetId,
      sheetName,
      env,
    });
    const existingJobs = await fetchProjectPipelineJobsFromSupabase(supabase, {
      sheetId,
      sheetName,
      env,
    });
    const previousJobsByNumber = new Map(
      existingJobs
        .map((job) => [job.jobNumber.trim(), job] as const)
        .filter(([jobNumber]) => Boolean(jobNumber))
    );
    const sheetSyncContext = {
      sheetName,
      sheetYear,
      storedStatusByJobNumber,
      uiEditedByJobNumber,
    };
    const syncedJobs = jobs
      .filter((job) => job.jobNumber.trim())
      .map((job) => resolveSheetSyncProjectPipelineJob({ sheetJob: job, ...sheetSyncContext }));
    const rows = syncedJobs.map((job) => {
      const jobNumber = job.jobNumber.trim();
      const uiEdited = uiEditedByJobNumber.get(jobNumber);
      if (uiEdited) {
        return projectPipelineJobToDbRow(job, {
          sheetId,
          sheetName,
          syncRunId: runId,
          syncedAt,
          sheetYear,
        });
      }

      const stored = storedStatusByJobNumber.get(jobNumber);
      if (
        stored?.projectStatusManual ||
        isStickyProjectPipelineProjectStatus(stored?.projectStatus)
      ) {
        return projectPipelineJobToDbRow(job, {
          sheetId,
          sheetName,
          syncRunId: runId,
          syncedAt,
          sheetYear,
        });
      }

      return projectPipelineJobToSheetSyncDbRow(job, {
        sheetId,
        sheetName,
        syncRunId: runId,
        syncedAt,
        sheetYear,
      });
    });

    let jobsUpserted = 0;

    for (let offset = 0; offset < rows.length; offset += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + UPSERT_BATCH_SIZE);
      const { error } = await supabase
        .from(PROJECT_PIPELINE_JOBS_TABLE)
        .upsert(batch, { onConflict: 'sheet_id,sheet_name,job_number' });

      if (error) {
        throw new Error(`Upsert batch failed for ${sheetName}: ${error.message}`);
      }

      jobsUpserted += batch.length;
    }

    const { data: removedRows, error: deleteError } = await supabase
      .from(PROJECT_PIPELINE_JOBS_TABLE)
      .delete()
      .eq('sheet_id', sheetId)
      .eq('sheet_name', sheetName)
      .eq('ui_source_of_truth', false)
      .neq('last_sync_run_id', runId)
      .select('job_number, client, appraiser_consultant, proj_mgr');

    if (deleteError) {
      throw new Error(`Stale row cleanup failed for ${sheetName}: ${deleteError.message}`);
    }

    const jobsRemoved = removedRows?.length ?? 0;

    await recordProjectPipelineSheetSyncActivitySafe({
      supabase,
      sheetId,
      sheetName,
      syncRunId: runId,
      previousJobsByNumber,
      syncedJobs,
      removedJobs: (removedRows ?? []).map((row) => ({
        jobNumber: String(row.job_number ?? ''),
        client: String(row.client ?? ''),
        appraiserConsultant: String(row.appraiser_consultant ?? ''),
        projMgr: String(row.proj_mgr ?? ''),
      })),
    });

    const lastSyncedAt = new Date().toISOString();

    const { error: runUpdateError } = await supabase
      .from(PROJECT_PIPELINE_SYNC_RUNS_TABLE)
      .update({
        completed_at: lastSyncedAt,
        jobs_fetched: jobs.length,
        jobs_upserted: jobsUpserted,
        jobs_removed: jobsRemoved,
      })
      .eq('id', runId);

    if (runUpdateError) {
      throw new Error(`Failed to finalize sync run: ${runUpdateError.message}`);
    }

    return {
      syncRunId: runId,
      sheetId,
      sheetName,
      jobsFetched: jobs.length,
      jobsUpserted,
      jobsRemoved,
      lastSyncedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from(PROJECT_PIPELINE_SYNC_RUNS_TABLE)
      .update({
        completed_at: new Date().toISOString(),
        error: message,
      })
      .eq('id', runId);

    throw error;
  }
}

export async function syncAllProjectPipelineSheetsToSupabase(
  supabase: SupabaseClient,
  options: { env?: NodeJS.ProcessEnv; accessToken?: string } = {}
): Promise<SyncAllProjectPipelineSheetsResult> {
  const env = options.env ?? process.env;
  const sheetId = getProjectPipelineSheetId(env);
  const sheets: SyncProjectPipelineToSupabaseResult[] = [];

  for (const sheetName of PROJECT_PIPELINE_SHEET_TABS) {
    sheets.push(
      await syncProjectPipelineSheetToSupabase(supabase, sheetName, {
        env,
        accessToken: options.accessToken,
      })
    );
  }

  return {
    sheetId,
    sheets,
    totalJobsFetched: sheets.reduce((sum, sheet) => sum + sheet.jobsFetched, 0),
    totalJobsUpserted: sheets.reduce((sum, sheet) => sum + sheet.jobsUpserted, 0),
    totalJobsRemoved: sheets.reduce((sum, sheet) => sum + sheet.jobsRemoved, 0),
  };
}

/** @deprecated Use syncProjectPipelineSheetToSupabase or syncAllProjectPipelineSheetsToSupabase */
export async function syncProjectPipelineToSupabase(
  supabase: SupabaseClient,
  options: { env?: NodeJS.ProcessEnv; sheetName?: ProjectPipelineSheetTab } = {}
): Promise<SyncProjectPipelineToSupabaseResult> {
  const { getProjectPipelineSheetName } = await import('./fetch-jobs');
  const { resolveProjectPipelineSheetTab } = await import('./sheet-tabs');
  const sheetName = resolveProjectPipelineSheetTab(
    options.sheetName ?? getProjectPipelineSheetName(options.env)
  );
  return syncProjectPipelineSheetToSupabase(supabase, sheetName, options);
}
