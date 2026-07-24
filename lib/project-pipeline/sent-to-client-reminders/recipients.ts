import {
  isPipelineEmailEnabledForUser,
  buildPipelineEmailPreferencesMap,
  type PipelineEmailPreferences,
} from '@/lib/project-pipeline/notifications/email-preferences';
import {
  isPipelineSlackEnabledForUser,
  buildPipelineSlackPreferencesMap,
  type PipelineSlackPreferences,
} from '@/lib/project-pipeline/notifications/slack-preferences';
import { resolveConsultantEmailsForField } from '@/lib/project-pipeline/notifications/resolve-recipients';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export function buildPipelineSentToClientReminderEmailPrefsMap(
  rows: readonly { email?: string | null; pipeline_email_preferences?: unknown }[]
): Map<string, PipelineEmailPreferences> {
  return buildPipelineEmailPreferencesMap(rows);
}

export function buildPipelineSentToClientReminderSlackPrefsMap(
  rows: readonly { email?: string | null; pipeline_slack_preferences?: unknown }[]
): Map<string, PipelineSlackPreferences> {
  return buildPipelineSlackPreferencesMap(rows);
}

/** Assigned consultant / author only. */
export function filterPipelineSentToClientReminderRecipients(input: {
  job: ProjectPipelineJob;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  emailPrefsMap: ReadonlyMap<string, PipelineEmailPreferences>;
}): string[] {
  const recipients = new Set<string>();

  for (const email of resolveConsultantEmailsForField(
    input.job.appraiserConsultant,
    input.managedUsers
  )) {
    if (isPipelineEmailEnabledForUser(email, 'sentToClientReminder', input.emailPrefsMap)) {
      recipients.add(email);
    }
  }

  return [...recipients];
}

export function filterPipelineSentToClientReminderSlackRecipients(input: {
  job: ProjectPipelineJob;
  managedUsers: readonly ManagedUserWorkloadAuthorRow[];
  slackPrefsMap: ReadonlyMap<string, PipelineSlackPreferences>;
}): string[] {
  const recipients = new Set<string>();

  for (const email of resolveConsultantEmailsForField(
    input.job.appraiserConsultant,
    input.managedUsers
  )) {
    if (isPipelineSlackEnabledForUser(email, 'sentToClientReminder', input.slackPrefsMap)) {
      recipients.add(email);
    }
  }

  return [...recipients];
}
