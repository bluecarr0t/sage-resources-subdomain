import { extractNameAliases, fieldMatchesNameAliases } from '@/lib/project-pipeline/name-aliases';
import {
  resolveManagedUserPipelineDisplayName,
  type ManagedUserWorkloadAuthorRow,
} from '@/lib/project-pipeline/workload-authors';
import { resolvePipelineJobConsultantRecipients } from '@/lib/project-pipeline/notifications/resolve-recipients';
import { resolveProjMgrEmailsForField } from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import {
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
} from '@/lib/project-pipeline/review-workflow';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type PipelineSlackRecipient = {
  email: string;
  slackUsername?: string | null;
};

function resolveSlackUsernameForEmail(
  email: string,
  managedUsers: readonly (ManagedUserWorkloadAuthorRow & { slack_username?: string | null })[]
): string | null {
  const normalized = email.trim().toLowerCase();
  for (const row of managedUsers) {
    if (row.email?.trim().toLowerCase() !== normalized) continue;
    return row.slack_username?.trim() || null;
  }
  return null;
}

export function resolvePipelineSlackRecipientsForReviewChange(input: {
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'projMgr' | 'authorSlackUsername'>;
  previousStatus: string;
  newStatus: string;
  managedUsers: readonly (ManagedUserWorkloadAuthorRow & { slack_username?: string | null })[];
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

  const authorSlack = input.job.authorSlackUsername?.trim() || null;

  return emails
    .filter((email) => email.trim().toLowerCase() !== actor)
    .map((email) => ({
      email,
      slackUsername:
        resolveSlackUsernameForEmail(email, input.managedUsers) ??
        (resolvePipelineJobConsultantRecipients({
          appraiserConsultant: input.job.appraiserConsultant,
          managedUsers: input.managedUsers,
        }).includes(email)
          ? authorSlack
          : null),
    }));
}

export function resolvePipelineSlackRecipientsForDueDateChange(input: {
  appraiserConsultant: string | null | undefined;
  authorSlackUsername?: string | null;
  managedUsers: readonly (ManagedUserWorkloadAuthorRow & { slack_username?: string | null })[];
  actorEmail?: string | null;
}): PipelineSlackRecipient[] {
  const actor = input.actorEmail?.trim().toLowerCase() ?? '';
  const emails = resolvePipelineJobConsultantRecipients({
    appraiserConsultant: input.appraiserConsultant,
    managedUsers: input.managedUsers,
  }).filter((email) => email.trim().toLowerCase() !== actor);

  const authorSlack = input.authorSlackUsername?.trim() || null;

  return emails.map((email) => ({
    email,
    slackUsername:
      resolveSlackUsernameForEmail(email, input.managedUsers) ?? authorSlack,
  }));
}

/** Resolve author slack username from job field when it matches a known pipeline handle. */
export function resolveAuthorSlackHandle(
  job: Pick<ProjectPipelineJob, 'appraiserConsultant' | 'authorSlackUsername'>,
  managedUsers: readonly (ManagedUserWorkloadAuthorRow & { slack_username?: string | null })[]
): string | null {
  const fromJob = job.authorSlackUsername?.trim();
  if (fromJob) return fromJob;

  const aliases = extractNameAliases(job.appraiserConsultant);
  for (const row of managedUsers) {
    const displayName = resolveManagedUserPipelineDisplayName(row);
    if (!fieldMatchesNameAliases(displayName, aliases)) continue;
    if (row.slack_username?.trim()) return row.slack_username.trim();
  }

  return null;
}
