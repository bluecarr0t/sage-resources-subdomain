import {
  isPipelineEmailEnabledForUser,
  buildPipelineEmailPreferencesMap,
  type PipelineEmailPreferenceKey,
  type PipelineEmailPreferences,
} from '@/lib/project-pipeline/notifications/email-preferences';
import {
  isPipelineSlackEnabledForUser,
  buildPipelineSlackPreferencesMap,
  type PipelineSlackPreferenceKey,
  type PipelineSlackPreferences,
} from '@/lib/project-pipeline/notifications/slack-preferences';
import { resolveConsultantEmailsForField } from '@/lib/project-pipeline/notifications/resolve-recipients';
import { resolveProjMgrEmailsForField } from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import type { PipelineDueDateReminderType } from '@/lib/project-pipeline/due-date-reminders/types';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export function pipelineDueDateReminderPreferenceKeys(
  reminderType: PipelineDueDateReminderType
): {
  consultant: PipelineEmailPreferenceKey;
  projectManager: PipelineEmailPreferenceKey;
  slackConsultant: PipelineSlackPreferenceKey;
  slackProjectManager: PipelineSlackPreferenceKey;
} {
  switch (reminderType) {
    case 'upcoming':
      return {
        consultant: 'dueDateReminderUpcoming',
        projectManager: 'pmDueDateReminderUpcoming',
        slackConsultant: 'dueDateReminderUpcoming',
        slackProjectManager: 'pmDueDateReminderUpcoming',
      };
    case 'due_today':
      return {
        consultant: 'dueDateReminderDueToday',
        projectManager: 'pmDueDateReminderDueToday',
        slackConsultant: 'dueDateReminderDueToday',
        slackProjectManager: 'pmDueDateReminderDueToday',
      };
    case 'overdue':
      return {
        consultant: 'dueDateReminderOverdue',
        projectManager: 'pmDueDateReminderOverdue',
        slackConsultant: 'dueDateReminderOverdue',
        slackProjectManager: 'pmDueDateReminderOverdue',
      };
  }
}

export function buildPipelineDueDateReminderEmailPrefsMap(
  rows: readonly { email?: string | null; pipeline_email_preferences?: unknown }[]
): Map<string, PipelineEmailPreferences> {
  return buildPipelineEmailPreferencesMap(rows);
}

export function buildPipelineDueDateReminderSlackPrefsMap(
  rows: readonly { email?: string | null; pipeline_slack_preferences?: unknown }[]
): Map<string, PipelineSlackPreferences> {
  return buildPipelineSlackPreferencesMap(rows);
}

export function filterPipelineDueDateReminderRecipients(input: {
  job: ProjectPipelineJob;
  reminderType: PipelineDueDateReminderType;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>;
}): string[] {
  const keys = pipelineDueDateReminderPreferenceKeys(input.reminderType);
  const recipients = new Set<string>();

  for (const email of resolveConsultantEmailsForField(
    input.job.appraiserConsultant,
    input.managedUsers
  )) {
    if (isPipelineEmailEnabledForUser(email, keys.consultant, input.emailPrefsMap)) {
      recipients.add(email);
    }
  }

  for (const email of resolveProjMgrEmailsForField(input.job.projMgr, input.managedUsers)) {
    if (isPipelineEmailEnabledForUser(email, keys.projectManager, input.emailPrefsMap)) {
      recipients.add(email);
    }
  }

  return [...recipients];
}

export function filterPipelineDueDateReminderSlackRecipients(input: {
  job: ProjectPipelineJob;
  reminderType: PipelineDueDateReminderType;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  slackPrefsMap: ReadonlyMap<string, PipelineSlackPreferences>;
}): string[] {
  const keys = pipelineDueDateReminderPreferenceKeys(input.reminderType);
  const recipients = new Set<string>();

  for (const email of resolveConsultantEmailsForField(
    input.job.appraiserConsultant,
    input.managedUsers
  )) {
    if (isPipelineSlackEnabledForUser(email, keys.slackConsultant, input.slackPrefsMap)) {
      recipients.add(email);
    }
  }

  for (const email of resolveProjMgrEmailsForField(input.job.projMgr, input.managedUsers)) {
    if (
      isPipelineSlackEnabledForUser(email, keys.slackProjectManager, input.slackPrefsMap)
    ) {
      recipients.add(email);
    }
  }

  return [...recipients];
}
