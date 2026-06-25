import {
  buildPipelineCurrentWorkload,
  filterCurrentWorkloadAuthorsForDisplay,
  resolveManagedUserPipelineDisplayName,
} from '@/lib/project-pipeline/current-workload';
import {
  isHiddenWorkloadManagedUser,
  isHiddenWorkloadPerson,
  isHiddenWorkloadSheetConsultant,
  preparePipelineWorkloadAuthors,
} from '@/lib/project-pipeline/workload-authors';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import { buildPipelineWorkloadSummary } from '@/lib/project-pipeline/workload';

function job(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Location',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '01/01/2026',
    dueDate: '03/01/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: '',
    clientEmail: '',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('buildPipelineCurrentWorkload', () => {
  it('groups incomplete jobs by managed author display name', () => {
    const jobs = [
      job({ jobNumber: '1', appraiserConsultant: 'Greg', dueDate: '04/01/2026' }),
      job({ jobNumber: '2', appraiserConsultant: 'Luke', dueDate: '03/01/2026' }),
      job({ jobNumber: '3', appraiserConsultant: 'Greg', dateCompleted: '01/02/2026' }),
    ];

    const result = buildPipelineCurrentWorkload(
      jobs,
      [
        { displayName: 'Greg Garwood', email: 'greg@sageoutdooradvisory.com' },
        { displayName: 'Luke Marran', email: 'luke@sageoutdooradvisory.com' },
      ],
      '2026 Jobs'
    );

    expect(result.totalIncompleteJobs).toBe(2);
    expect(result.byAuthor).toHaveLength(2);
    expect(result.byAuthor[0].name).toBe('Greg Garwood');
    expect(result.byAuthor[0].jobCount).toBe(1);
    expect(result.byAuthor[0].jobs[0].jobNumber).toBe('1');
    expect(result.byAuthor[1].name).toBe('Luke Marran');
    expect(result.byAuthor[1].jobs[0].jobNumber).toBe('2');
  });

  it('includes authors with no matching jobs', () => {
    const result = buildPipelineCurrentWorkload(
      [job({ appraiserConsultant: 'Greg' })],
      [
        { displayName: 'Greg Garwood' },
        { displayName: 'Luke Marran' },
      ],
      '2026 Jobs'
    );

    const luke = result.byAuthor.find((author) => author.name === 'Luke Marran');
    expect(luke?.jobCount).toBe(0);
    expect(luke?.jobs).toEqual([]);
  });

  it('filters by segment', () => {
    const jobs = [
      job({ jobNumber: '1', appraiserConsultant: 'Greg', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: '2', appraiserConsultant: 'Greg', commercialOutdoor: 'Commercial' }),
    ];

    const result = buildPipelineCurrentWorkload(
      jobs,
      [{ displayName: 'Greg Garwood' }],
      '2026 Jobs',
      { segmentFilter: 'Outdoor' }
    );

    expect(result.totalIncompleteJobs).toBe(1);
    expect(result.byAuthor[0].jobs).toHaveLength(1);
    expect(result.byAuthor[0].jobs[0].jobNumber).toBe('1');
  });

  it('hides Nick Harsell and routes bare Nick jobs to Nick Cipriano', () => {
    const result = buildPipelineCurrentWorkload(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Nick' }),
        job({ jobNumber: '2', appraiserConsultant: 'Greg' }),
        job({ jobNumber: '3', appraiserConsultant: 'Nick Harsell' }),
      ],
      [
        { displayName: 'Nick Harsell' },
        { displayName: 'Nick Cipriano', division: 'commercial' },
        { displayName: 'Greg Garwood' },
      ],
      '2026 Jobs'
    );

    expect(result.byAuthor.some((author) => author.name === 'Nick Harsell')).toBe(false);
    expect(result.totalIncompleteJobs).toBe(2);
    expect(result.byAuthor).toHaveLength(2);
    const nick = result.byAuthor.find((author) => author.name === 'Nick Cipriano');
    expect(nick?.jobCount).toBe(1);
    expect(nick?.jobs[0].jobNumber).toBe('1');
    expect(result.byAuthor.find((author) => author.name === 'Greg Garwood')?.jobCount).toBe(1);
  });

  it('keeps both-division authors visible with no jobs in the active segment', () => {
    const authors = filterCurrentWorkloadAuthorsForDisplay(
      [
        {
          name: 'Paco',
          email: null,
          division: 'commercial',
          jobCount: 0,
          pastDueCount: 0,
          dueSoonCount: 0,
          jobs: [],
        },
        {
          name: 'Greg Garwood',
          email: null,
          division: 'both',
          jobCount: 0,
          pastDueCount: 0,
          dueSoonCount: 0,
          jobs: [],
        },
      ],
      'Outdoor'
    );

    expect(authors.map((author) => author.name)).toEqual(['Greg Garwood']);
  });

  it('hides authors with no active jobs from current workload display', () => {
    const authors = filterCurrentWorkloadAuthorsForDisplay([
      {
        name: 'Paco',
        email: null,
        division: 'commercial',
        jobCount: 0,
        pastDueCount: 0,
        dueSoonCount: 0,
        jobs: [],
      },
      {
        name: 'Greg Garwood',
        email: null,
        division: 'outdoor',
        jobCount: 2,
        pastDueCount: 0,
        dueSoonCount: 1,
        jobs: [],
      },
    ]);

    expect(authors.map((author) => author.name)).toEqual(['Greg Garwood']);
  });

  it('consolidates duplicate author display names', () => {
    const result = buildPipelineCurrentWorkload(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Greg' }),
        job({ jobNumber: '2', appraiserConsultant: 'Greg Garwood' }),
      ],
      [
        { displayName: 'Greg Garwood', email: 'greg@sageoutdooradvisory.com' },
        { displayName: 'Greg Garwood', email: 'garwood@sagecommercialadvisory.com' },
      ],
      '2026 Jobs'
    );

    const gregRows = result.byAuthor.filter((author) => author.name === 'Greg Garwood');
    expect(gregRows).toHaveLength(1);
    expect(gregRows[0].jobCount).toBe(2);
  });
});

describe('resolveManagedUserPipelineDisplayName', () => {
  it('prefers display_name then first/last then email', () => {
    expect(
      resolveManagedUserPipelineDisplayName({
        email: 'a@example.com',
        display_name: 'Display',
        first_name: 'First',
        last_name: 'Last',
      })
    ).toBe('Display');

    expect(
      resolveManagedUserPipelineDisplayName({
        email: 'a@example.com',
        first_name: 'First',
        last_name: 'Last',
      })
    ).toBe('First Last');

    expect(
      resolveManagedUserPipelineDisplayName({
        email: 'a@example.com',
      })
    ).toBe('a@example.com');
  });
});

describe('preparePipelineWorkloadAuthors', () => {
  it('merges cross-domain users with identical first and last names', () => {
    const authors = preparePipelineWorkloadAuthors([
      {
        email: 'greg@sageoutdooradvisory.com',
        first_name: 'Greg',
        last_name: 'Garwood',
        display_name: 'Greg Garwood',
      },
      {
        email: 'garwood@sagecommercialadvisory.com',
        first_name: 'Greg',
        last_name: 'Garwood',
        display_name: 'Greg Garwood',
      },
    ]);

    expect(authors).toHaveLength(1);
    expect(authors[0].displayName).toBe('Greg Garwood');
    expect(authors[0].email).toBe('greg@sageoutdooradvisory.com');
  });

  it('filters hidden managed users from author list', () => {
    const authors = preparePipelineWorkloadAuthors([
      {
        email: 'harsell@sageoutdooradvisory.com',
        first_name: 'Nick',
        last_name: 'Harsell',
        display_name: 'Nick Harsell',
      },
      {
        email: 'greg@sageoutdooradvisory.com',
        first_name: 'Greg',
        last_name: 'Garwood',
      },
    ]);

    expect(authors).toHaveLength(1);
    expect(authors[0].displayName).toBe('Greg Garwood');
  });
});

describe('isHiddenWorkloadManagedUser', () => {
  it('matches hidden managed-user display names exactly', () => {
    expect(isHiddenWorkloadManagedUser('Sage Admin')).toBe(true);
    expect(isHiddenWorkloadManagedUser('Nick Harsell')).toBe(true);
    expect(isHiddenWorkloadManagedUser('Nick Cipriano')).toBe(false);
    expect(isHiddenWorkloadManagedUser('Greg Garwood')).toBe(false);
  });
});

describe('isHiddenWorkloadSheetConsultant', () => {
  it('matches Sage Admin, Nick Harsell variants, and Heilala aliases', () => {
    expect(isHiddenWorkloadSheetConsultant('Sage Admin')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Nick Harsell')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Nick')).toBe(false);
    expect(isHiddenWorkloadSheetConsultant('Heilala')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Multiple')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Wendy / Shari')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Shari')).toBe(false);
    expect(isHiddenWorkloadSheetConsultant('Frantz')).toBe(true);
    expect(isHiddenWorkloadSheetConsultant('Greg Garwood')).toBe(false);
  });
});

describe('isHiddenWorkloadPerson', () => {
  it('combines managed-user and sheet checks', () => {
    expect(isHiddenWorkloadPerson('Nick Harsell')).toBe(true);
    expect(isHiddenWorkloadPerson('Nick Cipriano')).toBe(false);
  });
});

describe('buildPipelineWorkloadSummary visibility', () => {
  it('filters hidden people from by-year tables', () => {
    const jobs = [
      job({ appraiserConsultant: 'Nick Harsell', projMgr: 'Shari' }),
      job({ appraiserConsultant: 'Greg', projMgr: 'Sage Admin' }),
      job({ appraiserConsultant: 'Luke', projMgr: 'Shari' }),
    ];

    const summary = buildPipelineWorkloadSummary(jobs, '2026 Jobs');

    expect(summary.byAppraiser.map((row) => row.name)).toEqual(['Greg', 'Luke']);
    expect(summary.byProjMgr.map((row) => row.name)).toEqual(['Shari']);
  });
});
