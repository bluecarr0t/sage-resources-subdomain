import {
  buildPipelineReviewCalendarEvent,
  resolvePipelineReviewCalendarStartParts,
} from '@/lib/project-pipeline/notifications/build-review-calendar-event';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Nick',
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

describe('resolvePipelineReviewCalendarStartParts', () => {
  it('uses the due date at 9am when it is still in the future', () => {
    const start = resolvePipelineReviewCalendarStartParts(
      '7/15/26',
      new Date('2026-06-24T15:00:00.000Z'),
      'America/New_York'
    );

    expect(start).toEqual({ date: '2026-07-15', time: '09:00' });
  });

  it('falls back to the next weekday when the due date has passed', () => {
    const start = resolvePipelineReviewCalendarStartParts(
      '3/1/26',
      new Date('2026-06-24T15:00:00.000Z'),
      'America/New_York'
    );

    expect(start.date).toBe('2026-06-25');
    expect(start.time).toBe('09:00');
  });
});

describe('buildPipelineReviewCalendarEvent', () => {
  it('builds a 30-minute review event with job context', () => {
    const event = buildPipelineReviewCalendarEvent({
      job: sampleJob(),
      actorDisplayName: 'Luke Marran',
      note: 'Ready for review.',
      recipientEmail: 'harsell@sageoutdooradvisory.com',
      timeZone: 'America/New_York',
      now: new Date('2026-06-24T15:00:00.000Z'),
      siteUrl: 'https://resources.sageoutdooradvisory.com',
    });

    expect(event.summary).toContain('Review: Job #26-100A-01');
    expect(event.start).toEqual({
      dateTime: '2026-07-15T09:00:00',
      timeZone: 'America/New_York',
    });
    expect(event.end).toEqual({
      dateTime: '2026-07-15T09:30:00',
      timeZone: 'America/New_York',
    });
    expect(event.description).toContain('Ready for review.');
    expect(event.description).toContain('/admin/job-pipeline');
    expect(event.extendedProperties?.private?.sagePipelineReviewRecipient).toBe(
      'harsell@sageoutdooradvisory.com'
    );
  });
});
