import { resolvePipelineJobConsultantRecipients } from '@/lib/project-pipeline/notifications/resolve-recipients';
import { resolveProjMgrEmailsForField } from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import {
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
} from '@/lib/project-pipeline/review-workflow';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type PipelineSlackRecipient = {
  email: string;
};

export function resolvePipelineSlackRecipientsForReviewChange(input: {
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'projMgr'>;
  previousStatus: string;
  newStatus: string;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): PipelineSlackRecipient[] {
  const actor = input.actorEmail?.trim().toLowerCase() ?? '';
  const previousStatus = normalizeProjectPipelineReviewStatus(input.previousStatus);
  const newStatus = normalizeProjectPipelineReviewStatus(input.newStatus);
  if (previousStatus === newStatus) return [];

  let emails: string[] = [];

  if (
    newStatus === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS &&
    previousStatus !== PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS
  ) {
    emails = resolveProjMgrEmailsForField(input.job.projMgr, input.managedUsers);
  } else if (isProjectPipelineReviewStatusChangesRequested(newStatus)) {
    emails = resolvePipelineJobConsultantRecipients({
      appraiserConsultant: input.job.appraiserConsultant,
      managedUsers: input.managedUsers,
    });
  } else {
    emails = resolvePipelineJobConsultantRecipients({
      appraiserConsultant: input.job.appraiserConsultant,
      managedUsers: input.managedUsers,
    });
  }

  return emails
    .filter((email) => email.trim().toLowerCase() !== actor)
    .map((email) => ({ email }));
}
