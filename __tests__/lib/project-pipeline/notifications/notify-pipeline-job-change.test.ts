/**
 * @jest-environment node
 */

const mockNotifyPipelineEmail = jest.fn();

jest.mock('@/lib/email/resend-client', () => ({
  notifyPipelineEmail: (...args: unknown[]) => mockNotifyPipelineEmail(...args),
  isPipelineEmailEnabled: jest.fn(() => true),
}));

const mockNotifyPipelineSlackDm = jest.fn();

jest.mock('@/lib/slack/pipeline-slack-client', () => ({
  notifyPipelineSlackDm: (...args: unknown[]) => mockNotifyPipelineSlackDm(...args),
  buildPipelineSlackJobContext: jest.fn(() => ({ text: 'slack message' })),
}));

const mockSchedulePipelineReviewCalendarEventsAsync = jest.fn();

jest.mock('@/lib/project-pipeline/notifications/schedule-review-calendar-event', () => ({
  schedulePipelineReviewCalendarEventsAsync: (...args: unknown[]) =>
    mockSchedulePipelineReviewCalendarEventsAsync(...args),
}));

import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { notifyPipelineJobChanges } from '@/lib/project-pipeline/notifications/notify-pipeline-job-change';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '4/1/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Changes Requested',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    sheetRowIndex: 2,
    ...overrides,
  };
}

const managedUsers = [
  {
    email: 'marran@sageoutdooradvisory.com',
    display_name: 'Luke Marran',
    first_name: 'Luke',
    last_name: 'Marran',
  },
];

describe('notifyPipelineJobChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends review status and due date emails to consultants', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({
        reviewStatus: '',
        dueDate: '3/20/26',
        projectStatus: 'In Progress',
        projectStatusManual: true,
      }),
      savedJob: sampleJob({
        reviewStatus: 'Changes Requested',
        dueDate: '4/1/26',
        projectStatus: 'In Progress',
        projectStatusManual: true,
      }),
      actorEmail: 'heilala@sageoutdooradvisory.com',
      actorDisplayName: 'Shari Heilala',
      managedUsers,
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledTimes(2);
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Review update'),
      })
    );
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Due date updated'),
      })
    );
  });

  it('sends a dedicated submit-for-review email to the project manager', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({ reviewStatus: '', projMgr: 'Shari' }),
      savedJob: sampleJob({ reviewStatus: 'In-Progress', projMgr: 'Shari' }),
      actorEmail: 'marran@sageoutdooradvisory.com',
      actorDisplayName: 'Luke Marran',
      managedUsers: [
        ...managedUsers,
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
      reviewAction: 'submit_for_review',
      reviewActionNote: 'Ready for your review.',
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledTimes(2);
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['heilala@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Review request'),
      })
    );
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Receipt: Submitted for review'),
      })
    );
    expect(mockSchedulePipelineReviewCalendarEventsAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        job: expect.objectContaining({ jobNumber: '26-100A-01' }),
        resubmit: false,
        note: 'Ready for your review.',
      })
    );
  });

  it('sends submit-for-review email when the project manager is also the submitter', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({
        reviewStatus: '',
        appraiserConsultant: 'Nick Harsell',
        projMgr: 'Nick Harsell',
      }),
      savedJob: sampleJob({
        reviewStatus: 'In-Progress',
        appraiserConsultant: 'Nick Harsell',
        projMgr: 'Nick Harsell',
      }),
      actorEmail: 'harsell@sageoutdooradvisory.com',
      actorDisplayName: 'Nick Harsell',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
        },
        {
          email: 'cipriano@sageoutdooradvisory.com',
          display_name: 'Nick Cipriano',
          first_name: 'Nick',
          last_name: 'Cipriano',
        },
      ],
      reviewAction: 'submit_for_review',
      reviewActionNote: 'Ready for review.',
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledTimes(2);
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['harsell@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Review request'),
      })
    );
    expect(mockNotifyPipelineEmail).not.toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['cipriano@sageoutdooradvisory.com'],
      })
    );
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['harsell@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Receipt: Submitted for review'),
      })
    );
  });

  it('sends resubmit emails to the project manager and consultant receipt', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({ reviewStatus: 'Changes Requested', projMgr: 'Shari' }),
      savedJob: sampleJob({ reviewStatus: 'In-Progress', projMgr: 'Shari' }),
      actorEmail: 'marran@sageoutdooradvisory.com',
      actorDisplayName: 'Luke Marran',
      managedUsers: [
        ...managedUsers,
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
      reviewAction: 'resubmit',
      reviewActionNote: 'Addressed your feedback.',
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledTimes(2);
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['heilala@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Resubmission:'),
      })
    );
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Receipt: Resubmitted for review'),
      })
    );
  });

  it('sends review update email when a project manager approves a submission', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({
        reviewStatus: 'In-Progress',
        appraiserConsultant: 'Luke Marran',
        projMgr: 'Shari',
      }),
      savedJob: sampleJob({
        reviewStatus: 'Approved - No Changes, Send to Client',
        appraiserConsultant: 'Luke Marran',
        projMgr: 'Shari',
      }),
      actorEmail: 'heilala@sageoutdooradvisory.com',
      actorDisplayName: 'Shari Heilala',
      managedUsers: [
        ...managedUsers,
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
      reviewAction: 'review_feedback',
      reviewActionNote: 'Looks good to send.',
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Review update'),
      })
    );
  });

  it('sends review update email when the reviewer is also the consultant on a test job', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({
        reviewStatus: 'In-Progress',
        appraiserConsultant: 'Nick Harsell',
        projMgr: 'Nick Harsell',
      }),
      savedJob: sampleJob({
        reviewStatus: 'Changes Requested',
        appraiserConsultant: 'Nick Harsell',
        projMgr: 'Nick Harsell',
      }),
      actorEmail: 'harsell@sageoutdooradvisory.com',
      actorDisplayName: 'Nick Harsell',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
        },
      ],
      reviewAction: 'review_feedback',
      reviewActionNote: 'Please fix the scope section.',
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['harsell@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Review update'),
      })
    );
  });

  it('sends project status email when a job is marked completed', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({
        sentToClient: 'No',
        reviewStatus: 'In-Progress',
      }),
      savedJob: sampleJob({
        sentToClient: 'Yes',
        reviewStatus: 'In-Progress',
      }),
      actorEmail: 'heilala@sageoutdooradvisory.com',
      actorDisplayName: 'Shari Heilala',
      managedUsers: [
        ...managedUsers,
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['marran@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Project status updated'),
      })
    );
  });

  it('does nothing when there are no changes', async () => {
    const job = sampleJob();
    await notifyPipelineJobChanges({
      existingJob: job,
      savedJob: { ...job },
      actorEmail: 'heilala@sageoutdooradvisory.com',
      actorDisplayName: 'Shari Heilala',
      managedUsers,
    });

    expect(mockNotifyPipelineEmail).not.toHaveBeenCalled();
  });

  it('skips due date email when recipient disabled dueDateChange', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({ reviewStatus: '', dueDate: '3/20/26' }),
      savedJob: sampleJob({ reviewStatus: '', dueDate: '4/1/26' }),
      actorEmail: 'heilala@sageoutdooradvisory.com',
      actorDisplayName: 'Shari Heilala',
      managedUsers: [
        {
          ...managedUsers[0],
          pipeline_email_preferences: {
            submitForReview: true,
            resubmitForReview: true,
            pmReviewStatusChange: true,
            pmDueDateChange: true,
            pmProjectStatusChange: true,
            reviewStatusChange: true,
            dueDateChange: false,
            projectStatusChange: true,
          },
          pipeline_slack_preferences: {
            submitForReview: true,
            resubmitForReview: true,
            pmReviewStatusChange: true,
            pmDueDateChange: true,
            pmProjectStatusChange: true,
            reviewStatusChange: true,
            dueDateChange: false,
            projectStatusChange: true,
          },
        },
      ],
    });

    expect(mockNotifyPipelineEmail).not.toHaveBeenCalled();
    expect(mockNotifyPipelineSlackDm).not.toHaveBeenCalled();
  });

  it('skips consultant due date email while still notifying project manager', async () => {
    await notifyPipelineJobChanges({
      existingJob: sampleJob({ reviewStatus: '', dueDate: '3/20/26' }),
      savedJob: sampleJob({ reviewStatus: '', dueDate: '4/1/26' }),
      actorEmail: 'admin@sageoutdooradvisory.com',
      actorDisplayName: 'Admin User',
      managedUsers: [
        {
          ...managedUsers[0],
          pipeline_email_preferences: {
            submitForReview: true,
            resubmitForReview: true,
            pmReviewStatusChange: true,
            pmDueDateChange: true,
            pmProjectStatusChange: true,
            reviewStatusChange: true,
            dueDateChange: false,
            projectStatusChange: true,
          },
        },
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
          pipeline_email_preferences: {
            submitForReview: true,
            resubmitForReview: true,
            pmReviewStatusChange: true,
            pmDueDateChange: true,
            pmProjectStatusChange: true,
            reviewStatusChange: true,
            dueDateChange: false,
            projectStatusChange: true,
          },
        },
      ],
    });

    expect(mockNotifyPipelineEmail).toHaveBeenCalledTimes(1);
    expect(mockNotifyPipelineEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['heilala@sageoutdooradvisory.com'],
        subject: expect.stringContaining('Due date updated'),
      })
    );
  });
});
