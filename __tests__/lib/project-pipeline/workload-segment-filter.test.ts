import {
  applyWorkloadSegmentFilter,
  filterWorkloadPersonRows,
  sumSegmentCountsFromPersonRows,
} from '@/lib/project-pipeline/workload-segment-filter';
import type { PipelineWorkloadPersonJob, PipelineWorkloadPersonRow } from '@/lib/project-pipeline/workload';

function personJob(
  overrides: Partial<PipelineWorkloadPersonJob> & Pick<PipelineWorkloadPersonJob, 'jobNumber' | 'segment'>
): PipelineWorkloadPersonJob {
  return {
    client: 'Client',
    propertyLocation: 'Location',
    service: 'Feasibility Study',
    dueDate: '03/01/2026',
    reviewStatus: 'Not Started',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    ...overrides,
  };
}

describe('workload-segment-filter', () => {
  const rows: PipelineWorkloadPersonRow[] = [
    {
      name: 'Greg',
      outdoor: 2,
      commercial: 1,
      unknown: 0,
      total: 3,
      jobs: [
        personJob({ jobNumber: '1', segment: 'Outdoor' }),
        personJob({ jobNumber: '2', segment: 'Outdoor' }),
        personJob({ jobNumber: '3', segment: 'Commercial' }),
      ],
    },
    {
      name: 'Luke',
      outdoor: 0,
      commercial: 4,
      unknown: 0,
      total: 4,
      jobs: [
        personJob({ jobNumber: '4', segment: 'Commercial' }),
        personJob({ jobNumber: '5', segment: 'Commercial' }),
        personJob({ jobNumber: '6', segment: 'Commercial' }),
        personJob({ jobNumber: '7', segment: 'Commercial' }),
      ],
    },
  ];

  it('filters person rows to outdoor only', () => {
    expect(filterWorkloadPersonRows(rows, 'Outdoor')).toEqual([
      {
        name: 'Greg',
        outdoor: 2,
        commercial: 0,
        unknown: 0,
        total: 2,
        jobs: [
          personJob({ jobNumber: '1', segment: 'Outdoor' }),
          personJob({ jobNumber: '2', segment: 'Outdoor' }),
        ],
      },
    ]);
  });

  it('sums segment counts from unfiltered rows', () => {
    expect(sumSegmentCountsFromPersonRows(rows, 'Commercial')).toBe(5);
    expect(sumSegmentCountsFromPersonRows(rows, 'both')).toBe(7);
  });

  it('applies segment filter to by-year workload responses', () => {
    const filtered = applyWorkloadSegmentFilter(
      {
        view: 'byYear',
        configured: true,
        sheetName: '2026 Jobs',
        totalJobs: 10,
        incompleteJobs: 7,
        byAppraiser: rows,
        byProjMgr: rows,
        segmentFilter: 'both',
      },
      'Commercial'
    );

    expect(filtered.view).toBe('byYear');
    if (filtered.view !== 'byYear') return;
    expect(filtered.incompleteJobs).toBe(5);
    expect(filtered.byAppraiser).toHaveLength(2);
    expect(filtered.byAppraiser[0].total).toBe(1);
    expect(filtered.byAppraiser[0].jobs).toHaveLength(1);
    expect(filtered.byAppraiser[0].jobs[0].segment).toBe('Commercial');
  });

  it('applies segment filter to charts workload responses', () => {
    const filtered = applyWorkloadSegmentFilter(
      {
        view: 'charts',
        configured: true,
        sheetName: '2026 Jobs',
        byMonth: [
          {
            year: 2026,
            month: 5,
            monthLabel: 'May 2026',
            sortKey: 202605,
            total: 2,
            outdoor: 1,
            commercial: 1,
            unknown: 0,
            incomplete: 2,
            outdoorIncomplete: 1,
            commercialIncomplete: 1,
            monthOverMonthChange: null,
          },
        ],
        unparsedJobCount: 0,
        segmentFilter: 'both',
      },
      'Outdoor'
    );

    expect(filtered.view).toBe('charts');
    if (filtered.view !== 'charts') return;
    expect(filtered.byMonth[0]).toMatchObject({
      total: 1,
      outdoor: 1,
      commercial: 0,
      incomplete: 1,
    });
  });
});
