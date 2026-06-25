import {
  isProjectPipelineJobAuthor,
  isManagedUserAdmin,
} from '@/lib/project-pipeline/job-edit-permissions';
import {
  normalizeProjectPipelineReviewStatus,
  PROJECT_PIPELINE_REVIEW_STATUSES,
  getReviewStatusDropdownLabel,
} from '@/lib/project-pipeline/review-status';
import type { ManagedUser } from '@/lib/auth-helpers';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  withDerivedProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/derive-project-status';
import { isStickyProjectPipelineProjectStatus } from '@/lib/project-pipeline/project-status';
import {
  appendProjectPipelineReviewNote,
  type ProjectPipelineReviewNoteType,
} from '@/lib/project-pipeline/review-notes';

export const PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS = 'In-Progress';

export const PROJECT_PIPELINE_REVIEWER_RESPONSE_STATUSES = [
  'Changes Requested',
  'Approved - Minor Changes, Then Send to Client',
  'Approved - No Changes, Send to Client',
] as const;

export function isProjectPipelineReviewStatusApproved(
  status: string | null | undefined
): boolean {
  return normalizeProjectPipelineReviewStatus(status).toLowerCase().includes('approved');
}

export function isProjectPipelineReviewStatusChangesRequested(
  status: string | null | undefined
): boolean {
  return (
    normalizeProjectPipelineReviewStatus(status).toLowerCase() === 'changes requested'
  );
}

/** Project is in an active consultant ↔ reviewer workflow (submitted or awaiting fixes). */
export function isProjectPipelineReviewStatusInReviewWorkflow(
  status: string | null | undefined
): boolean {
  const normalized = normalizeProjectPipelineReviewStatus(status);
  if (!normalized) return false;
  if (normalized === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS) return true;
  return isProjectPipelineReviewStatusChangesRequested(normalized);
}

export function canViewProjectPipelineReviewNotes(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  input: {
    displayName: string | null | undefined;
    isAdmin?: boolean;
  }
): boolean {
  if (input.isAdmin) return true;
  return isProjectPipelineJobAuthor(job, input.displayName);
}

export function canSubmitProjectPipelineForReview(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'reviewStatus' | 'sentToClient'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  const isAdmin = Boolean(options?.isAdmin);
  if (!isAdmin && !isProjectPipelineJobAuthor(job, displayName)) return false;

  const status = normalizeProjectPipelineReviewStatus(job.reviewStatus);
  if (isProjectPipelineReviewStatusApproved(status)) return false;
  if (isProjectPipelineReviewStatusChangesRequested(status)) return false;
  if (status === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS) return false;

  return true;
}

export function canResubmitProjectPipelineForReview(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'reviewStatus'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  const isAdmin = Boolean(options?.isAdmin);
  if (!isAdmin && !isProjectPipelineJobAuthor(job, displayName)) return false;
  return isProjectPipelineReviewStatusChangesRequested(job.reviewStatus);
}

export function canAddProjectPipelineReviewerFeedback(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  if (options?.isAdmin) return true;
  return !isProjectPipelineJobAuthor(job, displayName);
}

export function canRespondToProjectPipelineReview(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'reviewStatus'>,
  displayName: string | null | undefined,
  options?: { isAdmin?: boolean }
): boolean {
  if (!canAddProjectPipelineReviewerFeedback(job, displayName, options)) return false;
  return (
    normalizeProjectPipelineReviewStatus(job.reviewStatus) ===
    PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS
  );
}

export function isValidReviewerReviewStatus(status: string): boolean {
  const normalized = normalizeProjectPipelineReviewStatus(status);
  if (!normalized) return false;
  return (PROJECT_PIPELINE_REVIEW_STATUSES as readonly string[]).includes(normalized);
}

function finalizeProjectPipelineReviewActionJob(job: ProjectPipelineJob): ProjectPipelineJob {
  const keepManual =
    Boolean(job.projectStatusManual) &&
    isStickyProjectPipelineProjectStatus(job.projectStatus);

  return withDerivedProjectPipelineProjectStatus({
    ...job,
    projectStatusManual: keepManual,
    uiSourceOfTruth: true,
  });
}

export function applyProjectPipelineReviewAction(input: {
  job: ProjectPipelineJob;
  action: ProjectPipelineReviewNoteType;
  note: string;
  reviewStatus?: string;
  actorEmail: string;
  actorDisplayName: string;
  managedUser: Pick<ManagedUser, 'role'> | null | undefined;
}): ProjectPipelineJob {
  const existingNotes = input.job.reviewNotes ?? [];
  const isAdmin = isManagedUserAdmin(input.managedUser);
  const displayName = input.actorDisplayName;

  if (input.action === 'submit_for_review') {
    if (!canSubmitProjectPipelineForReview(input.job, displayName, { isAdmin })) {
      throw new Error('You cannot submit this project for review');
    }

    const reviewNotes = appendProjectPipelineReviewNote(existingNotes, {
      type: 'submit_for_review',
      note: input.note,
      reviewStatus: PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
      createdByEmail: input.actorEmail,
      createdByDisplayName: displayName,
    });

    return finalizeProjectPipelineReviewActionJob({
      ...input.job,
      reviewStatus: PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
      reviewNotes,
    });
  }

  if (input.action === 'resubmit') {
    if (!canResubmitProjectPipelineForReview(input.job, displayName, { isAdmin })) {
      throw new Error('You cannot resubmit this project for review');
    }

    const reviewNotes = appendProjectPipelineReviewNote(existingNotes, {
      type: 'resubmit',
      note: input.note,
      reviewStatus: PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
      createdByEmail: input.actorEmail,
      createdByDisplayName: displayName,
    });

    return finalizeProjectPipelineReviewActionJob({
      ...input.job,
      reviewStatus: PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
      reviewNotes,
    });
  }

  if (input.action === 'review_feedback') {
    if (!canAddProjectPipelineReviewerFeedback(input.job, displayName, { isAdmin })) {
      throw new Error('You cannot add reviewer feedback on this project');
    }

    const nextStatus = normalizeProjectPipelineReviewStatus(input.reviewStatus);
    if (!isValidReviewerReviewStatus(nextStatus)) {
      throw new Error('A valid review status is required');
    }

    const trimmedNote = input.note.trim();
    if (
      isProjectPipelineReviewStatusChangesRequested(nextStatus) &&
      !trimmedNote
    ) {
      throw new Error('A note is required when requesting changes');
    }

    const noteForEntry =
      trimmedNote ||
      (isProjectPipelineReviewStatusApproved(nextStatus)
        ? getReviewStatusDropdownLabel(nextStatus)
        : '');

    const reviewNotes = appendProjectPipelineReviewNote(existingNotes, {
      type: 'review_feedback',
      note: noteForEntry,
      reviewStatus: nextStatus,
      createdByEmail: input.actorEmail,
      createdByDisplayName: displayName,
    });

    return finalizeProjectPipelineReviewActionJob({
      ...input.job,
      reviewStatus: nextStatus,
      reviewNotes,
    });
  }

  throw new Error('Unsupported review action');
}

export function filterProjectPipelineJobReviewNotesForViewer(
  job: ProjectPipelineJob,
  input: {
    displayName: string | null | undefined;
    isAdmin?: boolean;
  }
): ProjectPipelineJob {
  if (canViewProjectPipelineReviewNotes(job, input)) {
    return job;
  }

  return {
    ...job,
    reviewNotes: [],
  };
}

export function formatProjectPipelineReviewNoteLabel(
  type: ProjectPipelineReviewNoteType,
  reviewStatus?: string
): string {
  if (
    type === 'review_feedback' &&
    isProjectPipelineReviewStatusApproved(reviewStatus)
  ) {
    return 'Approved';
  }

  switch (type) {
    case 'submit_for_review':
      return 'Submitted for review';
    case 'resubmit':
      return 'Resubmitted for review';
    case 'review_feedback':
      return 'Reviewer feedback';
    default:
      return 'Note';
  }
}
