import { upsertGoogleCalendarEvent } from '@/lib/google-calendar/upsert-event';
import {
  getGoogleCalendarTimezone,
  getPipelineCalendarTestRecipient,
  isPipelineCalendarEnabled,
} from '@/lib/google-calendar/config';
import { buildPipelineReviewCalendarEvent } from '@/lib/project-pipeline/notifications/build-review-calendar-event';
import { resolveProjMgrEmailsForField } from '@/lib/project-pipeline/notifications/resolve-review-recipients';
import type { PipelineManagedUserRow } from '@/lib/project-pipeline/notifications/notify-pipeline-job-change';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type SchedulePipelineReviewCalendarEventsInput = {
  job: ProjectPipelineJob;
  actorDisplayName: string;
  note?: string;
  resubmit?: boolean;
  managedUsers: readonly PipelineManagedUserRow[];
};

function resolveCalendarRecipientEmails(
  projMgr: string | null | undefined,
  managedUsers: readonly PipelineManagedUserRow[]
): string[] {
  const testRecipient = getPipelineCalendarTestRecipient();
  if (testRecipient) {
    return [testRecipient];
  }

  return resolveProjMgrEmailsForField(projMgr, managedUsers);
}

export async function schedulePipelineReviewCalendarEvents(
  input: SchedulePipelineReviewCalendarEventsInput
): Promise<void> {
  if (!isPipelineCalendarEnabled()) return;

  const recipients = resolveCalendarRecipientEmails(input.job.projMgr, input.managedUsers);
  if (!recipients.length) {
    console.warn(
      '[pipeline-calendar] no project manager calendar recipient for job',
      input.job.jobNumber,
      input.job.projMgr
    );
    return;
  }

  const timeZone = getGoogleCalendarTimezone();

  for (const recipientEmail of recipients) {
    try {
      const event = buildPipelineReviewCalendarEvent({
        job: input.job,
        actorDisplayName: input.actorDisplayName,
        note: input.note,
        resubmit: input.resubmit,
        recipientEmail,
        timeZone,
      });

      const eventId = await upsertGoogleCalendarEvent({
        calendarUserEmail: recipientEmail,
        event,
      });

      console.info(
        '[pipeline-calendar] created review event',
        eventId ?? '(unknown id)',
        'for',
        recipientEmail,
        input.job.jobNumber
      );
    } catch (error) {
      console.error(
        '[pipeline-calendar] failed to create event for',
        recipientEmail,
        input.job.jobNumber,
        error
      );
    }
  }
}

export function schedulePipelineReviewCalendarEventsAsync(
  input: SchedulePipelineReviewCalendarEventsInput
): void {
  void schedulePipelineReviewCalendarEvents(input).catch((error) => {
    console.error('[pipeline-calendar] schedule failed:', error);
  });
}
