import {
  canEditProjectPipelineJob,
  dedupeProjectPipelineJobs,
  findProjectPipelineJobForEdit,
  matchesProjectPipelineJobRef,
  upsertProjectPipelineJobInList,
} from '@/lib/project-pipeline/resolve-job-for-edit';
import { PROJECT_PIPELINE_ALL_SHEETS_TAB } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-103A-01',
    client: 'Client',
    propertyLocation: 'Belle Center, OH',
    appraiserConsultant: 'Luke',
    projMgr: 'Shari',
    contractStart: '01/09/2026',
    dueDate: '03/01/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 38,
    pipelineSheetName: '2026 Jobs',
    ...overrides,
  };
}

describe('resolve-job-for-edit', () => {
  it('matches jobs by job number within a sheet tab', () => {
    const job = sampleJob();
    expect(matchesProjectPipelineJobRef(job, { ...job, sheetRowIndex: 99 }, '2026 Jobs')).toBe(
      true
    );
  });

  it('matches jobs by job number and sheet tab in all-years view', () => {
    const job2026 = sampleJob({ jobNumber: '26-103A-01', pipelineSheetName: '2026 Jobs' });
    const job2025 = sampleJob({ jobNumber: '26-103A-01', pipelineSheetName: '2025 Jobs' });

    expect(
      matchesProjectPipelineJobRef(job2026, { ...job2026, sheetRowIndex: 99 }, PROJECT_PIPELINE_ALL_SHEETS_TAB)
    ).toBe(true);
    expect(
      matchesProjectPipelineJobRef(job2026, job2025, PROJECT_PIPELINE_ALL_SHEETS_TAB)
    ).toBe(false);
  });

  it('allows admins to edit even when the job is missing from the loaded list', () => {
    expect(
      canEditProjectPipelineJob({
        job: sampleJob(),
        sheetName: '2026 Jobs',
        visibleJobs: [],
        pipelineViewAll: false,
        isAdmin: true,
      })
    ).toBe(true);
  });

  it('requires assigned consultants to see the job in the visible list', () => {
    const job = sampleJob({ appraiserConsultant: 'Luke' });
    expect(
      canEditProjectPipelineJob({
        job,
        sheetName: '2026 Jobs',
        visibleJobs: [job],
        pipelineViewAll: false,
        isAdmin: false,
      })
    ).toBe(true);
    expect(
      canEditProjectPipelineJob({
        job,
        sheetName: '2026 Jobs',
        visibleJobs: [],
        pipelineViewAll: false,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('checks assignment against a single Supabase row without loading the full pipeline', () => {
    const job = sampleJob({ appraiserConsultant: 'Luke' });
    expect(
      canEditProjectPipelineJob({
        job,
        sheetName: '2026 Jobs',
        existingJob: job,
        viewerDisplayName: 'Luke Marran',
        pipelineViewAll: false,
        isAdmin: false,
      })
    ).toBe(true);
    expect(
      canEditProjectPipelineJob({
        job,
        sheetName: '2026 Jobs',
        existingJob: job,
        viewerDisplayName: 'Greg',
        pipelineViewAll: false,
        isAdmin: false,
      })
    ).toBe(false);
  });

  it('finds jobs by job number when row indexes differ', () => {
    const visible = sampleJob({ sheetRowIndex: 12 });
    const editing = sampleJob({ sheetRowIndex: 38 });
    expect(findProjectPipelineJobForEdit([visible], editing, '2026 Jobs')).toEqual(visible);
  });

  it('dedupes repeated jobs in all-years view', () => {
    const job = sampleJob({ jobNumber: '26-TEST-06', uiSourceOfTruth: true, sheetRowIndex: 0 });
    const duplicate = { ...job, client: 'Stale' };

    expect(
      dedupeProjectPipelineJobs([job, duplicate, duplicate, duplicate], PROJECT_PIPELINE_ALL_SHEETS_TAB)
    ).toEqual([job]);
  });

  it('upserts created jobs instead of appending duplicates', () => {
    const existing = sampleJob({ jobNumber: '26-TEST-06', client: 'Old' });
    const created = sampleJob({
      jobNumber: '26-TEST-06',
      client: 'New',
      uiSourceOfTruth: true,
      sheetRowIndex: 0,
    });

    expect(upsertProjectPipelineJobInList([existing], created, PROJECT_PIPELINE_ALL_SHEETS_TAB)).toEqual([
      created,
    ]);
  });

  it('treats UI-created jobs with different job numbers as distinct refs', () => {
    const first = sampleJob({
      jobNumber: '26-TEST-06',
      uiSourceOfTruth: true,
      sheetRowIndex: 0,
      client: 'TEST',
    });
    const second = sampleJob({
      jobNumber: '26-TEST-07',
      uiSourceOfTruth: true,
      sheetRowIndex: 0,
      client: 'TEST',
    });

    expect(matchesProjectPipelineJobRef(first, second, PROJECT_PIPELINE_ALL_SHEETS_TAB)).toBe(false);
    expect(upsertProjectPipelineJobInList([first], second, PROJECT_PIPELINE_ALL_SHEETS_TAB)).toEqual([
      first,
      second,
    ]);
  });
});
