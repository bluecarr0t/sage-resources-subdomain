import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PROJECT_PIPELINE_JOBS_TABLE,
  PROJECT_PIPELINE_SYNC_RUNS_TABLE,
  projectPipelineJobFromDbRow,
  projectPipelineJobToDbRow,
  resolveProjectPipelineStoredStatusFromDbFields,
  type ProjectPipelineJobDbRow,
} from './db-row';
import { getProjectPipelineSheetId } from './fetch-jobs';
import { parseProjectPipelineSheetYear, PROJECT_PIPELINE_SHEET_TABS } from './sheet-tabs';
import { withDerivedProjectPipelineProjectStatus } from './derive-project-status';
import { mergeSheetJobWithUiEditedJob } from './merge-sheet-ui-job';
import { normalizeProjectPipelineProjectStatus, isStickyProjectPipelineProjectStatus } from './project-status';
import { normalizeProjectPipelineFlag } from './project-flag';
import { resolveProjectPipelineJobNotes, type ProjectPipelineJobNote } from './job-notes';
import { parseProjectPipelineReviewNotes, type ProjectPipelineReviewNote } from './review-notes';
import type { ProjectPipelineJob } from './types';
import { fetchAllSupabasePages } from './supabase-pagination';

export async function countProjectPipelineJobsInSupabase(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string }
): Promise<number> {
  const { count, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName);

  if (error) {
    throw new Error(`Failed to count pipeline jobs in Supabase: ${error.message}`);
  }

  return count ?? 0;
}

export async function countAllProjectPipelineJobsInSupabase(
  supabase: SupabaseClient,
  input: { sheetId: string }
): Promise<number> {
  const { count, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', input.sheetId);

  if (error) {
    throw new Error(`Failed to count all pipeline jobs in Supabase: ${error.message}`);
  }

  return count ?? 0;
}

export type ProjectPipelineLastSyncRun = {
  jobs_fetched: number;
  completed_at: string;
};

/** True when a cron sync has populated the mirror with the expected row count. */
export function isProjectPipelineSupabaseMirrorComplete(
  mirroredCount: number,
  lastSuccessfulSyncRun: ProjectPipelineLastSyncRun | null | undefined
): boolean {
  if (mirroredCount <= 0 || !lastSuccessfulSyncRun) return false;

  const jobsFetched = lastSuccessfulSyncRun.jobs_fetched;
  if (!Number.isFinite(jobsFetched) || jobsFetched <= 0) return false;

  return mirroredCount >= jobsFetched;
}

export async function fetchProjectPipelineLastSuccessfulSyncRun(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string }
): Promise<ProjectPipelineLastSyncRun | null> {
  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_SYNC_RUNS_TABLE)
    .select('jobs_fetched, completed_at')
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .not('completed_at', 'is', null)
    .is('error', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[project-pipeline] Failed to load last sync run', error);
    return null;
  }

  if (
    !data ||
    typeof data.jobs_fetched !== 'number' ||
    typeof data.completed_at !== 'string'
  ) {
    return null;
  }

  return { jobs_fetched: data.jobs_fetched, completed_at: data.completed_at };
}

export async function fetchProjectPipelineLastSuccessfulSyncRunAnyTab(
  supabase: SupabaseClient,
  input: { sheetId: string }
): Promise<ProjectPipelineLastSyncRun | null> {
  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_SYNC_RUNS_TABLE)
    .select('jobs_fetched, completed_at')
    .eq('sheet_id', input.sheetId)
    .not('completed_at', 'is', null)
    .is('error', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[project-pipeline] Failed to load last sync run (any tab)', error);
    return null;
  }

  if (
    !data ||
    typeof data.jobs_fetched !== 'number' ||
    typeof data.completed_at !== 'string'
  ) {
    return null;
  }

  return { jobs_fetched: data.jobs_fetched, completed_at: data.completed_at };
}

export async function shouldUseProjectPipelineSupabaseMirror(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; mirroredCount: number }
): Promise<boolean> {
  const lastSyncRun = await fetchProjectPipelineLastSuccessfulSyncRun(supabase, {
    sheetId: input.sheetId,
    sheetName: input.sheetName,
  });

  return isProjectPipelineSupabaseMirrorComplete(input.mirroredCount, lastSyncRun);
}

export async function isProjectPipelineMirrorIncompleteForSheet(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string }
): Promise<boolean> {
  const mirroredCount = await countProjectPipelineJobsInSupabase(supabase, input);
  if (mirroredCount <= 0) return false;
  return !(await shouldUseProjectPipelineSupabaseMirror(supabase, {
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    mirroredCount,
  }));
}

export async function isAnyProjectPipelineMirrorIncomplete(
  supabase: SupabaseClient,
  input: { sheetId: string }
): Promise<boolean> {
  for (const sheetName of PROJECT_PIPELINE_SHEET_TABS) {
    if (await isProjectPipelineMirrorIncompleteForSheet(supabase, { sheetId: input.sheetId, sheetName })) {
      return true;
    }
  }
  return false;
}

export async function fetchProjectPipelineJobsFromSupabase(
  supabase: SupabaseClient,
  input: { sheetId?: string; sheetName: string; env?: NodeJS.ProcessEnv }
): Promise<ProjectPipelineJob[]> {
  const sheetId = input.sheetId ?? getProjectPipelineSheetId(input.env);

  const rows = await fetchAllSupabasePages<ProjectPipelineJobDbRow>(({ from, to }) =>
    supabase
      .from(PROJECT_PIPELINE_JOBS_TABLE)
      .select('*')
      .eq('sheet_id', sheetId)
      .eq('sheet_name', input.sheetName)
      .order('sheet_row_index', { ascending: true })
      .range(from, to)
  );

  return rows.map(projectPipelineJobFromDbRow);
}

export async function fetchAllProjectPipelineJobsFromSupabase(
  supabase: SupabaseClient,
  input: { sheetId?: string; env?: NodeJS.ProcessEnv }
): Promise<ProjectPipelineJob[]> {
  const sheetId = input.sheetId ?? getProjectPipelineSheetId(input.env);

  const rows = await fetchAllSupabasePages<ProjectPipelineJobDbRow>(({ from, to }) =>
    supabase
      .from(PROJECT_PIPELINE_JOBS_TABLE)
      .select('*')
      .eq('sheet_id', sheetId)
      .order('sheet_name', { ascending: true })
      .order('sheet_row_index', { ascending: true })
      .range(from, to)
  );

  return rows.map(projectPipelineJobFromDbRow);
}

export async function fetchProjectPipelineJobByJobNumber(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; jobNumber: string }
): Promise<ProjectPipelineJob | null> {
  const jobNumber = input.jobNumber.trim();
  if (!jobNumber) return null;

  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .select('*')
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .eq('job_number', jobNumber)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return projectPipelineJobFromDbRow(data as ProjectPipelineJobDbRow);
}

export type ProjectPipelineStoredStatus = {
  projectStatus: string;
  projectStatusManual: boolean;
  flag: string;
  jobNotes: ProjectPipelineJobNote[];
  reviewNotes: ProjectPipelineReviewNote[];
};

export async function fetchProjectPipelineStoredStatusMap(
  supabase: SupabaseClient,
  input: { sheetId?: string; sheetName: string; env?: NodeJS.ProcessEnv }
): Promise<Map<string, ProjectPipelineStoredStatus>> {
  const sheetId = input.sheetId ?? getProjectPipelineSheetId(input.env);

  let rows: {
    job_number: string;
    project_status: string | null;
    project_status_manual: boolean | null;
    flag: string | null;
    notes: string | null;
    job_notes: unknown;
    review_notes: unknown;
  }[];

  try {
    rows = await fetchAllSupabasePages(({ from, to }) =>
      supabase
        .from(PROJECT_PIPELINE_JOBS_TABLE)
        .select('job_number, project_status, project_status_manual, flag, notes, job_notes, review_notes')
        .eq('sheet_id', sheetId)
        .eq('sheet_name', input.sheetName)
        .range(from, to)
    );
  } catch (error) {
    console.warn('[project-pipeline] Failed to load stored project statuses from Supabase', error);
    return new Map();
  }

  const statusByJobNumber = new Map<string, ProjectPipelineStoredStatus>();
  for (const row of rows) {
    const jobNumber = typeof row.job_number === 'string' ? row.job_number.trim() : '';
    if (!jobNumber) continue;
    statusByJobNumber.set(jobNumber, {
      ...resolveProjectPipelineStoredStatusFromDbFields({
        project_status: row.project_status as string | null | undefined,
        project_status_manual: row.project_status_manual as boolean | null | undefined,
        flag: row.flag as string | null | undefined,
      }),
      flag: normalizeProjectPipelineFlag(row.flag as string | null | undefined),
      jobNotes: resolveProjectPipelineJobNotes(
        row.job_notes,
        typeof row.notes === 'string' ? row.notes : ''
      ),
      reviewNotes: parseProjectPipelineReviewNotes(row.review_notes),
    });
  }

  return statusByJobNumber;
}

/** @deprecated Use fetchProjectPipelineStoredStatusMap */
export async function fetchProjectPipelineProjectStatusMap(
  supabase: SupabaseClient,
  input: { sheetId?: string; sheetName: string; env?: NodeJS.ProcessEnv }
): Promise<Map<string, string>> {
  const stored = await fetchProjectPipelineStoredStatusMap(supabase, input);
  const statusByJobNumber = new Map<string, string>();
  for (const [jobNumber, value] of stored) {
    statusByJobNumber.set(jobNumber, value.projectStatus);
  }
  return statusByJobNumber;
}

async function fetchProjectPipelineStoredStatusForJob(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; jobNumber: string }
): Promise<ProjectPipelineStoredStatus | null> {
  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .select('project_status, project_status_manual, flag, notes, job_notes, review_notes')
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .eq('job_number', input.jobNumber)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...resolveProjectPipelineStoredStatusFromDbFields({
      project_status: data.project_status as string | null | undefined,
      project_status_manual: data.project_status_manual as boolean | null | undefined,
      flag: data.flag as string | null | undefined,
    }),
    flag: normalizeProjectPipelineFlag(data.flag as string | null | undefined),
    jobNotes: resolveProjectPipelineJobNotes(
      data.job_notes,
      typeof data.notes === 'string' ? data.notes : ''
    ),
    reviewNotes: parseProjectPipelineReviewNotes(data.review_notes),
  };
}

export async function fetchProjectPipelineUiEditedJobsMap(
  supabase: SupabaseClient,
  input: { sheetId?: string; sheetName: string; env?: NodeJS.ProcessEnv }
): Promise<Map<string, ProjectPipelineJob>> {
  const sheetId = input.sheetId ?? getProjectPipelineSheetId(input.env);

  let rows: ProjectPipelineJobDbRow[];
  try {
    rows = await fetchAllSupabasePages<ProjectPipelineJobDbRow>(({ from, to }) =>
      supabase
        .from(PROJECT_PIPELINE_JOBS_TABLE)
        .select('*')
        .eq('sheet_id', sheetId)
        .eq('sheet_name', input.sheetName)
        .eq('ui_source_of_truth', true)
        .range(from, to)
    );
  } catch (error) {
    console.warn('[project-pipeline] Failed to load UI-edited jobs from Supabase', error);
    return new Map();
  }

  const jobsByJobNumber = new Map<string, ProjectPipelineJob>();
  for (const row of rows) {
    const jobNumber = row.job_number.trim();
    if (!jobNumber) continue;
    jobsByJobNumber.set(jobNumber, projectPipelineJobFromDbRow(row));
  }

  return jobsByJobNumber;
}

export function mergeSheetJobsWithSupabaseOverrides(
  sheetJobs: ProjectPipelineJob[],
  storedStatusByJobNumber: Map<string, ProjectPipelineStoredStatus>,
  uiEditedByJobNumber: Map<string, ProjectPipelineJob>
): ProjectPipelineJob[] {
  const sheetJobNumbers = new Set(
    sheetJobs.map((job) => job.jobNumber.trim()).filter((jobNumber) => Boolean(jobNumber))
  );

  const mergedSheetJobs = sheetJobs.map((job) => {
    const uiEdited = uiEditedByJobNumber.get(job.jobNumber.trim());
    if (uiEdited) {
      return mergeSheetJobWithUiEditedJob(job, uiEdited, {
        sheetFieldSnapshot: uiEdited.sheetFieldSnapshot,
      });
    }

    const stored = storedStatusByJobNumber.get(job.jobNumber.trim());
    if (!stored) {
      return withDerivedProjectPipelineProjectStatus(job);
    }

    return withDerivedProjectPipelineProjectStatus(
      {
        ...job,
        projectStatus: stored.projectStatus,
        projectStatusManual: stored.projectStatusManual,
        flag: stored.flag,
        jobNotes: stored.jobNotes,
        reviewNotes: stored.reviewNotes,
      },
      stored.projectStatus
    );
  });

  const uiOnlyJobs = Array.from(uiEditedByJobNumber.values()).filter((job) => {
    const jobNumber = job.jobNumber.trim();
    return Boolean(jobNumber) && !sheetJobNumbers.has(jobNumber);
  });

  if (!uiOnlyJobs.length) {
    return mergedSheetJobs;
  }

  return [
    ...mergedSheetJobs,
    ...uiOnlyJobs.map((job) => withDerivedProjectPipelineProjectStatus(job)),
  ];
}

export async function upsertProjectPipelineJobMirror(
  supabase: SupabaseClient,
  job: ProjectPipelineJob,
  input: { sheetId: string; sheetName: string }
): Promise<ProjectPipelineJob> {
  const syncedAt = new Date().toISOString();
  const existingJob = await fetchProjectPipelineJobByJobNumber(supabase, {
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    jobNumber: job.jobNumber,
  });
  const jobForMirror: ProjectPipelineJob = {
    ...(job.projectStatusManual
      ? job
      : withDerivedProjectPipelineProjectStatus({
          ...job,
          pipelineSheetName: input.sheetName,
        })),
    sheetFieldSnapshot: job.sheetFieldSnapshot ?? existingJob?.sheetFieldSnapshot,
    uiSourceOfTruth: true,
    pipelineSheetName: input.sheetName,
  };

  const row = projectPipelineJobToDbRow(jobForMirror, {
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    syncRunId: randomUUID(),
    syncedAt,
    sheetYear: job.sheetYear ?? parseProjectPipelineSheetYear(input.sheetName),
  });

  const { error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .upsert(row, { onConflict: 'sheet_id,sheet_name,job_number' });

  if (error) {
    throw new Error(`Failed to upsert pipeline job mirror: ${error.message}`);
  }

  return jobForMirror;
}

export async function updateProjectPipelineJobProjectStatus(
  supabase: SupabaseClient,
  job: ProjectPipelineJob,
  input: {
    sheetId: string;
    sheetName: string;
    projectStatus?: string;
    manualOverride?: boolean;
  }
): Promise<ProjectPipelineJob> {
  const updatedAt = new Date().toISOString();
  const sheetId = input.sheetId;
  const sheetName = input.sheetName;

  const requestedStatus = normalizeProjectPipelineProjectStatus(
    input.projectStatus ?? job.projectStatus
  );
  const manualOverride =
    Boolean(input.manualOverride) || isStickyProjectPipelineProjectStatus(requestedStatus);

  if (!manualOverride) {
    const stored = await fetchProjectPipelineStoredStatusForJob(supabase, {
      sheetId,
      sheetName,
      jobNumber: job.jobNumber,
    });

    if (stored?.projectStatusManual) {
      return {
        ...job,
        projectStatus: stored.projectStatus,
        projectStatusManual: true,
        uiSourceOfTruth: true,
        pipelineSheetName: sheetName,
      };
    }
  }

  const projectStatus = manualOverride
    ? requestedStatus
    : withDerivedProjectPipelineProjectStatus(job).projectStatus;
  const projectStatusManual = manualOverride;
  const updatedJob: ProjectPipelineJob = {
    ...job,
    projectStatus,
    projectStatusManual,
    uiSourceOfTruth: true,
    pipelineSheetName: sheetName,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .update({
      project_status: projectStatus,
      project_status_manual: projectStatusManual,
      ui_source_of_truth: true,
      updated_at: updatedAt,
    })
    .eq('sheet_id', sheetId)
    .eq('sheet_name', sheetName)
    .eq('job_number', job.jobNumber)
    .select('id');

  if (updateError) {
    throw new Error(`Failed to update project status: ${updateError.message}`);
  }

  if (updatedRows?.length) {
    return updatedJob;
  }

  await upsertProjectPipelineJobMirror(supabase, updatedJob, { sheetId, sheetName });
  return updatedJob;
}

export async function deleteProjectPipelineJobMirror(
  supabase: SupabaseClient,
  input: { sheetId: string; sheetName: string; jobNumber: string }
): Promise<boolean> {
  const jobNumber = input.jobNumber.trim();
  if (!jobNumber) {
    throw new Error('Job number is required');
  }

  const { data, error } = await supabase
    .from(PROJECT_PIPELINE_JOBS_TABLE)
    .delete()
    .eq('sheet_id', input.sheetId)
    .eq('sheet_name', input.sheetName)
    .eq('job_number', jobNumber)
    .select('id');

  if (error) {
    throw new Error(`Failed to delete pipeline job: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}
