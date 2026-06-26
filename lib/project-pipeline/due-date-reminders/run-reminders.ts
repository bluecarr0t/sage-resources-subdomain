import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildDueDateDueTodayReminderEmail,
  buildDueDateOverdueReminderEmail,
  buildDueDateUpcomingReminderEmail,
} from '@/lib/email/pipeline-email-templates';
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
import { isPipelineDueDateRemindersEnabled } from '@/lib/project-pipeline/due-date-reminders/config';
import {
  fetchPipelineDueReminderSentKeys,
  pipelineDueReminderDispatchKey,
  recordPipelineDueReminderSent,
} from '@/lib/project-pipeline/due-date-reminders/dedupe';
import {
  isProjectPipelineJobEligibleForDueDateReminder,
  projectPipelineJobDueDateYmd,
} from '@/lib/project-pipeline/due-date-reminders/eligibility';
import {
  buildPipelineDueDateReminderEmailPrefsMap,
  buildPipelineDueDateReminderSlackPrefsMap,
  filterPipelineDueDateReminderRecipients,
  filterPipelineDueDateReminderSlackRecipients,
} from '@/lib/project-pipeline/due-date-reminders/recipients';
import { getPipelineDueDateRemindersForDay } from '@/lib/project-pipeline/due-date-reminders/schedule';
import type { PipelineDueDateReminderType } from '@/lib/project-pipeline/due-date-reminders/types';
import { loadActiveManagedUsersForPipeline } from '@/lib/project-pipeline/notifications/load-managed-users';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type RunPipelineDueDateRemindersResult = {
  enabled: boolean;
  todayYmd: string;
  jobsScanned: number;
  emailsSent: number;
  slackDmsSent: number;
  skippedAlreadySent: number;
  skippedNoRecipients: number;
  skippedIneligible: number;
};

function buildReminderSlackHeadline(reminderType: PipelineDueDateReminderType): string {
  switch (reminderType) {
    case 'upcoming':
      return 'Due date reminder: due soon';
    case 'due_today':
      return 'Due date reminder: due today';
    case 'overdue':
      return 'Due date reminder: past due';
  }
}

function buildReminderEmail(
  reminderType: PipelineDueDateReminderType,
  job: ProjectPipelineJob
): { subject: string; html: string } {
  switch (reminderType) {
    case 'upcoming':
      return buildDueDateUpcomingReminderEmail({ job });
    case 'due_today':
      return buildDueDateDueTodayReminderEmail({ job });
    case 'overdue':
      return buildDueDateOverdueReminderEmail({ job });
  }
}

export async function runPipelineDueDateReminders(
  supabase: SupabaseClient,
  options: { now?: Date; env?: NodeJS.ProcessEnv } = {}
): Promise<RunPipelineDueDateRemindersResult> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  const todayYmd = formatPipelineReminderDateYmd(now);

  const base: RunPipelineDueDateRemindersResult = {
    enabled: false,
    todayYmd,
    jobsScanned: 0,
    emailsSent: 0,
    slackDmsSent: 0,
    skippedAlreadySent: 0,
    skippedNoRecipients: 0,
    skippedIneligible: 0,
  };

  if (!isPipelineDueDateRemindersEnabled(env)) {
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
  const emailPrefsMap = buildPipelineDueDateReminderEmailPrefsMap(managedUsers);
  const slackPrefsMap = buildPipelineDueDateReminderSlackPrefsMap(managedUsers);

  const result: RunPipelineDueDateRemindersResult = {
    ...base,
    enabled: true,
    jobsScanned: jobs.length,
  };

  for (const job of jobs) {
    if (!isProjectPipelineJobEligibleForDueDateReminder(job)) {
      result.skippedIneligible += 1;
      continue;
    }

    const dueDateYmd = projectPipelineJobDueDateYmd(job);
    if (!dueDateYmd) {
      result.skippedIneligible += 1;
      continue;
    }

    const sheetName = job.pipelineSheetName?.trim() ?? '';
    const jobNumber = job.jobNumber.trim();
    if (!sheetName || !jobNumber) {
      result.skippedIneligible += 1;
      continue;
    }

    const dispatches = getPipelineDueDateRemindersForDay({ dueDateYmd, todayYmd });
    if (!dispatches.length) continue;

    const sentKeys = await fetchPipelineDueReminderSentKeys(supabase, {
      sheetId,
      sheetName,
      jobNumber,
      dueDateSnapshot: dueDateYmd,
    });

    for (const dispatch of dispatches) {
      const dispatchKey = pipelineDueReminderDispatchKey(dispatch);
      if (sentKeys.has(dispatchKey)) {
        result.skippedAlreadySent += 1;
        continue;
      }

      const emailRecipients = emailEnabled
        ? filterPipelineDueDateReminderRecipients({
            job,
            reminderType: dispatch.reminderType,
            managedUsers,
            emailPrefsMap,
          })
        : [];
      const slackRecipients = slackEnabled
        ? filterPipelineDueDateReminderSlackRecipients({
            job,
            reminderType: dispatch.reminderType,
            managedUsers,
            slackPrefsMap,
          })
        : [];

      if (!emailRecipients.length && !slackRecipients.length) {
        result.skippedNoRecipients += 1;
        continue;
      }

      if (emailRecipients.length) {
        const { subject, html } = buildReminderEmail(dispatch.reminderType, job);
        notifyPipelineEmail({ to: emailRecipients, subject, html });
        result.emailsSent += 1;
      }

      if (slackRecipients.length) {
        const slackMessage = buildPipelineSlackJobContext({
          jobNumber: job.jobNumber,
          client: job.client,
          propertyLocation: job.propertyLocation,
          headline: buildReminderSlackHeadline(dispatch.reminderType),
          detailLines: [`Due date: ${job.dueDate || '—'}`],
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

      await recordPipelineDueReminderSent(supabase, {
        sheetId,
        sheetName,
        jobNumber,
        dueDateSnapshot: dueDateYmd,
        dispatch,
      });

      sentKeys.add(dispatchKey);
    }
  }

  return result;
}
