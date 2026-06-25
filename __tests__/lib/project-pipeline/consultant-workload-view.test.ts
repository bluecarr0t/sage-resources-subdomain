import {
  canUseProjectPipelineConsultantWorkloadView,
  placePipelineConsultantWorkloadToggleAfterAuthorPreview,
} from '@/lib/project-pipeline/consultant-workload-view';
import { groupPipelineJobsByConsultant } from '@/lib/project-pipeline/group-jobs-by-consultant';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

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
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('consultant-workload-view', () => {
  it('allows admin emails to use consultant workload view', () => {
    expect(canUseProjectPipelineConsultantWorkloadView('harsell@sageoutdooradvisory.com')).toBe(
      true
    );
    expect(canUseProjectPipelineConsultantWorkloadView('garwood@sagecommercialadvisory.com')).toBe(
      true
    );
    expect(canUseProjectPipelineConsultantWorkloadView('heilala@sageoutdooradvisory.com')).toBe(
      true
    );
    expect(canUseProjectPipelineConsultantWorkloadView('greg@sageoutdooradvisory.com')).toBe(false);
  });

  it('places toggle after author preview only for harsell@', () => {
    expect(
      placePipelineConsultantWorkloadToggleAfterAuthorPreview('harsell@sageoutdooradvisory.com')
    ).toBe(true);
    expect(
      placePipelineConsultantWorkloadToggleAfterAuthorPreview('garwood@sagecommercialadvisory.com')
    ).toBe(false);
    expect(
      placePipelineConsultantWorkloadToggleAfterAuthorPreview('heilala@sageoutdooradvisory.com')
    ).toBe(false);
  });
});

describe('groupPipelineJobsByConsultant', () => {
  it('groups incomplete jobs by appraiser consultant', () => {
    const groups = groupPipelineJobsByConsultant([
      job({ jobNumber: '1', appraiserConsultant: 'Greg', dueDate: '04/01/2026' }),
      job({ jobNumber: '2', appraiserConsultant: 'Luke', dueDate: '03/01/2026' }),
      job({ jobNumber: '3', appraiserConsultant: 'Greg', dateCompleted: '01/02/2026' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].consultantName).toBe('Greg');
    expect(groups[0].jobCount).toBe(1);
    expect(groups[1].consultantName).toBe('Luke');
    expect(groups[1].jobs[0].jobNumber).toBe('2');
  });

  it('splits combined appraiser cells in the flat grouping path', () => {
    const groups = groupPipelineJobsByConsultant([
      job({ jobNumber: '26-179A-04', appraiserConsultant: 'Greg/Shari' }),
    ]);

    expect(groups.map((group) => group.consultantName).sort()).toEqual(['Greg', 'Shari']);
    expect(groups[0].jobCount).toBe(1);
    expect(groups[1].jobCount).toBe(1);
  });

  it('includes Nick Cipriano for bare Nick sheet values when using managed authors', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Nick', commercialOutdoor: 'Commercial' }),
        job({ jobNumber: '2', appraiserConsultant: 'Nick Harsell' }),
        job({ jobNumber: '3', appraiserConsultant: 'Greg' }),
      ],
      {
        authors: [
          {
            displayName: 'Nick Cipriano',
            email: 'cipriano@sagecommercialadvisory.com',
            division: 'commercial',
          },
          { displayName: 'Greg Garwood', division: 'outdoor' },
        ],
        segmentFilter: 'Commercial',
      }
    );

    expect(groups.map((group) => group.consultantName)).toEqual(['Nick Cipriano']);
    expect(groups[0].jobCount).toBe(1);
    expect(groups[0].jobs[0].jobNumber).toBe('1');
  });

  it('excludes jobs completed via derived project status from Supabase fields', () => {
    const groups = groupPipelineJobsByConsultant([
      job({ jobNumber: '1', appraiserConsultant: 'Greg', projectStatus: 'In-Progress' }),
      job({
        jobNumber: '2',
        appraiserConsultant: 'Greg',
        projectStatus: 'In-Progress',
        sentToClient: 'Yes',
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].jobCount).toBe(1);
    expect(groups[0].jobs[0].jobNumber).toBe('1');
  });

  it('excludes completed, cancelled, and in-review project statuses', () => {
    const groups = groupPipelineJobsByConsultant([
      job({ jobNumber: '1', appraiserConsultant: 'Greg', projectStatus: 'In-Progress' }),
      job({
        jobNumber: '2',
        appraiserConsultant: 'Greg',
        projectStatus: 'Completed',
        projectStatusManual: true,
      }),
      job({
        jobNumber: '3',
        appraiserConsultant: 'Greg',
        projectStatus: 'Cancelled',
        projectStatusManual: true,
      }),
      job({
        jobNumber: '4',
        appraiserConsultant: 'Greg',
        projectStatus: 'In Review',
        projectStatusManual: true,
      }),
      job({ jobNumber: '5', appraiserConsultant: 'Greg', projectStatus: 'Not Started' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].jobCount).toBe(2);
    expect(groups[0].jobs.map((item) => item.jobNumber)).toEqual(['1', '5']);
  });

  it('excludes hidden consultants', () => {
    const groups = groupPipelineJobsByConsultant([
      job({ appraiserConsultant: 'Nick Harsell' }),
      job({ appraiserConsultant: 'Greg' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].consultantName).toBe('Greg');
  });

  it('assigns co-listed consultants to each matching managed author', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Lars / Luke' }),
        job({ jobNumber: '2', appraiserConsultant: 'Luke' }),
        job({ jobNumber: '3', appraiserConsultant: 'Greg / Luke' }),
      ],
      {
        authors: [
          { displayName: 'Greg Garwood', division: 'outdoor' },
          { displayName: 'Luke Marran', division: 'outdoor' },
        ],
        segmentFilter: 'Outdoor',
      }
    );

    const luke = groups.find((group) => group.consultantName === 'Luke Marran');
    const greg = groups.find((group) => group.consultantName === 'Greg Garwood');

    expect(luke?.jobCount).toBe(3);
    expect(luke?.jobs.map((item) => item.jobNumber)).toEqual(['1', '2', '3']);
    expect(greg?.jobCount).toBe(1);
    expect(greg?.jobs[0]?.jobNumber).toBe('3');
    expect(groups.some((group) => group.consultantName === 'Lars / Luke')).toBe(false);
  });

  it('splits Greg/Shari across managed authors without a combined group', () => {
    const groups = groupPipelineJobsByConsultant(
      [job({ jobNumber: '26-179A-04', appraiserConsultant: 'Greg/Shari' })],
      {
        authors: [
          { displayName: 'Greg Garwood', division: 'outdoor' },
          { displayName: 'Shari', division: 'outdoor' },
        ],
        segmentFilter: 'Outdoor',
      }
    );

    expect(groups.some((group) => group.consultantName === 'Greg/Shari')).toBe(false);
    expect(
      groups.find((group) => group.consultantName === 'Greg Garwood')?.jobs[0]?.jobNumber
    ).toBe('26-179A-04');
    expect(groups.find((group) => group.consultantName === 'Shari')?.jobs[0]?.jobNumber).toBe(
      '26-179A-04'
    );
  });

  it('sorts consultant sections by first name alphabetically', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Shari' }),
        job({ jobNumber: '2', appraiserConsultant: 'Greg' }),
        job({ jobNumber: '3', appraiserConsultant: 'Luke' }),
        job({ jobNumber: '4', appraiserConsultant: 'Aidan' }),
      ],
      {
        authors: [
          { displayName: 'Shari Heilala', division: 'outdoor' },
          { displayName: 'Greg Garwood', division: 'both' },
          { displayName: 'Luke Marran', division: 'outdoor' },
          { displayName: 'Aidan Witte', division: 'outdoor' },
        ],
        segmentFilter: '',
      }
    );

    expect(groups.map((group) => group.consultantName)).toEqual([
      'Aidan Witte',
      'Greg Garwood',
      'Luke Marran',
      'Shari Heilala',
    ]);
  });

  it('shows outdoor and commercial jobs for an author with outdoor filter when they have an outdoor job', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Nick', commercialOutdoor: 'Commercial' }),
        job({ jobNumber: '2', appraiserConsultant: 'Nick', commercialOutdoor: 'Outdoor' }),
      ],
      {
        authors: [
          {
            displayName: 'Nick Cipriano',
            email: 'cipriano@sagecommercialadvisory.com',
            division: 'commercial',
          },
        ],
        segmentFilter: 'Outdoor',
      }
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].consultantName).toBe('Nick Cipriano');
    expect(groups[0].jobs.map((item) => item.jobNumber).sort()).toEqual(['1', '2']);
  });

  it('excludes commercial-only authors when outdoor filter is applied', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Erick', commercialOutdoor: 'Commercial' }),
        job({ jobNumber: '2', appraiserConsultant: 'Aidan', commercialOutdoor: 'Outdoor' }),
      ],
      {
        authors: [
          { displayName: 'Erick Santiago', division: 'commercial' },
          { displayName: 'Aidan Witte', division: 'outdoor' },
        ],
        segmentFilter: 'Outdoor',
      }
    );

    expect(groups.map((group) => group.consultantName)).toEqual(['Aidan Witte']);
    expect(groups[0].jobs.map((item) => item.jobNumber)).toEqual(['2']);
  });

  it('shows outdoor and commercial jobs for an author when segment filter is empty', () => {
    const groups = groupPipelineJobsByConsultant(
      [
        job({ jobNumber: '1', appraiserConsultant: 'Nick', commercialOutdoor: 'Commercial' }),
        job({ jobNumber: '2', appraiserConsultant: 'Nick', commercialOutdoor: 'Outdoor' }),
      ],
      {
        authors: [
          {
            displayName: 'Nick Cipriano',
            email: 'cipriano@sagecommercialadvisory.com',
            division: 'commercial',
          },
        ],
        segmentFilter: '',
      }
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].consultantName).toBe('Nick Cipriano');
    expect(groups[0].jobs.map((item) => item.jobNumber).sort()).toEqual(['1', '2']);
  });

  it('includes both-division managed authors under outdoor and commercial filters', () => {
    const jobs = [
      job({ jobNumber: '1', appraiserConsultant: 'Greg', commercialOutdoor: 'Commercial' }),
      job({ jobNumber: '2', appraiserConsultant: 'Luke', commercialOutdoor: 'Outdoor' }),
    ];
    const authors = [
      { displayName: 'Greg Garwood', email: 'greg@sageoutdooradvisory.com', division: 'both' },
      { displayName: 'Luke Marran', email: 'luke@sageoutdooradvisory.com', division: 'outdoor' },
      { displayName: 'Paco', email: 'paco@sagecommercialadvisory.com', division: 'commercial' },
    ];

    const outdoorGroups = groupPipelineJobsByConsultant(jobs, {
      authors,
      segmentFilter: 'Outdoor',
    });
    expect(outdoorGroups.map((group) => group.consultantName)).toEqual(
      expect.arrayContaining(['Greg Garwood', 'Luke Marran'])
    );
    expect(outdoorGroups.find((group) => group.consultantName === 'Greg Garwood')?.jobCount).toBe(1);
    expect(outdoorGroups.some((group) => group.consultantName === 'Paco')).toBe(false);

    const commercialGroups = groupPipelineJobsByConsultant(jobs, {
      authors,
      segmentFilter: 'Commercial',
    });
    expect(commercialGroups.map((group) => group.consultantName)).toEqual(['Greg Garwood']);
    expect(commercialGroups[0].jobCount).toBe(1);
    expect(commercialGroups.some((group) => group.consultantName === 'Paco')).toBe(false);
  });
});
