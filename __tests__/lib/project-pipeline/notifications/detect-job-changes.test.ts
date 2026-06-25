import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { detectProjectPipelineJobChanges } from '@/lib/project-pipeline/notifications/detect-job-changes';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '3/20/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('detectProjectPipelineJobChanges', () => {
  it('returns no changes when previous job is missing', () => {
    expect(detectProjectPipelineJobChanges(null, sampleJob())).toEqual([]);
  });

  it('returns no changes when review status and due date are unchanged', () => {
    const job = sampleJob();
    expect(detectProjectPipelineJobChanges(job, { ...job })).toEqual([]);
  });

  it('detects review status changes with normalization', () => {
    const previous = sampleJob({ reviewStatus: 'Not Started' });
    const next = sampleJob({ reviewStatus: 'Changes Requested' });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([
      {
        type: 'reviewStatus',
        previousValue: '',
        newValue: 'Changes Requested',
      },
      {
        type: 'projectStatus',
        previousValue: 'In-Progress',
        newValue: 'In Review',
      },
    ]);
  });

  it('detects due date changes across sheet formats', () => {
    const previous = sampleJob({ dueDate: '3/20/26' });
    const next = sampleJob({ dueDate: '03/20/2026' });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([]);
  });

  it('detects due date changes when value actually changes', () => {
    const previous = sampleJob({ dueDate: '3/20/26' });
    const next = sampleJob({ dueDate: '4/1/26' });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([
      {
        type: 'dueDate',
        previousValue: '3/20/26',
        newValue: '4/1/26',
      },
    ]);
  });

  it('detects clearing a due date', () => {
    const previous = sampleJob({ dueDate: '3/20/26' });
    const next = sampleJob({ dueDate: '' });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([
      {
        type: 'dueDate',
        previousValue: '3/20/26',
        newValue: '',
      },
    ]);
  });

  it('detects derived project status changes when sent to client is updated', () => {
    const previous = sampleJob({ sentToClient: 'No', reviewStatus: 'In-Progress' });
    const next = sampleJob({
      sentToClient: 'Yes',
      reviewStatus: 'In-Progress',
    });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([
      {
        type: 'projectStatus',
        previousValue: 'In Review',
        newValue: 'Completed',
      },
    ]);
  });

  it('detects manual project status changes', () => {
    const previous = sampleJob({ projectStatus: 'In-Progress', projectStatusManual: true });
    const next = sampleJob({ projectStatus: 'On Hold', projectStatusManual: true });

    expect(detectProjectPipelineJobChanges(previous, next)).toEqual([
      {
        type: 'projectStatus',
        previousValue: 'In-Progress',
        newValue: 'On Hold',
      },
    ]);
  });
});
