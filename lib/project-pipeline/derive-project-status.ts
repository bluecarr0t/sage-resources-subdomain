import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';
import {
  DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS,
  isStickyProjectPipelineProjectStatus,
  normalizeProjectPipelineProjectStatus,
  type ProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';
import { isProjectPipelineSentToClientYes } from '@/lib/project-pipeline/sent-to-client';
import { isProjectPipelineReviewStatusInReviewWorkflow } from '@/lib/project-pipeline/review-workflow';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

type ProjectStatusDerivationInput = Pick<
  ProjectPipelineJob,
  'appraiserConsultant' | 'reviewStatus' | 'sentToClient' | 'dateCompleted'
>;

function hasAppraiserConsultant(value: string | null | undefined): boolean {
  return parseAppraiserConsultantValues(value).length > 0;
}

function hasDateCompleted(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Whether sheet-backed fields indicate the job is finished. */
export function isProjectPipelineJobCompletedBySheet(
  job: Pick<ProjectPipelineJob, 'sentToClient' | 'dateCompleted'>
): boolean {
  return (
    isProjectPipelineSentToClientYes(job.sentToClient) ||
    hasDateCompleted(job.dateCompleted)
  );
}

/** Derive workflow status from sheet-backed job fields (highest rule wins). */
export function deriveProjectPipelineProjectStatus(
  job: ProjectStatusDerivationInput
): ProjectPipelineProjectStatus {
  if (isProjectPipelineJobCompletedBySheet(job)) {
    return 'Completed';
  }

  if (isProjectPipelineReviewStatusInReviewWorkflow(job.reviewStatus)) {
    return 'In Review';
  }

  if (hasAppraiserConsultant(job.appraiserConsultant)) {
    return 'In-Progress';
  }

  return DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS;
}

/** Apply auto rules while preserving admin manual overrides and stored Cancelled. */
export function resolveProjectPipelineProjectStatus(
  job: ProjectStatusDerivationInput,
  storedStatus?: string | null,
  options?: { manual?: boolean }
): ProjectPipelineProjectStatus {
  const stored = normalizeProjectPipelineProjectStatus(storedStatus);
  const derived = deriveProjectPipelineProjectStatus(job);

  // Admin manual overrides win over auto-derived sheet completion signals.
  if (options?.manual) {
    return stored;
  }

  if (derived === 'Completed') {
    return 'Completed';
  }

  if (isStickyProjectPipelineProjectStatus(stored)) {
    return stored;
  }

  return derived;
}

export function withDerivedProjectPipelineProjectStatus(
  job: ProjectPipelineJob,
  storedStatus?: string | null
): ProjectPipelineJob {
  const resolved = resolveProjectPipelineProjectStatus(job, storedStatus ?? job.projectStatus, {
    manual: job.projectStatusManual,
  });

  return {
    ...job,
    projectStatus: resolved,
  };
}
