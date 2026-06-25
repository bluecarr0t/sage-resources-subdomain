import { extractNameAliases, isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import { isJobAssignedToUser } from '@/lib/project-pipeline/filter-jobs';
import { isManagedUserAdmin } from '@/lib/project-pipeline/job-edit-permissions';
import type { ManagedUser } from '@/lib/auth-helpers';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER,
  type ProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';
import {
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
} from '@/lib/project-pipeline/review-workflow';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import { resolveProjectPipelineJobSegment } from '@/lib/project-pipeline/segment';

export function isProjectPipelineJobProjMgr(
  job: Pick<ProjectPipelineJob, 'projMgr'>,
  displayName: string | null | undefined
): boolean {
  const field = job.projMgr?.trim();
  const name = displayName?.trim();
  if (!field || !name) return false;
  return isJobAuthoredByConsultant(field, name);
}

export function jobMatchesManagedUserDivision(
  job: Pick<ProjectPipelineJob, 'commercialOutdoor'>,
  division: string | null | undefined
): boolean {
  const normalized = division?.trim().toLowerCase();
  if (!normalized || normalized === 'both') return true;

  const segment = resolveProjectPipelineJobSegment(job.commercialOutdoor);
  if (normalized === 'outdoor') return segment === 'Outdoor';
  if (normalized === 'commercial') return segment === 'Commercial';
  return true;
}

export function isJobAwaitingReviewerAction(
  job: Pick<ProjectPipelineJob, 'reviewStatus'>
): boolean {
  return (
    normalizeProjectPipelineReviewStatus(job.reviewStatus) ===
    PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS
  );
}

export function isJobAwaitingAuthorResubmission(
  job: Pick<ProjectPipelineJob, 'reviewStatus'>
): boolean {
  return isProjectPipelineReviewStatusChangesRequested(job.reviewStatus);
}

export function isProjectPipelineReviewTodoForUser(
  job: ProjectPipelineJob,
  input: {
    displayName: string | null | undefined;
    isAdmin?: boolean;
    division?: string | null;
  }
): boolean {
  const displayName = input.displayName;

  if (
    isJobAwaitingAuthorResubmission(job) &&
    isJobAuthoredByConsultant(job.appraiserConsultant, displayName ?? '')
  ) {
    return true;
  }

  if (
    isJobAwaitingReviewerAction(job) &&
    isProjectPipelineJobProjMgr(job, displayName) &&
    jobMatchesManagedUserDivision(job, input.division)
  ) {
    return true;
  }

  return false;
}

export function countProjectPipelineReviewTodos(
  jobs: readonly ProjectPipelineJob[],
  input: {
    email: string | null | undefined;
    displayName: string | null | undefined;
    pipelineViewAll?: boolean;
    managedUser?: Pick<ManagedUser, 'role' | 'division'> | null;
  }
): number {
  const displayName = input.displayName;
  const aliases = extractNameAliases(displayName);
  if (!input.pipelineViewAll && !aliases.length) return 0;

  const isAdmin = isManagedUserAdmin(input.managedUser);
  const division = input.managedUser?.division ?? null;

  const visibleJobs = input.pipelineViewAll
    ? jobs
    : jobs.filter((job) => isJobAssignedToUser(job, displayName));

  let count = 0;
  for (const job of visibleJobs) {
    if (
      isProjectPipelineReviewTodoForUser(job, {
        displayName,
        isAdmin,
        division,
      })
    ) {
      count += 1;
    }
  }

  return count;
}

export function resolveDefaultProjectPipelineTableStatusFilter(
  jobs: readonly ProjectPipelineJob[],
  input: {
    email: string | null | undefined;
    displayName: string | null | undefined;
    pipelineViewAll?: boolean;
    managedUser?: Pick<ManagedUser, 'role' | 'division'> | null;
  }
): ProjectPipelineProjectStatus {
  if (
    countProjectPipelineReviewTodos(jobs, input) <= 0
  ) {
    return DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER;
  }

  const displayName = input.displayName;
  const aliases = extractNameAliases(displayName);
  if (!input.pipelineViewAll && !aliases.length) {
    return DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER;
  }

  const division = input.managedUser?.division ?? null;
  const visibleJobs = input.pipelineViewAll
    ? jobs
    : jobs.filter((job) => isJobAssignedToUser(job, displayName));

  const hasReviewerTodo = visibleJobs.some(
    (job) =>
      isJobAwaitingReviewerAction(job) &&
      isProjectPipelineJobProjMgr(job, displayName) &&
      jobMatchesManagedUserDivision(job, division)
  );

  return hasReviewerTodo ? 'In Review' : DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER;
}

export function listProjectPipelineReviewTodoJobs(
  jobs: readonly ProjectPipelineJob[],
  input: {
    displayName: string | null | undefined;
    pipelineViewAll?: boolean;
    managedUser?: Pick<ManagedUser, 'role' | 'division'> | null;
  }
): ProjectPipelineJob[] {
  const displayName = input.displayName;
  const aliases = extractNameAliases(displayName);
  if (!input.pipelineViewAll && !aliases.length) return [];

  const isAdmin = isManagedUserAdmin(input.managedUser);
  const division = input.managedUser?.division ?? null;

  const visibleJobs = input.pipelineViewAll
    ? jobs
    : jobs.filter((job) => isJobAssignedToUser(job, displayName));

  return visibleJobs.filter((job) =>
    isProjectPipelineReviewTodoForUser(job, {
      displayName,
      isAdmin,
      division,
    })
  );
}
