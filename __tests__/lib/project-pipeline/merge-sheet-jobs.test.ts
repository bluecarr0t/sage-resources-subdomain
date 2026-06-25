import { mergeSheetJobsWithSupabaseOverrides } from '@/lib/project-pipeline/fetch-from-supabase';
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

describe('mergeSheetJobsWithSupabaseOverrides', () => {
  it('prefers UI workflow fields while refreshing sheet-owned columns', () => {
    const sheetJob = sampleJob({ client: 'Sheet Client', dueDate: '03/01/2026' });
    const uiJob = sampleJob({
      client: 'UI Client',
      dueDate: '04/15/2026',
      uiSourceOfTruth: true,
      projectStatus: 'Cancelled',
      projectStatusManual: true,
    });

    const merged = mergeSheetJobsWithSupabaseOverrides(
      [sheetJob],
      new Map(),
      new Map([[sheetJob.jobNumber, uiJob]])
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.client).toBe('Sheet Client');
    expect(merged[0]?.dueDate).toBe('04/15/2026');
    expect(merged[0]?.projectStatus).toBe('Cancelled');
  });

  it('preserves manual project status when the sheet has completion signals', () => {
    const sheetJob = sampleJob({
      dateCompleted: '4/5/26',
      sentToClient: 'Yes',
      appraiserConsultant: 'Luke',
    });
    const uiJob = sampleJob({
      dateCompleted: '',
      sentToClient: 'No',
      uiSourceOfTruth: true,
      projectStatus: 'In-Progress',
      projectStatusManual: true,
      appraiserConsultant: 'Luke',
    });

    const merged = mergeSheetJobsWithSupabaseOverrides(
      [sheetJob],
      new Map(),
      new Map([[sheetJob.jobNumber, uiJob]])
    );

    expect(merged[0]?.projectStatus).toBe('In-Progress');
    expect(merged[0]?.projectStatusManual).toBe(true);
    expect(merged[0]?.sentToClient).toBe('No');
  });

  it('merges stored project status for non-UI jobs', () => {
    const sheetJob = sampleJob({ projectStatus: 'In-Progress' });

    const merged = mergeSheetJobsWithSupabaseOverrides(
      [sheetJob],
      new Map([
        [
          sheetJob.jobNumber,
          { projectStatus: 'Completed', projectStatusManual: true, flag: 'None', notes: '' },
        ],
      ]),
      new Map()
    );

    expect(merged[0]?.projectStatus).toBe('Completed');
  });

  it('appends UI-only jobs that are missing from the sheet', () => {
    const uiJob = sampleJob({
      jobNumber: '26-TEST-06',
      client: 'TEST',
      uiSourceOfTruth: true,
      sheetRowIndex: 0,
      pipelineSheetName: '2026 Jobs',
    });

    const merged = mergeSheetJobsWithSupabaseOverrides(
      [],
      new Map(),
      new Map([[uiJob.jobNumber, uiJob]])
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.jobNumber).toBe('26-TEST-06');
    expect(merged[0]?.client).toBe('TEST');
  });
});
