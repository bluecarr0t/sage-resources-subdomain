import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { filterJobsForUser, isJobAssignedToUser } from '@/lib/project-pipeline/filter-jobs';
import { extractNameAliases, fieldMatchesNameAliases, isJobAuthoredByConsultant } from '@/lib/project-pipeline/name-aliases';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Greg',
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

describe('extractNameAliases', () => {
  it('extracts first name from display name', () => {
    expect(extractNameAliases('Luke Marran')).toEqual(['Luke', 'Luke Marran']);
  });

  it('includes compound first names', () => {
    expect(extractNameAliases('Mary Claire Smith')).toEqual(['Mary', 'Mary Claire']);
  });

  it('returns empty array for missing display name', () => {
    expect(extractNameAliases(null)).toEqual([]);
    expect(extractNameAliases('   ')).toEqual([]);
  });
});

describe('isJobAuthoredByConsultant', () => {
  it('matches bare first names and full display names', () => {
    expect(isJobAuthoredByConsultant('Nick', 'Nick Cipriano')).toBe(true);
    expect(isJobAuthoredByConsultant('Nick Cipriano', 'Nick Cipriano')).toBe(true);
    expect(isJobAuthoredByConsultant('Greg', 'Greg Garwood')).toBe(true);
    expect(isJobAuthoredByConsultant('Greg Garwood', 'Greg Garwood')).toBe(true);
  });

  it('does not match a different last name on multi-word sheet values', () => {
    expect(isJobAuthoredByConsultant('Nick Harsell', 'Nick Cipriano')).toBe(false);
  });

  it('matches compound first names without last name in sheet', () => {
    expect(isJobAuthoredByConsultant('Mary Claire', 'Mary Claire Johnson')).toBe(true);
  });

  it('matches any consultant on shared appraiser cells', () => {
    expect(isJobAuthoredByConsultant('Lars / Luke', 'Luke Marran')).toBe(true);
    expect(isJobAuthoredByConsultant('Lars / Luke', 'Lars Somebody')).toBe(true);
    expect(isJobAuthoredByConsultant('Greg/Shari', 'Greg Garwood')).toBe(true);
    expect(isJobAuthoredByConsultant('Greg/Shari', 'Shari Heilala')).toBe(true);
  });
});

describe('fieldMatchesNameAliases', () => {
  it('matches case-insensitively with word boundaries', () => {
    expect(fieldMatchesNameAliases(' Luke', ['Luke'])).toBe(true);
    expect(fieldMatchesNameAliases('Mary Claire', ['Mary Claire'])).toBe(true);
    expect(fieldMatchesNameAliases('Maryland', ['Mary'])).toBe(false);
  });
});

describe('filterJobsForUser', () => {
  const jobs = [
    sampleJob({ jobNumber: '26-107A-01', appraiserConsultant: 'Luke', projMgr: 'Shari' }),
    sampleJob({ jobNumber: '26-105A-01', appraiserConsultant: 'Elizabeth', projMgr: 'Shari' }),
    sampleJob({ jobNumber: '26-112A-01', appraiserConsultant: 'Mary Claire', projMgr: '' }),
  ];

  it('returns all jobs when pipelineViewAll is true', () => {
    const visible = filterJobsForUser(jobs, {
      email: 'heilala@sageoutdooradvisory.com',
      displayName: 'Shari Heilala',
      pipelineViewAll: true,
    });
    expect(visible).toHaveLength(3);
  });

  it('returns Luke-assigned jobs only for Luke Marran', () => {
    const visible = filterJobsForUser(jobs, {
      email: 'marran@sageoutdooradvisory.com',
      displayName: 'Luke Marran',
    });
    expect(visible.map((job) => job.jobNumber)).toEqual(['26-107A-01']);
  });

  it('includes shared appraiser jobs for Luke Marran', () => {
    const sharedJobs = [
      ...jobs,
      sampleJob({
        jobNumber: '26-192A-05',
        appraiserConsultant: 'Lars / Luke',
        client: 'Marcus Hotels / Grand Geneva',
        sheetRowIndex: 4,
      }),
    ];

    const visible = filterJobsForUser(sharedJobs, {
      email: 'marran@sageoutdooradvisory.com',
      displayName: 'Luke Marran',
    });

    expect(visible.map((job) => job.jobNumber)).toEqual(['26-107A-01', '26-192A-05']);
  });

  it('returns Shari proj mgr rows for Shari', () => {
    const visible = filterJobsForUser(jobs, {
      email: 'team@sageoutdooradvisory.com',
      displayName: 'Shari Heilala',
    });
    expect(visible.map((job) => job.jobNumber)).toEqual(['26-107A-01', '26-105A-01']);
  });

  it('matches Mary Claire compound first name', () => {
    expect(
      isJobAssignedToUser(jobs[2], 'Mary Claire Johnson')
    ).toBe(true);
  });

  it('returns empty list when display name is missing for non-super viewers', () => {
    expect(
      filterJobsForUser(jobs, {
        email: 'marran@sageoutdooradvisory.com',
        displayName: null,
      })
    ).toEqual([]);
  });
});
