import { notifyPipelineEmail, isPipelineEmailEnabled } from '@/lib/email/resend-client';
import {
  buildDueDateChangeEmail,
  buildProjectStatusChangeEmail,
  buildResubmitForReviewEmail,
  buildResubmitForReviewReceiptEmail,
  buildReviewStatusChangeEmail,
  buildSubmitForReviewEmail,
  buildSubmitForReviewReceiptEmail,
} from '@/lib/email/pipeline-email-templates';
import {
  buildPipelineSlackJobContext,
  notifyPipelineSlackDm,
} from '@/lib/slack/pipeline-slack-client';
import {
  resolveSlackDeliveryEmailsForAccounts,
  type ManagedUserSlackEmailRow,
} from '@/lib/managed-users/slack-email';
import { detectProjectPipelineJobChanges } from '@/lib/project-pipeline/notifications/detect-job-changes';
import type { ProjectPipelineJobChange } from '@/lib/project-pipeline/notifications/detect-job-changes';
import {
  buildPipelineEmailPreferencesMap,
  filterRecipientsByEmailPreference,
  isPipelineEmailEnabledForUser,
  type PipelineEmailPreferenceKey,
  type PipelineEmailPreferences,
} from '@/lib/project-pipeline/notifications/email-preferences';
import {
  buildPipelineSlackPreferencesMap,
  filterRecipientsBySlackPreference,
  isPipelineSlackEnabledForUser,
  type PipelineSlackPreferenceKey,
  type PipelineSlackPreferences,
} from '@/lib/project-pipeline/notifications/slack-preferences';
import {
  resolvePipelineDueDateChangeRecipients,
  resolvePipelineProjectStatusChangeRecipients,
  resolvePipelineReviewStatusChangeRecipients,
  resolveProjMgrEmailsForField,
} from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import { resolveConsultantEmailsForField } from '@/lib/project-pipeline/notifications/resolve-recipients';
import {
  resolvePipelineSlackRecipientsForReviewChange,
  type PipelineSlackRecipient,
} from '@/lib/project-pipeline/notifications/resolve-slack-recipients';
import { schedulePipelineReviewCalendarEventsAsync } from '@/lib/project-pipeline/notifications/schedule-review-calendar-event';
import {
  isProjectPipelineReviewStatusChangesRequested,
  PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS,
} from '@/lib/project-pipeline/review-workflow';
import { isProjectPipelineJobProjMgr } from '@/lib/project-pipeline/review-todos';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import type { ProjectPipelineReviewNoteType } from '@/lib/project-pipeline/review-notes';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type PipelineManagedUserRow = ManagedUserWorkloadAuthorRow &
  ManagedUserSlackEmailRow & {
    pipeline_email_preferences?: unknown;
    pipeline_slack_preferences?: unknown;
  };

export type NotifyPipelineJobChangesInput = {
  existingJob: ProjectPipelineJob | null | undefined;
  savedJob: ProjectPipelineJob;
  actorEmail?: string | null;
  actorDisplayName: string;
  managedUsers: readonly PipelineManagedUserRow[];
  reviewAction?: ProjectPipelineReviewNoteType;
  reviewActionNote?: string;
};

function isSubmitForReviewTransition(previousStatus: string, newStatus: string): boolean {
  const previous = normalizeProjectPipelineReviewStatus(previousStatus);
  const next = normalizeProjectPipelineReviewStatus(newStatus);
  return (
    next === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS &&
    previous !== PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS
  );
}

function isResubmitTransition(previousStatus: string, newStatus: string): boolean {
  const previous = normalizeProjectPipelineReviewStatus(previousStatus);
  const next = normalizeProjectPipelineReviewStatus(newStatus);
  return (
    next === PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS &&
    isProjectPipelineReviewStatusChangesRequested(previous)
  );
}

function normalizeActorEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? '';
}

function ensureSubmitReviewPmRecipients(
  input: NotifyPipelineJobChangesInput,
  recipients: string[],
  preferenceKey: PipelineEmailPreferenceKey,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  const isSubmitPreference =
    preferenceKey === 'submitForReview' || preferenceKey === 'resubmitForReview';
  if (!isSubmitPreference) return recipients;

  const actorEmail = input.actorEmail?.trim();
  if (!actorEmail) return recipients;

  const actorNormalized = normalizeActorEmail(actorEmail);
  if (recipients.some((email) => normalizeActorEmail(email) === actorNormalized)) {
    return recipients;
  }

  if (
    !isProjectPipelineJobProjMgr(input.savedJob, input.actorDisplayName) ||
    !isPipelineEmailEnabledForUser(actorEmail, preferenceKey, emailPrefsMap)
  ) {
    return recipients;
  }

  return [...recipients, actorEmail];
}

function filterReviewStatusRecipients(
  input: NotifyPipelineJobChangesInput,
  change: { previousValue: string; newValue: string },
  preferenceKey: PipelineEmailPreferenceKey,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  const resolved = resolvePipelineReviewStatusChangeRecipients({
    appraiserConsultant: input.savedJob.appraiserConsultant,
    projMgr: input.savedJob.projMgr,
    previousStatus: change.previousValue,
    newStatus: change.newValue,
    managedUsers: input.managedUsers,
    actorEmail: input.actorEmail,
  });

  if (preferenceKey === 'submitForReview') {
    return ensureSubmitReviewPmRecipients(
      input,
      filterRecipientsByEmailPreference(resolved, 'submitForReview', emailPrefsMap),
      preferenceKey,
      emailPrefsMap
    );
  }

  if (preferenceKey === 'resubmitForReview') {
    return ensureSubmitReviewPmRecipients(
      input,
      filterRecipientsByEmailPreference(resolved, 'resubmitForReview', emailPrefsMap),
      preferenceKey,
      emailPrefsMap
    );
  }

  if (isProjectPipelineReviewStatusChangesRequested(change.newValue)) {
    return filterRecipientsByEmailPreference(resolved, 'reviewStatusChange', emailPrefsMap);
  }

  const consultantPool = new Set(
    resolveConsultantEmailsForField(
      input.savedJob.appraiserConsultant,
      input.managedUsers
    ).map((email) => normalizeActorEmail(email))
  );
  const pmPool = new Set(
    resolveProjMgrEmailsForField(input.savedJob.projMgr, input.managedUsers).map((email) =>
      normalizeActorEmail(email)
    )
  );

  return resolved.filter((email) => {
    const normalized = normalizeActorEmail(email);
    const consultantChannel =
      consultantPool.has(normalized) &&
      isPipelineEmailEnabledForUser(email, 'reviewStatusChange', emailPrefsMap);
    const pmChannel =
      pmPool.has(normalized) &&
      isPipelineEmailEnabledForUser(email, 'pmReviewStatusChange', emailPrefsMap);
    return consultantChannel || pmChannel;
  });
}

function filterStakeholderRecipients(
  input: NotifyPipelineJobChangesInput,
  consultantPreferenceKey: Extract<
    PipelineEmailPreferenceKey,
    'dueDateChange' | 'projectStatusChange'
  >,
  projMgrPreferenceKey: Extract<
    PipelineEmailPreferenceKey,
    'pmDueDateChange' | 'pmProjectStatusChange'
  >,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>,
  resolveRecipients: typeof resolvePipelineDueDateChangeRecipients
): string[] {
  const consultantPool = new Set(
    resolveConsultantEmailsForField(
      input.savedJob.appraiserConsultant,
      input.managedUsers
    ).map((email) => normalizeActorEmail(email))
  );
  const pmPool = new Set(
    resolveProjMgrEmailsForField(input.savedJob.projMgr, input.managedUsers).map((email) =>
      normalizeActorEmail(email)
    )
  );

  return resolveRecipients({
    appraiserConsultant: input.savedJob.appraiserConsultant,
    projMgr: input.savedJob.projMgr,
    managedUsers: input.managedUsers,
    actorEmail: input.actorEmail,
  }).filter((email) => {
    const normalized = normalizeActorEmail(email);
    const consultantChannel =
      consultantPool.has(normalized) &&
      isPipelineEmailEnabledForUser(email, consultantPreferenceKey, emailPrefsMap);
    const pmChannel =
      pmPool.has(normalized) &&
      isPipelineEmailEnabledForUser(email, projMgrPreferenceKey, emailPrefsMap);
    return consultantChannel || pmChannel;
  });
}

function filterStakeholderSlackRecipients(
  input: NotifyPipelineJobChangesInput,
  consultantPreferenceKey: Extract<
    PipelineSlackPreferenceKey,
    'dueDateChange' | 'projectStatusChange'
  >,
  projMgrPreferenceKey: Extract<
    PipelineSlackPreferenceKey,
    'pmDueDateChange' | 'pmProjectStatusChange'
  >,
  slackPrefsMap: ReadonlyMap<string, PipelineSlackPreferences>,
  resolveRecipients: typeof resolvePipelineDueDateChangeRecipients
): PipelineSlackRecipient[] {
  const consultantPool = new Set(
    resolveConsultantEmailsForField(
      input.savedJob.appraiserConsultant,
      input.managedUsers
    ).map((email) => normalizeActorEmail(email))
  );
  const pmPool = new Set(
    resolveProjMgrEmailsForField(input.savedJob.projMgr, input.managedUsers).map((email) =>
      normalizeActorEmail(email)
    )
  );

  const emails = resolveRecipients({
    appraiserConsultant: input.savedJob.appraiserConsultant,
    projMgr: input.savedJob.projMgr,
    managedUsers: input.managedUsers,
    actorEmail: input.actorEmail,
  }).filter((email) => {
    const normalized = normalizeActorEmail(email);
    const consultantChannel =
      consultantPool.has(normalized) &&
      isPipelineSlackEnabledForUser(email, consultantPreferenceKey, slackPrefsMap);
    const pmChannel =
      pmPool.has(normalized) &&
      isPipelineSlackEnabledForUser(email, projMgrPreferenceKey, slackPrefsMap);
    return consultantChannel || pmChannel;
  });

  return emails.map((email) => ({ email }));
}

function filterReviewStatusSlackRecipients(
  input: NotifyPipelineJobChangesInput,
  change: { previousValue: string; newValue: string },
  preferenceKey: PipelineSlackPreferenceKey,
  slackPrefsMap: ReadonlyMap<string, PipelineSlackPreferences>
): PipelineSlackRecipient[] {
  const resolved = resolvePipelineSlackRecipientsForReviewChange({
    job: input.savedJob,
    previousStatus: change.previousValue,
    newStatus: change.newValue,
    managedUsers: input.managedUsers,
    actorEmail: input.actorEmail,
  });

  if (preferenceKey === 'submitForReview' || preferenceKey === 'resubmitForReview') {
    const enabledEmails = ensureSubmitReviewPmSlackRecipients(
      input,
      filterRecipientsBySlackPreference(
        resolved.map((recipient) => recipient.email),
        preferenceKey,
        slackPrefsMap
      ),
      preferenceKey,
      slackPrefsMap
    );
    const enabled = new Set(enabledEmails.map((email) => normalizeActorEmail(email)));
    return resolved.filter((recipient) =>
      enabled.has(normalizeActorEmail(recipient.email))
    );
  }

  if (isProjectPipelineReviewStatusChangesRequested(change.newValue)) {
    const enabled = new Set(
      filterRecipientsBySlackPreference(
        resolved.map((recipient) => recipient.email),
        'reviewStatusChange',
        slackPrefsMap
      ).map((email) => normalizeActorEmail(email))
    );
    return resolved.filter((recipient) => enabled.has(normalizeActorEmail(recipient.email)));
  }

  const consultantPool = new Set(
    resolveConsultantEmailsForField(
      input.savedJob.appraiserConsultant,
      input.managedUsers
    ).map((email) => normalizeActorEmail(email))
  );
  const pmPool = new Set(
    resolveProjMgrEmailsForField(input.savedJob.projMgr, input.managedUsers).map((email) =>
      normalizeActorEmail(email)
    )
  );

  return resolved.filter((recipient) => {
    const normalized = normalizeActorEmail(recipient.email);
    const consultantChannel =
      consultantPool.has(normalized) &&
      isPipelineSlackEnabledForUser(recipient.email, 'reviewStatusChange', slackPrefsMap);
    const pmChannel =
      pmPool.has(normalized) &&
      isPipelineSlackEnabledForUser(recipient.email, 'pmReviewStatusChange', slackPrefsMap);
    return consultantChannel || pmChannel;
  });
}

function sendPipelineSlackToRecipients(
  accountEmails: readonly string[],
  managedUsers: readonly ManagedUserSlackEmailRow[],
  context: Parameters<typeof buildPipelineSlackJobContext>[0]
): void {
  const deliveryEmails = resolveSlackDeliveryEmailsForAccounts(accountEmails, managedUsers);
  for (const deliveryEmail of deliveryEmails) {
    notifyPipelineSlackDm(deliveryEmail, buildPipelineSlackJobContext(context));
  }
}

function ensureSubmitReviewPmSlackRecipients(
  input: NotifyPipelineJobChangesInput,
  recipients: string[],
  preferenceKey: PipelineSlackPreferenceKey,
  slackPrefsMap: ReadonlyMap<string, PipelineSlackPreferences>
): string[] {
  const isSubmitPreference =
    preferenceKey === 'submitForReview' || preferenceKey === 'resubmitForReview';
  if (!isSubmitPreference) return recipients;

  const actorEmail = input.actorEmail?.trim();
  if (!actorEmail) return recipients;

  const actorNormalized = normalizeActorEmail(actorEmail);
  if (recipients.some((email) => normalizeActorEmail(email) === actorNormalized)) {
    return recipients;
  }

  if (
    !isProjectPipelineJobProjMgr(input.savedJob, input.actorDisplayName) ||
    !isPipelineSlackEnabledForUser(actorEmail, preferenceKey, slackPrefsMap)
  ) {
    return recipients;
  }

  return [...recipients, actorEmail];
}

function filterDueDateRecipients(
  input: NotifyPipelineJobChangesInput,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  return filterStakeholderRecipients(
    input,
    'dueDateChange',
    'pmDueDateChange',
    emailPrefsMap,
    resolvePipelineDueDateChangeRecipients
  );
}

function filterProjectStatusRecipients(
  input: NotifyPipelineJobChangesInput,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  return filterStakeholderRecipients(
    input,
    'projectStatusChange',
    'pmProjectStatusChange',
    emailPrefsMap,
    resolvePipelineProjectStatusChangeRecipients
  );
}

function resolveReviewEmailPreferenceKey(
  previousStatus: string,
  newStatus: string,
  reviewAction?: ProjectPipelineReviewNoteType
): PipelineEmailPreferenceKey {
  const resubmit =
    reviewAction === 'resubmit' || isResubmitTransition(previousStatus, newStatus);
  const submit =
    reviewAction === 'submit_for_review' ||
    reviewAction === 'resubmit' ||
    isSubmitForReviewTransition(previousStatus, newStatus);

  if (submit && resubmit) return 'resubmitForReview';
  if (submit) return 'submitForReview';
  return 'reviewStatusChange';
}

function findLatestReviewNote(
  job: ProjectPipelineJob,
  type: Extract<ProjectPipelineReviewNoteType, 'submit_for_review' | 'resubmit'>
) {
  return [...(job.reviewNotes ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .find((note) => note.type === type);
}

function filterSubmissionReceiptRecipients(
  actorEmail: string | null | undefined,
  preferenceKey: Extract<
    PipelineEmailPreferenceKey,
    'submitForReviewReceipt' | 'resubmitForReviewReceipt'
  >,
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  const actor = actorEmail?.trim();
  if (!actor) return [];
  return filterRecipientsByEmailPreference([actor], preferenceKey, emailPrefsMap);
}

function sendSubmissionReceiptEmail(input: {
  savedJob: ProjectPipelineJob;
  actorEmail?: string | null;
  reviewActionNote?: string;
  resubmit: boolean;
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>;
}): void {
  if (!isPipelineEmailEnabled()) return;

  const preferenceKey = input.resubmit ? 'resubmitForReviewReceipt' : 'submitForReviewReceipt';
  const noteType = input.resubmit ? 'resubmit' : 'submit_for_review';
  const recipients = filterSubmissionReceiptRecipients(
    input.actorEmail,
    preferenceKey,
    input.emailPrefsMap
  );
  if (!recipients.length) return;

  const latestNote = findLatestReviewNote(input.savedJob, noteType);
  const submittedAt = latestNote?.createdAt ?? new Date().toISOString();
  const note = input.reviewActionNote?.trim() || latestNote?.note?.trim() || '';

  const { subject, html } = input.resubmit
    ? buildResubmitForReviewReceiptEmail({
        job: input.savedJob,
        submittedAt,
        note,
      })
    : buildSubmitForReviewReceiptEmail({
        job: input.savedJob,
        submittedAt,
        note,
      });

  notifyPipelineEmail({ to: recipients, subject, html });
}

function shouldSkipProjectStatusNotificationForSubmit(
  changes: readonly ProjectPipelineJobChange[],
  change: Extract<ProjectPipelineJobChange, { type: 'projectStatus' }>
): boolean {
  if (change.newValue !== 'In Review') return false;

  const reviewChange = changes.find((item) => item.type === 'reviewStatus');
  if (!reviewChange || reviewChange.type !== 'reviewStatus') return false;

  const nextReview = normalizeProjectPipelineReviewStatus(reviewChange.newValue);
  if (nextReview !== PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS) return false;

  const previousReview = normalizeProjectPipelineReviewStatus(reviewChange.previousValue);
  return (
    previousReview !== PROJECT_PIPELINE_SUBMIT_REVIEW_STATUS ||
    isProjectPipelineReviewStatusChangesRequested(previousReview)
  );
}

export async function notifyPipelineJobChanges(
  input: NotifyPipelineJobChangesInput
): Promise<void> {
  const changes = detectProjectPipelineJobChanges(input.existingJob, input.savedJob);
  if (!changes.length) return;

  const actorDisplayName = input.actorDisplayName?.trim() || 'A team member';
  const emailPrefsMap = buildPipelineEmailPreferencesMap(input.managedUsers);
  const slackPrefsMap = buildPipelineSlackPreferencesMap(input.managedUsers);

  for (const change of changes) {
    if (change.type === 'reviewStatus') {
      const resubmit =
        input.reviewAction === 'resubmit' ||
        isResubmitTransition(change.previousValue, change.newValue);
      const submit =
        input.reviewAction === 'submit_for_review' ||
        input.reviewAction === 'resubmit' ||
        isSubmitForReviewTransition(change.previousValue, change.newValue);

      const preferenceKey = resolveReviewEmailPreferenceKey(
        change.previousValue,
        change.newValue,
        input.reviewAction
      );
      const reviewRecipients = filterReviewStatusRecipients(
        input,
        change,
        preferenceKey,
        emailPrefsMap
      );

      if (!reviewRecipients.length) {
        console.warn(
          '[pipeline-email] no review recipients resolved for job',
          input.savedJob.jobNumber,
          change.newValue,
          {
            actorEmail: input.actorEmail,
            appraiserConsultant: input.savedJob.appraiserConsultant,
            projMgr: input.savedJob.projMgr,
            emailEnabled: isPipelineEmailEnabled(),
          }
        );
      } else if (!isPipelineEmailEnabled()) {
        console.warn(
          '[pipeline-email] review recipients resolved but email sending is disabled',
          input.savedJob.jobNumber,
          reviewRecipients
        );
      } else {
        const { subject, html } =
          submit && resubmit
            ? buildResubmitForReviewEmail({
                job: input.savedJob,
                actorDisplayName,
                note: input.reviewActionNote,
              })
            : submit
              ? buildSubmitForReviewEmail({
                  job: input.savedJob,
                  actorDisplayName,
                  note: input.reviewActionNote,
                })
              : buildReviewStatusChangeEmail({
                  job: input.savedJob,
                  previousStatus: change.previousValue,
                  newStatus: change.newValue,
                  actorDisplayName,
                });

        notifyPipelineEmail({ to: reviewRecipients, subject, html });
      }

      if (submit || resubmit) {
        sendSubmissionReceiptEmail({
          savedJob: input.savedJob,
          actorEmail: input.actorEmail,
          reviewActionNote: input.reviewActionNote,
          resubmit,
          emailPrefsMap,
        });
      }

      const slackRecipients = filterReviewStatusSlackRecipients(
        input,
        change,
        preferenceKey,
        slackPrefsMap
      );

      const headline = resubmit
        ? 'Resubmitted for review'
        : submit
          ? 'Submitted for review'
          : `Review status: ${change.newValue || 'updated'}`;
      const detailLines = input.reviewActionNote?.trim()
        ? [`Note: ${input.reviewActionNote.trim()}`]
        : undefined;

      sendPipelineSlackToRecipients(
        slackRecipients.map((recipient) => recipient.email),
        input.managedUsers,
        {
        jobNumber: input.savedJob.jobNumber,
        client: input.savedJob.client,
        propertyLocation: input.savedJob.propertyLocation,
        headline,
        detailLines,
      });

      if (submit || resubmit) {
        schedulePipelineReviewCalendarEventsAsync({
          job: input.savedJob,
          actorDisplayName,
          note: input.reviewActionNote,
          resubmit,
          managedUsers: input.managedUsers,
        });
      }

      continue;
    }

    if (change.type === 'dueDate') {
      const recipients = filterDueDateRecipients(input, emailPrefsMap);

      if (!recipients.length) {
        console.warn(
          '[pipeline-email] no due date recipients resolved for job',
          input.savedJob.jobNumber,
          input.savedJob.appraiserConsultant,
          input.savedJob.projMgr
        );
      } else {
        const { subject, html } = buildDueDateChangeEmail({
          job: input.savedJob,
          previousDueDate: change.previousValue,
          newDueDate: change.newValue,
          actorDisplayName,
        });
        notifyPipelineEmail({ to: recipients, subject, html });
      }

      const slackRecipients = filterStakeholderSlackRecipients(
        input,
        'dueDateChange',
        'pmDueDateChange',
        slackPrefsMap,
        resolvePipelineDueDateChangeRecipients
      );

      sendPipelineSlackToRecipients(
        slackRecipients.map((recipient) => recipient.email),
        input.managedUsers,
        {
        jobNumber: input.savedJob.jobNumber,
        client: input.savedJob.client,
        propertyLocation: input.savedJob.propertyLocation,
        headline: `Due date updated to ${change.newValue || '—'}`,
        detailLines: [`Was: ${change.previousValue || '—'}`],
      });

      continue;
    }

    if (change.type === 'projectStatus') {
      if (shouldSkipProjectStatusNotificationForSubmit(changes, change)) {
        continue;
      }

      const recipients = filterProjectStatusRecipients(input, emailPrefsMap);

      if (!recipients.length) {
        console.warn(
          '[pipeline-email] no project status recipients resolved for job',
          input.savedJob.jobNumber,
          change.newValue,
          {
            actorEmail: input.actorEmail,
            appraiserConsultant: input.savedJob.appraiserConsultant,
            projMgr: input.savedJob.projMgr,
            emailEnabled: isPipelineEmailEnabled(),
          }
        );
      } else if (!isPipelineEmailEnabled()) {
        console.warn(
          '[pipeline-email] project status recipients resolved but email sending is disabled',
          input.savedJob.jobNumber,
          recipients
        );
      } else {
        const { subject, html } = buildProjectStatusChangeEmail({
          job: input.savedJob,
          previousStatus: change.previousValue,
          newStatus: change.newValue,
          actorDisplayName,
        });
        notifyPipelineEmail({ to: recipients, subject, html });
      }

      const slackRecipients = filterStakeholderSlackRecipients(
        input,
        'projectStatusChange',
        'pmProjectStatusChange',
        slackPrefsMap,
        resolvePipelineProjectStatusChangeRecipients
      );

      sendPipelineSlackToRecipients(
        slackRecipients.map((recipient) => recipient.email),
        input.managedUsers,
        {
        jobNumber: input.savedJob.jobNumber,
        client: input.savedJob.client,
        propertyLocation: input.savedJob.propertyLocation,
        headline: `Project status: ${change.newValue || 'updated'}`,
        detailLines: [`Was: ${change.previousValue || '—'}`],
      });
    }
  }
}

/** Fire-and-forget — never blocks the API response. */
export function notifyPipelineJobChangesAsync(input: NotifyPipelineJobChangesInput): void {
  void notifyPipelineJobChanges(input).catch((err) => {
    console.error('[pipeline-email] notify failed:', err);
  });
}
