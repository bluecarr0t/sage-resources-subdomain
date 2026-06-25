import {
  canUseProjectPipelineAuthorPreview,
  filterAssignedAuthorActiveJobs,
  filterJobsForDemoAuthor,
  isValidAuthorPreviewDisplayName,
  PROJECT_PIPELINE_AUTHOR_PREVIEW_EMAIL,
  PROJECT_PIPELINE_DEMO_AUTHOR,
  resolveProjectPipelineEditUser,
} from '@/lib/project-pipeline/author-preview';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-107A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '03/20/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'greg',
    clientEmail: 'client@example.com',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('canUseProjectPipelineAuthorPreview', () => {
  it('allows only harsell@sageoutdooradvisory.com', () => {
    expect(canUseProjectPipelineAuthorPreview('harsell@sageoutdooradvisory.com')).toBe(true);
    expect(canUseProjectPipelineAuthorPreview('Harsell@sageoutdooradvisory.com')).toBe(true);
    expect(canUseProjectPipelineAuthorPreview('heilala@sageoutdooradvisory.com')).toBe(false);
    expect(canUseProjectPipelineAuthorPreview('harsell@sagecommercialadvisory.com')).toBe(false);
  });
});

describe('filterJobsForDemoAuthor', () => {
  it('returns Luke-assigned jobs only', () => {
    const jobs = [
      sampleJob({ jobNumber: '26-107A-01', appraiserConsultant: 'Luke' }),
      sampleJob({
        jobNumber: '26-192A-05',
        appraiserConsultant: 'Lars / Luke',
        client: 'Marcus Hotels / Grand Geneva',
        sheetRowIndex: 3,
      }),
      sampleJob({ jobNumber: '26-105A-01', appraiserConsultant: 'Elizabeth', sheetRowIndex: 4 }),
    ];

    expect(filterJobsForDemoAuthor(jobs).map((job) => job.jobNumber)).toEqual([
      '26-107A-01',
      '26-192A-05',
    ]);
  });

  it('excludes cancelled projects', () => {
    const jobs = [
      sampleJob({ jobNumber: '26-107A-01', appraiserConsultant: 'Luke', projectStatus: 'In-Progress' }),
      sampleJob({
        jobNumber: '26-103A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Cancelled',
        sheetRowIndex: 3,
      }),
    ];

    expect(filterJobsForDemoAuthor(jobs).map((job) => job.jobNumber)).toEqual(['26-107A-01']);
  });

  it('excludes completed projects by default', () => {
    const jobs = [
      sampleJob({ jobNumber: '26-107A-01', appraiserConsultant: 'Luke', projectStatus: 'In-Progress' }),
      sampleJob({
        jobNumber: '26-200A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Completed',
        sheetRowIndex: 3,
      }),
    ];

    expect(filterJobsForDemoAuthor(jobs).map((job) => job.jobNumber)).toEqual(['26-107A-01']);
  });

  it('shows completed and cancelled projects when showAll is enabled', () => {
    const jobs = [
      sampleJob({ jobNumber: '26-107A-01', appraiserConsultant: 'Luke', projectStatus: 'In-Progress' }),
      sampleJob({
        jobNumber: '26-200A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Completed',
        sheetRowIndex: 3,
      }),
      sampleJob({
        jobNumber: '26-103A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Cancelled',
        sheetRowIndex: 4,
      }),
      sampleJob({
        jobNumber: '26-105A-01',
        appraiserConsultant: 'Elizabeth',
        projectStatus: 'Completed',
        sheetRowIndex: 5,
      }),
    ];

    expect(filterJobsForDemoAuthor(jobs, { showAll: true }).map((job) => job.jobNumber)).toEqual([
      '26-107A-01',
      '26-200A-01',
      '26-103A-01',
    ]);
  });

  it('includes completed jobs from prior-year sheet tabs in all-years view', () => {
    const jobs = [
      sampleJob({
        jobNumber: '26-107A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'In-Progress',
        pipelineSheetName: '2026 Jobs',
      }),
      sampleJob({
        jobNumber: '26-200A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Completed',
        pipelineSheetName: '2026 Jobs',
        sheetRowIndex: 3,
      }),
      sampleJob({
        jobNumber: '25-100A-01',
        appraiserConsultant: 'Luke',
        projectStatus: 'Completed',
        pipelineSheetName: '2025 Jobs',
        sheetRowIndex: 4,
      }),
      sampleJob({
        jobNumber: '25-101A-01',
        appraiserConsultant: 'Elizabeth',
        projectStatus: 'Completed',
        pipelineSheetName: '2025 Jobs',
        sheetRowIndex: 5,
      }),
    ];

    expect(filterJobsForDemoAuthor(jobs, { allYearsView: true }).map((job) => job.jobNumber)).toEqual(
      ['26-107A-01', '25-100A-01']
    );
  });
});

describe('filterAssignedAuthorActiveJobs', () => {
  it('excludes completed and cancelled projects by default', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', projectStatus: 'In-Progress' }),
      sampleJob({ jobNumber: '2', projectStatus: 'Completed', sheetRowIndex: 3 }),
      sampleJob({ jobNumber: '3', projectStatus: 'Cancelled', sheetRowIndex: 4 }),
    ];

    expect(filterAssignedAuthorActiveJobs(jobs).map((job) => job.jobNumber)).toEqual(['1']);
  });

  it('shows all statuses when showAll is enabled', () => {
    const jobs = [
      sampleJob({ jobNumber: '1', projectStatus: 'In-Progress' }),
      sampleJob({ jobNumber: '2', projectStatus: 'Completed', sheetRowIndex: 3 }),
    ];

    expect(filterAssignedAuthorActiveJobs(jobs, { showAll: true }).map((job) => job.jobNumber)).toEqual(
      ['1', '2']
    );
  });

  it('includes prior-year jobs regardless of status in all-years view', () => {
    const jobs = [
      sampleJob({
        jobNumber: '26-100A-01',
        projectStatus: 'Completed',
        pipelineSheetName: '2026 Jobs',
      }),
      sampleJob({
        jobNumber: '25-100A-01',
        projectStatus: 'Completed',
        pipelineSheetName: '2025 Jobs',
        sheetRowIndex: 3,
      }),
    ];

    expect(
      filterAssignedAuthorActiveJobs(jobs, { allYearsView: true }).map((job) => job.jobNumber)
    ).toEqual(['25-100A-01']);
  });
});

describe('resolveProjectPipelineEditUser', () => {
  it('uses demo author when harsell previews as Luke', () => {
    expect(
      resolveProjectPipelineEditUser({
        viewerEmail: PROJECT_PIPELINE_AUTHOR_PREVIEW_EMAIL,
        viewerDisplayName: 'Nick Harsell',
        previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName,
      })
    ).toEqual({
      email: PROJECT_PIPELINE_DEMO_AUTHOR.email,
      displayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName,
    });
  });

  it('ignores preview for other viewers', () => {
    expect(
      resolveProjectPipelineEditUser({
        viewerEmail: 'heilala@sageoutdooradvisory.com',
        viewerDisplayName: 'Shari Heilala',
        previewAsDisplayName: PROJECT_PIPELINE_DEMO_AUTHOR.displayName,
      })
    ).toEqual({
      email: 'heilala@sageoutdooradvisory.com',
      displayName: 'Shari Heilala',
    });
  });

  it('validates preview display name', () => {
    expect(isValidAuthorPreviewDisplayName('Luke Marran')).toBe(true);
    expect(isValidAuthorPreviewDisplayName('Someone Else')).toBe(false);
  });
});
