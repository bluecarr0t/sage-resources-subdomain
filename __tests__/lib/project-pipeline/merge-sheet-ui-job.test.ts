import { mergeSheetJobWithUiEditedJob } from '@/lib/project-pipeline/merge-sheet-ui-job';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Sheet Client',
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

describe('mergeSheetJobWithUiEditedJob', () => {
  it('preserves UI-edited workflow fields during sheet sync', () => {
    const sheetJob = sampleJob({
      client: 'Updated Sheet Client',
      reviewStatus: 'Approved',
      sentToClient: 'Yes',
      dueDate: '05/01/2026',
    });
    const uiJob = sampleJob({
      client: 'Old Client',
      reviewStatus: 'In-Progress',
      sentToClient: 'No',
      dueDate: '04/15/2026',
      projectStatus: 'In-Progress',
      projectStatusManual: true,
      flag: 'Attention',
      notes: 'UI note',
      uiSourceOfTruth: true,
    });

    const merged = mergeSheetJobWithUiEditedJob(sheetJob, uiJob);

    expect(merged.client).toBe('Updated Sheet Client');
    expect(merged.reviewStatus).toBe('In-Progress');
    expect(merged.sentToClient).toBe('No');
    expect(merged.dueDate).toBe('04/15/2026');
    expect(merged.projectStatus).toBe('In-Progress');
    expect(merged.projectStatusManual).toBe(true);
    expect(merged.flag).toBe('Attention');
    expect(merged.notes).toBe('UI note');
    expect(merged.uiSourceOfTruth).toBe(true);
  });

  it('derives project status for non-manual UI rows', () => {
    const sheetJob = sampleJob({ appraiserConsultant: 'Greg' });
    const uiJob = sampleJob({
      appraiserConsultant: 'Greg',
      sentToClient: 'Yes',
      projectStatus: 'Not Started',
      uiSourceOfTruth: true,
    });

    const merged = mergeSheetJobWithUiEditedJob(sheetJob, uiJob);

    expect(merged.projectStatus).toBe('Completed');
  });
});
