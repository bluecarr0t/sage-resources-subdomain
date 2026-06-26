import {
  assertProjectPipelineJobFieldEditsAllowed,
  canEditProjectPipelineDueDate,
  canEditProjectPipelineReviewStatus,
  canEditProjectPipelineSentToClient,
  canDeleteProjectPipelineJob,
  canManuallyEditProjectPipelineStatus,
  canSetProjectPipelineSentToClientYes,
  getAllowedSentToClientOptions,
} from '@/lib/project-pipeline/job-edit-permissions';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '01/01/2026',
    dueDate: '03/01/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Appraisal',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'greg',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('job edit permissions', () => {
  it('allows the assigned consultant to set sent to client to Yes', () => {
    expect(canSetProjectPipelineSentToClientYes(sampleJob(), 'Greg Garwood')).toBe(true);
    expect(getAllowedSentToClientOptions(sampleJob(), 'Greg')).toEqual(['No', 'Yes']);
  });

  it('blocks non-authors from choosing Yes', () => {
    expect(canSetProjectPipelineSentToClientYes(sampleJob(), 'Shari')).toBe(false);
    expect(getAllowedSentToClientOptions(sampleJob(), 'Shari')).toEqual(['No']);
  });

  it('locks sent to client when already Yes for non-authors', () => {
    expect(
      getAllowedSentToClientOptions(sampleJob({ sentToClient: 'Yes' }), 'Shari')
    ).toEqual(['Yes']);
  });

  it('allows admins to change sent to client even when already Yes', () => {
    const sentYes = sampleJob({ sentToClient: 'Yes' });
    expect(canEditProjectPipelineSentToClient(sentYes, 'Shari', { isAdmin: true })).toBe(true);
    expect(getAllowedSentToClientOptions(sentYes, 'Shari', { isAdmin: true })).toEqual([
      'No',
      'Yes',
    ]);
    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        sentYes,
        sampleJob({ sentToClient: 'No' }),
        'Shari',
        { isAdmin: true }
      )
    ).not.toThrow();
  });

  it('allows all users to edit due date in the modal', () => {
    expect(canEditProjectPipelineDueDate(sampleJob(), 'Greg')).toBe(true);
    expect(canEditProjectPipelineDueDate(sampleJob(), 'Shari')).toBe(true);
  });

  it('blocks the assigned consultant from editing review status', () => {
    expect(canEditProjectPipelineReviewStatus(sampleJob(), 'Greg')).toBe(false);
    expect(canEditProjectPipelineReviewStatus(sampleJob(), 'Shari')).toBe(true);
  });

  it('allows admins to edit review status on their own assigned jobs', () => {
    expect(
      canEditProjectPipelineReviewStatus(sampleJob(), 'Greg', { isAdmin: true })
    ).toBe(true);
  });

  it('allows only managed admins to manually edit project status', () => {
    expect(canManuallyEditProjectPipelineStatus({ role: 'admin' } as const)).toBe(true);
    expect(canManuallyEditProjectPipelineStatus({ role: 'author' } as const)).toBe(false);
    expect(canManuallyEditProjectPipelineStatus(null)).toBe(false);
  });

  it('rejects unauthorized sent-to-client and review-status changes on save', () => {
    const previous = sampleJob();
    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ sentToClient: 'Yes' }),
        'Shari'
      )
    ).toThrow(/sent to client/i);

    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ dueDate: '04/01/2026' }),
        'Shari'
      )
    ).not.toThrow();

    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ reviewStatus: 'In Review' }),
        'Greg'
      )
    ).toThrow(/review status/i);

    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ reviewStatus: 'In Review' }),
        'Greg',
        { isAdmin: true }
      )
    ).not.toThrow();

    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ flag: 'Attention' }),
        'Shari'
      )
    ).toThrow(/flag/i);

    expect(() =>
      assertProjectPipelineJobFieldEditsAllowed(
        previous,
        sampleJob({ flag: 'Attention' }),
        'Shari',
        { isAdmin: true }
      )
    ).not.toThrow();
  });

  it('allows only admins to delete projects', () => {
    expect(canDeleteProjectPipelineJob({ role: 'admin' })).toBe(true);
    expect(canDeleteProjectPipelineJob({ role: 'consultant' })).toBe(false);
    expect(canDeleteProjectPipelineJob(null)).toBe(false);
  });
});
