import { buildPipelineWorkloadSummary } from '@/lib/project-pipeline/workload';
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
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('buildPipelineWorkloadSummary', () => {
  it('counts incomplete jobs by appraiser and proj mgr with segment breakdown', () => {
    const jobs = [
      job({ jobNumber: '1', appraiserConsultant: 'Greg', projMgr: 'Shari', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: '2', appraiserConsultant: 'Greg', projMgr: 'Shari', commercialOutdoor: 'Commercial' }),
      job({ jobNumber: '3', appraiserConsultant: 'Luke', projMgr: 'Shari', dateCompleted: '01/02/2026' }),
    ];

    const summary = buildPipelineWorkloadSummary(jobs, '2026 Jobs');

    expect(summary.incompleteJobs).toBe(2);
    expect(summary.byAppraiser).toEqual([
      {
        name: 'Greg',
        outdoor: 1,
        commercial: 1,
        unknown: 0,
        total: 2,
        jobs: [
          expect.objectContaining({ jobNumber: '1', segment: 'Outdoor' }),
          expect.objectContaining({ jobNumber: '2', segment: 'Commercial' }),
        ],
      },
    ]);
    expect(summary.byProjMgr).toEqual([
      {
        name: 'Shari',
        outdoor: 1,
        commercial: 1,
        unknown: 0,
        total: 2,
        jobs: [
          expect.objectContaining({ jobNumber: '1' }),
          expect.objectContaining({ jobNumber: '2' }),
        ],
      },
    ]);
  });

  it('filters to outdoor jobs only', () => {
    const jobs = [
      job({ jobNumber: '1', appraiserConsultant: 'Greg', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: '2', appraiserConsultant: 'Greg', commercialOutdoor: 'Commercial' }),
    ];

    const summary = buildPipelineWorkloadSummary(jobs, '2026 Jobs', { segmentFilter: 'Outdoor' });

    expect(summary.incompleteJobs).toBe(1);
    expect(summary.byAppraiser).toEqual([
      {
        name: 'Greg',
        outdoor: 1,
        commercial: 0,
        unknown: 0,
        total: 1,
        jobs: [expect.objectContaining({ jobNumber: '1', segment: 'Outdoor' })],
      },
    ]);
  });
});
