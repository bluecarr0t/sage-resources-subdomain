/**
 * @jest-environment node
 */

const mockUpsertGoogleCalendarEvent = jest.fn().mockResolvedValue('event-123');

jest.mock('@/lib/google-calendar/upsert-event', () => ({
  upsertGoogleCalendarEvent: (...args: unknown[]) => mockUpsertGoogleCalendarEvent(...args),
}));

jest.mock('@/lib/google-calendar/config', () => ({
  isPipelineCalendarEnabled: jest.fn(() => true),
  getGoogleCalendarTimezone: jest.fn(() => 'America/New_York'),
  getPipelineCalendarTestRecipient: jest.fn(() => 'harsell@sageoutdooradvisory.com'),
}));

import { schedulePipelineReviewCalendarEvents } from '@/lib/project-pipeline/notifications/schedule-review-calendar-event';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '7/15/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'In-Progress',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    pipelineSheetName: '2026 Jobs',
    ...overrides,
  };
}

describe('schedulePipelineReviewCalendarEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a calendar event for the test recipient override', async () => {
    await schedulePipelineReviewCalendarEvents({
      job: sampleJob(),
      actorDisplayName: 'Luke Marran',
      note: 'Ready for review.',
      managedUsers: [
        {
          email: 'heilala@sageoutdooradvisory.com',
          display_name: 'Shari Heilala',
          first_name: 'Shari',
          last_name: 'Heilala',
        },
      ],
    });

    expect(mockUpsertGoogleCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarUserEmail: 'harsell@sageoutdooradvisory.com',
        event: expect.objectContaining({
          summary: expect.stringContaining('Review: Job #26-100A-01'),
        }),
      })
    );
  });
});
