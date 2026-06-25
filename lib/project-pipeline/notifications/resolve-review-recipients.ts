import { isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import {
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
} from '@/lib/project-pipeline/review-workflow';
import {
  resolveManagedUserPipelineDisplayName,
  type ManagedUserWorkloadAuthorRow,
} from '@/lib/project-pipeline/workload-authors';
import {
  resolveConsultantEmailsForField,
} from '@/lib/project-pipeline/notifications/resolve-recipients';

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

export function resolveProjMgrEmailsForField(
  fieldValue: string | null | undefined,
  managedUsers: readonly ManagedUserWorkloadAuthorRow[]
): string[] {
  const field = fieldValue?.trim();
  if (!field) return [];

  const emails = new Set<string>();
  for (const row of managedUsers) {
    const email = row.email?.trim();
    if (!email) continue;

    const displayName = resolveManagedUserPipelineDisplayName(row);
    if (!isJobAuthoredByConsultant(field, displayName)) continue;
    emails.add(email);
  }

  return [...emails];
}

export function resolvePipelineReviewStatusChangeRecipients(input: {
  appraiserConsultant: string | null | undefined;
  projMgr: string | null | undefined;
  previousStatus: string;
  newStatus: string;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): string[] {
  const actor = normalizeEmail(input.actorEmail);
  const previousStatus = normalizeProjectPipelineReviewStatus(input.previousStatus);
  const newStatus = normalizeProjectPipelineReviewStatus(input.newStatus);

  if (previousStatus === newStatus) return [];

  let recipients: string[] = [];

  if (
    newStatus === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS &&
    previousStatus !== PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS
  ) {
    recipients = resolveProjMgrEmailsForField(input.projMgr, input.managedUsers);
  } else if (isProjectPipelineReviewStatusChangesRequested(newStatus)) {
    recipients = resolveConsultantEmailsForField(
      input.appraiserConsultant,
      input.managedUsers
    );
  } else {
    const emails = new Set<string>([
      ...resolveConsultantEmailsForField(input.appraiserConsultant, input.managedUsers),
      ...resolveProjMgrEmailsForField(input.projMgr, input.managedUsers),
    ]);
    recipients = [...emails];
  }

  const filtered = recipients.filter((email) => normalizeEmail(email) !== actor);

  // When the actor is the only intended recipient (common on TEST jobs), still deliver.
  if (!filtered.length && recipients.length) {
    return recipients;
  }

  return filtered;
}

export function resolvePipelineStakeholderRecipients(input: {
  appraiserConsultant: string | null | undefined;
  projMgr: string | null | undefined;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): string[] {
  const actor = normalizeEmail(input.actorEmail);
  const recipients = [
    ...new Set([
      ...resolveConsultantEmailsForField(input.appraiserConsultant, input.managedUsers),
      ...resolveProjMgrEmailsForField(input.projMgr, input.managedUsers),
    ]),
  ];
  const filtered = recipients.filter((email) => normalizeEmail(email) !== actor);

  if (!filtered.length && recipients.length) {
    return recipients;
  }

  return filtered;
}

export function resolvePipelineDueDateChangeRecipients(input: {
  appraiserConsultant: string | null | undefined;
  projMgr: string | null | undefined;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): string[] {
  return resolvePipelineStakeholderRecipients(input);
}

export function resolvePipelineProjectStatusChangeRecipients(input: {
  appraiserConsultant: string | null | undefined;
  projMgr: string | null | undefined;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  actorEmail?: string | null;
}): string[] {
  return resolvePipelineStakeholderRecipients(input);
}
