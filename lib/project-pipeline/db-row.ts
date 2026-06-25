import type { ProjectPipelineJob } from './types';
import { resolveProjectPipelineJobCommercialOutdoor } from './segment';
import { parseProjectPipelineSheetYear } from './sheet-tabs';
import {
  normalizeProjectPipelineProjectStatus,
  isStickyProjectPipelineProjectStatus,
  type ProjectPipelineProjectStatus,
} from './project-status';
import { DEFAULT_PROJECT_PIPELINE_FLAG, normalizeProjectPipelineFlag } from './project-flag';
import { withDerivedProjectPipelineProjectStatus } from './derive-project-status';
import { normalizeProjectPipelineSentToClient } from './sent-to-client';
import { normalizeProjectPipelineReviewStatus } from './review-status';
import {
  parseProjectPipelineReviewNotes,
  serializeProjectPipelineReviewNotes,
  type ProjectPipelineReviewNote,
} from './review-notes';

export const PROJECT_PIPELINE_JOBS_TABLE = 'project_pipeline_jobs';
export const PROJECT_PIPELINE_SYNC_RUNS_TABLE = 'project_pipeline_sync_runs';

/** Normalize Supabase status columns, including legacy flag = On Hold. */
export function resolveProjectPipelineStoredStatusFromDbFields(input: {
  project_status?: string | null;
  project_status_manual?: boolean | null;
  flag?: string | null;
}): { projectStatus: ProjectPipelineProjectStatus; projectStatusManual: boolean } {
  const rawFlag = typeof input.flag === 'string' ? input.flag.trim() : '';
  const rawProjectStatus = normalizeProjectPipelineProjectStatus(input.project_status);
  const legacyOnHoldFlag = rawFlag === 'On Hold' && rawProjectStatus !== 'On Hold';

  if (legacyOnHoldFlag) {
    return { projectStatus: 'On Hold', projectStatusManual: true };
  }

  const projectStatusManual =
    Boolean(input.project_status_manual) ||
    isStickyProjectPipelineProjectStatus(rawProjectStatus);

  return {
    projectStatus: rawProjectStatus,
    projectStatusManual,
  };
}

export type ProjectPipelineJobDbRow = {
  job_number: string;
  client: string;
  property_location: string;
  appraiser_consultant: string;
  proj_mgr: string;
  contract_start: string;
  due_date: string;
  date_completed: string;
  commercial_outdoor: string;
  property_type: string;
  service: string;
  review_status: string;
  sent_to_client: string;
  author_slack_username: string;
  client_email: string;
  project_status: string;
  project_status_manual: boolean;
  ui_source_of_truth: boolean;
  flag: string;
  notes: string;
  review_notes: ProjectPipelineReviewNote[] | string;
  sheet_row_index: number;
  sheet_id: string;
  sheet_name: string;
  sheet_year: number | null;
  last_sync_run_id: string;
  synced_at: string;
  updated_at: string;
};

export function projectPipelineJobToDbRow(
  job: ProjectPipelineJob,
  meta: {
    sheetId: string;
    sheetName: string;
    syncRunId: string;
    syncedAt?: string;
    sheetYear?: number | null;
  }
): ProjectPipelineJobDbRow {
  const syncedAt = meta.syncedAt ?? new Date().toISOString();
  const sheetYear =
    meta.sheetYear ??
    job.sheetYear ??
    parseProjectPipelineSheetYear(meta.sheetName);

  return {
    job_number: job.jobNumber,
    client: job.client,
    property_location: job.propertyLocation,
    appraiser_consultant: job.appraiserConsultant,
    proj_mgr: job.projMgr,
    contract_start: job.contractStart,
    due_date: job.dueDate,
    date_completed: job.dateCompleted,
    commercial_outdoor: job.commercialOutdoor,
    property_type: job.propertyType,
    service: job.service,
    review_status: normalizeProjectPipelineReviewStatus(job.reviewStatus),
    sent_to_client: normalizeProjectPipelineSentToClient(job.sentToClient),
    author_slack_username: job.authorSlackUsername,
    client_email: job.clientEmail,
    project_status: normalizeProjectPipelineProjectStatus(job.projectStatus),
    project_status_manual: Boolean(job.projectStatusManual),
    ui_source_of_truth: Boolean(job.uiSourceOfTruth),
    flag: normalizeProjectPipelineFlag(job.flag),
    notes: job.notes ?? '',
    review_notes: serializeProjectPipelineReviewNotes(job.reviewNotes ?? []),
    sheet_row_index: job.sheetRowIndex,
    sheet_id: meta.sheetId,
    sheet_name: meta.sheetName,
    sheet_year: sheetYear,
    last_sync_run_id: meta.syncRunId,
    synced_at: syncedAt,
    updated_at: syncedAt,
  };
}

export type ProjectPipelineSheetSyncDbRow = ProjectPipelineJobDbRow;

/** Sheet cron sync payload — includes auto-derived Supabase-only project_status. */
export function projectPipelineJobToSheetSyncDbRow(
  job: ProjectPipelineJob,
  meta: {
    sheetId: string;
    sheetName: string;
    syncRunId: string;
    syncedAt?: string;
    sheetYear?: number | null;
  }
): ProjectPipelineSheetSyncDbRow {
  return projectPipelineJobToDbRow(withDerivedProjectPipelineProjectStatus(job), meta);
}

export function projectPipelineJobFromDbRow(row: ProjectPipelineJobDbRow): ProjectPipelineJob {
  const uiSourceOfTruth = Boolean(row.ui_source_of_truth);
  const { projectStatus: resolvedStatus, projectStatusManual } =
    resolveProjectPipelineStoredStatusFromDbFields({
      project_status: row.project_status,
      project_status_manual: row.project_status_manual,
      flag: row.flag,
    });
  const legacyOnHoldFlag =
    typeof row.flag === 'string' &&
    row.flag.trim() === 'On Hold' &&
    normalizeProjectPipelineProjectStatus(row.project_status) !== 'On Hold';

  const base: ProjectPipelineJob = {
    jobNumber: row.job_number,
    client: row.client,
    propertyLocation: row.property_location,
    appraiserConsultant: row.appraiser_consultant,
    projMgr: row.proj_mgr,
    contractStart: row.contract_start,
    dueDate: row.due_date,
    dateCompleted: row.date_completed,
    commercialOutdoor: resolveProjectPipelineJobCommercialOutdoor({
      commercialOutdoor: row.commercial_outdoor,
      service: row.service,
    }),
    propertyType: row.property_type,
    service: row.service,
    reviewStatus: normalizeProjectPipelineReviewStatus(row.review_status),
    sentToClient: normalizeProjectPipelineSentToClient(row.sent_to_client),
    authorSlackUsername: row.author_slack_username,
    clientEmail: row.client_email,
    projectStatus: resolvedStatus,
    projectStatusManual,
    uiSourceOfTruth,
    flag: legacyOnHoldFlag ? 'None' : normalizeProjectPipelineFlag(row.flag),
    notes: row.notes ?? '',
    reviewNotes: parseProjectPipelineReviewNotes(row.review_notes),
    sheetRowIndex: row.sheet_row_index,
    pipelineSheetName: row.sheet_name,
    sheetYear: row.sheet_year,
  };

  return withDerivedProjectPipelineProjectStatus(
    base,
    resolvedStatus
  );
}
