import {
  deriveProjectPipelineProjectStatus,
  withDerivedProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/derive-project-status';
import type { ProjectPipelineStoredStatus } from '@/lib/project-pipeline/fetch-from-supabase';
import { mergeSheetJobWithUiEditedJob } from '@/lib/project-pipeline/merge-sheet-ui-job';
import {
  isStickyProjectPipelineProjectStatus,
  normalizeProjectPipelineProjectStatus,
  type ProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';
import type { ProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type ResolveSheetSyncProjectPipelineJobInput = {
  sheetJob: ProjectPipelineJob;
  sheetName: ProjectPipelineSheetTab;
  sheetYear: number | null;
  storedStatusByJobNumber: ReadonlyMap<string, ProjectPipelineStoredStatus>;
  uiEditedByJobNumber: ReadonlyMap<string, ProjectPipelineJob>;
};

/** Build the merged job that will be written to Supabase during a sheet sync. */
export function resolveSheetSyncProjectPipelineJob(
  input: ResolveSheetSyncProjectPipelineJobInput
): ProjectPipelineJob {
  const jobNumber = input.sheetJob.jobNumber.trim();
  const uiEdited = input.uiEditedByJobNumber.get(jobNumber);
  if (uiEdited) {
    return mergeSheetJobWithUiEditedJob(input.sheetJob, uiEdited, {
      sheetFieldSnapshot: uiEdited.sheetFieldSnapshot,
    });
  }

  const stored = input.storedStatusByJobNumber.get(jobNumber);
  const baseJob: ProjectPipelineJob = {
    ...input.sheetJob,
    pipelineSheetName: input.sheetName,
    sheetYear: input.sheetYear,
  };

  if (!stored) {
    return withDerivedProjectPipelineProjectStatus(baseJob);
  }

  return mergeStoredProjectPipelineJobWithSheetRow(baseJob, stored);
}

/** Whether sheet signals should advance an existing non-manual stored status (never regress). */
export function shouldAdvanceStoredProjectPipelineStatus(
  storedStatus: string,
  derivedStatus: ProjectPipelineProjectStatus
): boolean {
  const stored = normalizeProjectPipelineProjectStatus(storedStatus);
  if (stored === derivedStatus) return false;
  if (derivedStatus === 'Completed') return true;
  if (
    stored === 'Not Started' &&
    (derivedStatus === 'In-Progress' || derivedStatus === 'In Review')
  ) {
    return true;
  }
  if (stored === 'In-Progress' && derivedStatus === 'In Review') {
    return true;
  }
  return false;
}

/** Refresh sheet-backed columns for an existing mirror row without resetting workflow state. */
export function mergeStoredProjectPipelineJobWithSheetRow(
  sheetJob: ProjectPipelineJob,
  stored: ProjectPipelineStoredStatus
): ProjectPipelineJob {
  const merged: ProjectPipelineJob = {
    ...sheetJob,
    projectStatus: stored.projectStatus,
    projectStatusManual: stored.projectStatusManual,
    flag: stored.flag,
    jobNotes: stored.jobNotes,
    reviewNotes: stored.reviewNotes,
  };

  if (stored.projectStatusManual || isStickyProjectPipelineProjectStatus(stored.projectStatus)) {
    return merged;
  }

  const derived = deriveProjectPipelineProjectStatus(merged);
  if (shouldAdvanceStoredProjectPipelineStatus(stored.projectStatus, derived)) {
    return { ...merged, projectStatus: derived };
  }

  return merged;
}
