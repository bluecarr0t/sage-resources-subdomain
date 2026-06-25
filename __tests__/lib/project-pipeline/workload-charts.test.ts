import {
  buildPipelineWorkloadCharts,
  filterPipelineWorkloadChartsBySegment,
} from '@/lib/project-pipeline/workload-charts';
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

describe('buildPipelineWorkloadCharts', () => {
  it('groups jobs by month from job number suffix with MoM change', () => {
    const jobs = [
      job({ jobNumber: '26-100A-05', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: '26-101A-05', commercialOutdoor: 'Commercial' }),
      job({ jobNumber: '26-102A-06', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: '26-103A-06', dateCompleted: '06/01/2026', commercialOutdoor: 'Outdoor' }),
      job({ jobNumber: 'bad-job' }),
    ];

    const charts = buildPipelineWorkloadCharts(jobs, '2026 Jobs', { sheetYear: 2026 });

    expect(charts.unparsedJobCount).toBe(1);
    expect(charts.byMonth).toHaveLength(12);

    const may = charts.byMonth.find((row) => row.month === 5);
    const june = charts.byMonth.find((row) => row.month === 6);

    expect(may).toMatchObject({
      total: 2,
      outdoor: 1,
      commercial: 1,
      incomplete: 2,
      monthOverMonthChange: 2,
    });
    expect(june).toMatchObject({
      total: 2,
      outdoor: 2,
      incomplete: 1,
      outdoorIncomplete: 1,
      monthOverMonthChange: 0,
    });
  });
});

describe('filterPipelineWorkloadChartsBySegment', () => {
  it('filters monthly rows and incomplete counts by segment', () => {
    const charts = buildPipelineWorkloadCharts(
      [
        job({ jobNumber: '26-100A-05', commercialOutdoor: 'Outdoor' }),
        job({ jobNumber: '26-101A-05', commercialOutdoor: 'Commercial', dateCompleted: '05/01/2026' }),
      ],
      '2026 Jobs',
      { sheetYear: 2026 }
    );

    const filtered = filterPipelineWorkloadChartsBySegment(charts, 'Outdoor');
    const may = filtered.byMonth.find((row) => row.month === 5);

    expect(may).toMatchObject({
      total: 1,
      outdoor: 1,
      commercial: 0,
      incomplete: 1,
    });
  });
});
