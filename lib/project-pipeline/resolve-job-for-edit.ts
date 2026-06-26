import {
  isProjectPipelineAllSheetsTab,
  resolveProjectPipelineSheetTab,
} from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { isJobAssignedToUser } from '@/lib/project-pipeline/filter-jobs';

function resolveJobSheetTab(
  job: Pick<ProjectPipelineJob, 'pipelineSheetName'>,
  contextSheetName: string
): string {
  if (isProjectPipelineAllSheetsTab(contextSheetName)) {
    return resolveProjectPipelineSheetTab(job.pipelineSheetName);
  }
  return resolveProjectPipelineSheetTab(contextSheetName);
}

export function matchesProjectPipelineJobRef(
  left: Pick<ProjectPipelineJob, 'jobNumber' | 'sheetRowIndex' | 'pipelineSheetName'>,
  right: Pick<ProjectPipelineJob, 'jobNumber' | 'sheetRowIndex' | 'pipelineSheetName'>,
  sheetName: string
): boolean {
  const leftJobNumber = left.jobNumber.trim();
  const rightJobNumber = right.jobNumber.trim();
  const leftTab = resolveJobSheetTab(left, sheetName);
  const rightTab = resolveJobSheetTab(right, sheetName);

  if (leftJobNumber && rightJobNumber) {
    return leftJobNumber === rightJobNumber && leftTab === rightTab;
  }

  if (leftJobNumber || rightJobNumber) {
    return false;
  }

  return left.sheetRowIndex === right.sheetRowIndex && leftTab === rightTab;
}

export function canEditProjectPipelineJob(input: {
  job: Pick<ProjectPipelineJob, 'jobNumber' | 'sheetRowIndex' | 'pipelineSheetName'>;
  sheetName: string;
  pipelineViewAll: boolean;
  isAdmin: boolean;
  /** Single-row Supabase lookup — preferred for API saves. */
  existingJob?: ProjectPipelineJob | null;
  viewerDisplayName?: string | null;
  /** Legacy list-based check (UI / tests). */
  visibleJobs?: readonly ProjectPipelineJob[];
}): boolean {
  if (!input.job.jobNumber.trim()) {
    return false;
  }

  if (input.job.sheetRowIndex === 0) {
    return input.pipelineViewAll || input.isAdmin;
  }

  if (input.job.sheetRowIndex < 2) {
    return false;
  }

  if (input.pipelineViewAll || input.isAdmin) {
    return true;
  }

  if (input.existingJob != null && input.viewerDisplayName !== undefined) {
    return isJobAssignedToUser(input.existingJob, input.viewerDisplayName);
  }

  if (input.visibleJobs) {
    return input.visibleJobs.some((visibleJob) =>
      matchesProjectPipelineJobRef(visibleJob, input.job, input.sheetName)
    );
  }

  return false;
}

export function findProjectPipelineJobForEdit(
  visibleJobs: readonly ProjectPipelineJob[],
  job: Pick<ProjectPipelineJob, 'jobNumber' | 'sheetRowIndex' | 'pipelineSheetName'>,
  sheetName: string
): ProjectPipelineJob | undefined {
  return visibleJobs.find((visibleJob) =>
    matchesProjectPipelineJobRef(visibleJob, job, sheetName)
  );
}

function preferProjectPipelineJobRef(
  left: ProjectPipelineJob,
  right: ProjectPipelineJob
): ProjectPipelineJob {
  if (left.uiSourceOfTruth && !right.uiSourceOfTruth) return left;
  if (right.uiSourceOfTruth && !left.uiSourceOfTruth) return right;
  if (left.sheetRowIndex !== right.sheetRowIndex) {
    return left.sheetRowIndex > right.sheetRowIndex ? left : right;
  }
  return left;
}

/** Collapse duplicate sheet/job refs (e.g. all-years merge or optimistic creates). */
export function dedupeProjectPipelineJobs(
  jobs: readonly ProjectPipelineJob[],
  sheetName: string
): ProjectPipelineJob[] {
  const deduped: ProjectPipelineJob[] = [];

  for (const job of jobs) {
    const existingIndex = deduped.findIndex((candidate) =>
      matchesProjectPipelineJobRef(candidate, job, sheetName)
    );

    if (existingIndex === -1) {
      deduped.push(job);
      continue;
    }

    deduped[existingIndex] = preferProjectPipelineJobRef(deduped[existingIndex]!, job);
  }

  return deduped;
}

export function upsertProjectPipelineJobInList(
  jobs: readonly ProjectPipelineJob[],
  job: ProjectPipelineJob,
  sheetName: string
): ProjectPipelineJob[] {
  const existingIndex = jobs.findIndex((row) => matchesProjectPipelineJobRef(row, job, sheetName));

  if (existingIndex === -1) {
    return [...jobs, job];
  }

  const next = [...jobs];
  next[existingIndex] = preferProjectPipelineJobRef(next[existingIndex]!, job);
  return next;
}

export function removeProjectPipelineJobFromList(
  jobs: readonly ProjectPipelineJob[],
  job: Pick<ProjectPipelineJob, 'jobNumber' | 'sheetRowIndex' | 'pipelineSheetName'>,
  sheetName: string
): ProjectPipelineJob[] {
  return jobs.filter((row) => !matchesProjectPipelineJobRef(row, job, sheetName));
}
