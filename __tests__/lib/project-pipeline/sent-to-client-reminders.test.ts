import { firstBusinessDayAfterYmd } from '@/lib/project-pipeline/due-date-reminders/business-days';
import { isPipelineSentToClientRemindersEnabled } from '@/lib/project-pipeline/sent-to-client-reminders/config';
import {
  isProjectPipelineJobEligibleForSentToClientReminder,
  projectPipelineApprovalYmd,
  shouldSendPipelineSentToClientReminderOnDay,
} from '@/lib/project-pipeline/sent-to-client-reminders/eligibility';
import { buildReviewStatusChangeEmail, buildSentToClientReminderEmail } from '@/lib/email/pipeline-email-templates';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '',
    dueDate: '06/29/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Approved - No Changes, Send to Client',
    sentToClient: 'No',
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    pipelineSheetName: '2026',
    ...overrides,
  };
}

describe('isPipelineSentToClientRemindersEnabled', () => {
  it('is disabled unless explicitly enabled', () => {
    expect(isPipelineSentToClientRemindersEnabled({})).toBe(false);
    expect(
      isPipelineSentToClientRemindersEnabled({
        PIPELINE_SENT_TO_CLIENT_REMINDERS_ENABLED: 'false',
      })
    ).toBe(false);
    expect(
      isPipelineSentToClientRemindersEnabled({
        PIPELINE_SENT_TO_CLIENT_REMINDERS_ENABLED: 'true',
      })
    ).toBe(true);
  });
});

describe('isProjectPipelineJobEligibleForSentToClientReminder', () => {
  it('requires approved review and Sent to Client not Yes', () => {
    expect(isProjectPipelineJobEligibleForSentToClientReminder(sampleJob())).toBe(true);
    expect(
      isProjectPipelineJobEligibleForSentToClientReminder(
        sampleJob({ reviewStatus: 'In-Progress' })
      )
    ).toBe(false);
    expect(
      isProjectPipelineJobEligibleForSentToClientReminder(sampleJob({ sentToClient: 'Yes' }))
    ).toBe(false);
    expect(
      isProjectPipelineJobEligibleForSentToClientReminder(
        sampleJob({ projectStatus: 'Completed' })
      )
    ).toBe(false);
    expect(
      isProjectPipelineJobEligibleForSentToClientReminder(
        sampleJob({ projectStatus: 'Cancelled' })
      )
    ).toBe(false);
    expect(
      isProjectPipelineJobEligibleForSentToClientReminder(sampleJob({ dateCompleted: '07/01/26' }))
    ).toBe(false);
  });
});

describe('shouldSendPipelineSentToClientReminderOnDay', () => {
  it('waits until the next business day after approval', () => {
    const approvalYmd = '2026-07-23'; // Thursday
    const firstEligible = firstBusinessDayAfterYmd(approvalYmd); // Friday
    expect(firstEligible).toBe('2026-07-24');

    expect(
      shouldSendPipelineSentToClientReminderOnDay({ approvalYmd, todayYmd: approvalYmd })
    ).toBe(false);
    expect(
      shouldSendPipelineSentToClientReminderOnDay({ approvalYmd, todayYmd: firstEligible })
    ).toBe(true);
    expect(
      shouldSendPipelineSentToClientReminderOnDay({
        approvalYmd,
        todayYmd: '2026-07-25', // Saturday
      })
    ).toBe(false);
    expect(
      shouldSendPipelineSentToClientReminderOnDay({
        approvalYmd,
        todayYmd: '2026-07-27', // Monday
      })
    ).toBe(true);
  });

  it('allows backlog jobs with unknown approval date on business days', () => {
    expect(
      shouldSendPipelineSentToClientReminderOnDay({
        approvalYmd: null,
        todayYmd: '2026-07-24',
      })
    ).toBe(true);
    expect(
      shouldSendPipelineSentToClientReminderOnDay({
        approvalYmd: null,
        todayYmd: '2026-07-25',
      })
    ).toBe(false);
  });
});

describe('projectPipelineApprovalYmd', () => {
  it('uses the latest approved review_feedback note', () => {
    const ymd = projectPipelineApprovalYmd(
      sampleJob({
        reviewNotes: [
          {
            id: '1',
            type: 'review_feedback',
            note: 'Approved',
            reviewStatus: 'Approved - No Changes, Send to Client',
            createdAt: '2026-07-22T15:00:00.000Z',
            createdByEmail: 'pm@example.com',
            createdByDisplayName: 'PM',
          },
          {
            id: '2',
            type: 'review_feedback',
            note: 'Approved again',
            reviewStatus: 'Approved - Minor Changes, Then Send to Client',
            createdAt: '2026-07-23T15:00:00.000Z',
            createdByEmail: 'pm@example.com',
            createdByDisplayName: 'PM',
          },
        ],
      })
    );
    expect(ymd).toBe('2026-07-23');
  });

  it('returns null when no approved feedback note exists', () => {
    expect(projectPipelineApprovalYmd(sampleJob({ reviewNotes: [] }))).toBeNull();
  });
});

describe('sent-to-client email templates', () => {
  it('includes Sent to Client CTA on approved review-status emails', () => {
    const { html, subject } = buildReviewStatusChangeEmail({
      job: sampleJob(),
      previousStatus: 'In-Progress',
      newStatus: 'Approved - No Changes, Send to Client',
      actorDisplayName: 'Shari Heilala',
    });

    expect(subject).toContain('Review update');
    expect(html).toContain('Approved — mark Sent to Client');
    expect(html).toContain('Sent to Client = Yes');
  });

  it('does not include Sent to Client CTA for non-approved review updates', () => {
    const { html } = buildReviewStatusChangeEmail({
      job: sampleJob({ reviewStatus: 'Changes Requested' }),
      previousStatus: 'In-Progress',
      newStatus: 'Changes Requested',
      actorDisplayName: 'Shari Heilala',
    });

    expect(html).toContain('Review status updated');
    expect(html).not.toContain('Sent to Client = Yes');
  });

  it('builds scheduled reminder email copy', () => {
    const { subject, html } = buildSentToClientReminderEmail({ job: sampleJob() });
    expect(subject).toContain('Mark Sent to Client');
    expect(html).toContain('Reminder: mark Sent to Client');
    expect(html).toContain('Sent to Client = Yes');
  });
});
