import { filterJobsForUser } from './filter-jobs';
import { normalizeProjectPipelineProjectStatus } from './project-status';
import { DEFAULT_PROJECT_PIPELINE_SHEET_TAB } from './sheet-tabs';
import type { ProjectPipelineJob } from './types';

export const PROJECT_PIPELINE_AUTHOR_PREVIEW_EMAIL = 'harsell@sageoutdooradvisory.com';

export const PROJECT_PIPELINE_DEMO_AUTHOR = {
  email: 'marran@sageoutdooradvisory.com',
  displayName: 'Luke Marran',
} as const;

export type ProjectPipelineDemoAuthorDisplayName =
  (typeof PROJECT_PIPELINE_DEMO_AUTHOR)['displayName'];

export function canUseProjectPipelineAuthorPreview(
  email: string | null | undefined
): boolean {
  return email?.toLowerCase().trim() === PROJECT_PIPELINE_AUTHOR_PREVIEW_EMAIL;
}

export function isValidAuthorPreviewDisplayName(
  value: unknown
): value is ProjectPipelineDemoAuthorDisplayName {
  return value === PROJECT_PIPELINE_DEMO_AUTHOR.displayName;
}

export function isAuthorPreviewActiveProjectStatus(
  status: string | null | undefined
): boolean {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  return normalized !== 'Completed' && normalized !== 'Cancelled';
}

function isPriorProjectPipelineSheetTab(job: ProjectPipelineJob): boolean {
  const tab = job.pipelineSheetName?.trim();
  return Boolean(tab && tab !== DEFAULT_PROJECT_PIPELINE_SHEET_TAB);
}

export type AssignedAuthorJobsFilterOptions = {
  showAll?: boolean;
  /** When true, include every job from prior-year sheet tabs (e.g. 2025 Jobs). */
  allYearsView?: boolean;
};

function filterAssignedAuthorJobsByStatus(
  jobs: readonly ProjectPipelineJob[],
  options?: AssignedAuthorJobsFilterOptions
): ProjectPipelineJob[] {
  if (options?.showAll) return [...jobs];

  if (options?.allYearsView) {
    return jobs.filter(
      (job) =>
        isPriorProjectPipelineSheetTab(job) ||
        isAuthorPreviewActiveProjectStatus(job.projectStatus)
    );
  }

  return jobs.filter((job) => isAuthorPreviewActiveProjectStatus(job.projectStatus));
}

export function filterAssignedAuthorActiveJobs(
  jobs: readonly ProjectPipelineJob[],
  options?: AssignedAuthorJobsFilterOptions
): ProjectPipelineJob[] {
  return filterAssignedAuthorJobsByStatus(jobs, options);
}

export function filterJobsForDemoAuthor(
  jobs: readonly ProjectPipelineJob[],
  options?: AssignedAuthorJobsFilterOptions
): ProjectPipelineJob[] {
  const assigned = filterJobsForUser(jobs, {
    email: PROJECT_PIPELINE_DEMO_AUTHOR.email,
    displayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName,
  });

  return filterAssignedAuthorJobsByStatus(assigned, options);
}

export function resolveProjectPipelineEditUser(input: {
  viewerEmail: string | null | undefined;
  viewerDisplayName: string | null | undefined;
  previewAsDisplayName?: unknown;
}): { email: string | null | undefined; displayName: string | null | undefined } {
  if (
    canUseProjectPipelineAuthorPreview(input.viewerEmail) &&
    isValidAuthorPreviewDisplayName(input.previewAsDisplayName)
  ) {
    return {
      email: PROJECT_PIPELINE_DEMO_AUTHOR.email,
      displayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName,
    };
  }

  return {
    email: input.viewerEmail,
    displayName: input.viewerDisplayName,
  };
}
