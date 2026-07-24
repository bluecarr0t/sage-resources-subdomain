import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSentToClientReminderEmail } from '@/lib/email/pipeline-email-templates';
import { isPipelineEmailEnabled, notifyPipelineEmail } from '@/lib/email/resend-client';
import {
  buildPipelineSlackJobContext,
  isPipelineSlackEnabled,
  notifyPipelineSlackDm,
} from '@/lib/slack/pipeline-slack-client';
import { resolveSlackDeliveryEmailsForAccounts } from '@/lib/managed-users/slack-email';
import { fetchAllProjectPipelineJobsFromSupabase } from '@/lib/project-pipeline/fetch-from-supabase';
import { getProjectPipelineSheetId } from '@/lib/project-pipeline/fetch-jobs';
import { formatPipelineReminderDateYmd } from '@/lib/project-pipeline/due-date-reminders/business-days';
import { isPipelineSentToClientRemindersEnabled } from '@/lib/project-pipeline/sent-to-client-reminders/config';
import {
  hasPipelineSentToClientReminderBeenSent,
  recordPipelineSentToClientReminderSent,
} from '@/lib/project-pipeline/sent-to-client-reminders/dedupe';
import {
  isProjectPipelineJobEligibleForSentToClientReminder,
  projectPipelineApprovalYmd,
  shouldSendPipelineSentToClientReminderOnDay,
} from '@/lib/project-pipeline/sent-to-client-reminders/eligibility';
import {
  buildPipelineSentToClientReminderEmailPrefsMap,
  buildPipelineSentToClientReminderSlackPrefsMap,
  filterPipelineSentToClientReminderRecipients,
  filterPipelineSentToClientReminderSlackRecipients,
} from '@/lib/project-pipeline/sent-to-client-reminders/recipients';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';

export type RunPipelineSentToClientRemindersResult = {
  enabled: boolean;
  todayYmd: string;
  jobsScanned: number;
  emailsSent: number;
  slackDmsSent: number;
  skippedAlreadySent: number;
  skippedNoRecipients: number;
  skippedIneligible: number;
  skippedNotScheduled: number;
};

export async function runPipelineSentToClientReminders(
  supabase: SupabaseClient,
  options: { now?: Date; env?: NodeJS.ProcessEnv } = {}
): Promise<RunPipelineSentToClientRemindersResult> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  const todayYmd = formatPipelineReminderDateYmd(now);

  const base: RunPipelineSentToClientRemindersResult = {
    enabled: false,
    todayYmd,
    jobsScanned: 0,
    emailsSent: 0,
    slackDmsSent: 0,
    skippedAlreadySent: 0,
    skippedNoRecipients: 0,
    skippedIneligible: 0,
    skippedNotScheduled: 0,
  };

  if (!isPipelineSentToClientRemindersEnabled(env)) {
    return base;
  }

  const emailEnabled = isPipelineEmailEnabled();
  const slackEnabled = isPipelineSlackEnabled();
  if (!emailEnabled && !slackEnabled) {
    return { ...base, enabled: true };
  }

  const sheetId = getProjectPipelineSheetId(env);
  const [jobs, managedUsers] = await Promise.all([
    fetchAllProjectPipelineJobsFromSupabase(supabase, { sheetId, env }),
    loadActiveManagedUsersForPipeline(supabase),
  ]);
  const emailPrefsMap = buildPipelineSentToClientReminderEmailPrefsMap(managedUsers);
  const slackPrefsMap = buildPipelineSentToClientReminderSlackPrefsMap(managedUsers);

  const result: RunPipelineSentToClientRemindersResult = {
    ...base,
    enabled: true,
    jobsScanned: jobs.length,
  };

  for (const job of jobs) {
    if (!isProjectPipelineJobEligibleForSentToClientReminder(job)) {
      result.skippedIneligible += 1;
      continue;
    }

    const sheetName = job.pipelineSheetName?.trim() ?? '';
    const jobNumber = job.jobNumber.trim();
    if (!sheetName || !jobNumber) {
      result.skippedIneligible += 1;
      continue;
    }

    const approvalYmd = projectPipelineApprovalYmd(job);
    if (!shouldSendPipelineSentToClientReminderOnDay({ approvalYmd, todayYmd })) {
      result.skippedNotScheduled += 1;
      continue;
    }

    if (
      await hasPipelineSentToClientReminderBeenSent(supabase, {
        sheetId,
        sheetName,
        jobNumber,
        reminderDay: todayYmd,
      })
    ) {
      result.skippedAlreadySent += 1;
      continue;
    }

    const emailRecipients = emailEnabled
      ? filterPipelineSentToClientReminderRecipients({
          job,
          managedUsers,
          emailPrefsMap,
        })
      : [];
    const slackRecipients = slackEnabled
      ? filterPipelineSentToClientReminderSlackRecipients({
          job,
          managedUsers,
          slackPrefsMap,
        })
      : [];

    if (!emailRecipients.length && !slackRecipients.length) {
      result.skippedNoRecipients += 1;
      continue;
    }

    if (emailRecipients.length) {
      const { subject, html } = buildSentToClientReminderEmail({ job });
      notifyPipelineEmail({ to: emailRecipients, subject, html });
      result.emailsSent += 1;
    }

    if (slackRecipients.length) {
      const slackMessage = buildPipelineSlackJobContext({
        jobNumber: job.jobNumber,
        client: job.client,
        propertyLocation: job.propertyLocation,
        headline: 'Reminder: mark Sent to Client = Yes',
        detailLines: [
          'Review is approved. After delivery, set Sent to Client = Yes on the job.',
        ],
      });
      const deliveryEmails = resolveSlackDeliveryEmailsForAccounts(
        slackRecipients,
        managedUsers
      );
      for (const deliveryEmail of deliveryEmails) {
        notifyPipelineSlackDm(deliveryEmail, slackMessage);
      }
      result.slackDmsSent += 1;
    }

    await recordPipelineSentToClientReminderSent(supabase, {
      sheetId,
      sheetName,
      jobNumber,
      reminderDay: todayYmd,
    });
  }

  return result;
}
