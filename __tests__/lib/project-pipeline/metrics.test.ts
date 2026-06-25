import { computeProjectPipelineMetrics } from '@/lib/project-pipeline/metrics';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

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

describe('computeProjectPipelineMetrics', () => {
  const now = new Date('2026-06-23T12:00:00Z');

  it('counts total, outdoor, in review, and due within 30 days', () => {
    const metrics = computeProjectPipelineMetrics(
      [
        sampleJob({ commercialOutdoor: 'Outdoor', reviewStatus: 'In Review', dueDate: '07/01/2026' }),
        sampleJob({
          jobNumber: '26-101A-01',
          commercialOutdoor: 'Commercial',
          reviewStatus: 'Approved - No Changes, Send to Client',
          dueDate: '08/15/2026',
          sheetRowIndex: 3,
        }),
        sampleJob({
          jobNumber: '26-102A-01',
          commercialOutdoor: 'Outdoor',
          reviewStatus: 'Changes Requested',
          dueDate: '06/30/2026',
          sheetRowIndex: 4,
        }),
      ],
      now
    );

    expect(metrics.total).toBe(3);
    expect(metrics.outdoor).toBe(2);
    expect(metrics.commercial).toBe(1);
    expect(metrics.inReview).toBe(2);
    expect(metrics.dueWithin30Days).toBe(2);
  });

  it('excludes commercial jobs from due within 30 days', () => {
    const metrics = computeProjectPipelineMetrics(
      [
        sampleJob({
          commercialOutdoor: 'Commercial',
          dueDate: '07/01/2026',
        }),
        sampleJob({
          jobNumber: '26-101A-01',
          commercialOutdoor: 'Outdoor',
          dueDate: '07/01/2026',
          sheetRowIndex: 3,
        }),
      ],
      now
    );

    expect(metrics.dueWithin30Days).toBe(1);
  });

  it('counts outdoor past due jobs with no completion date', () => {
    const metrics = computeProjectPipelineMetrics(
      [
        sampleJob({
          commercialOutdoor: 'Outdoor',
          dueDate: '06/01/2026',
        }),
        sampleJob({
          jobNumber: '26-101A-01',
          commercialOutdoor: 'Outdoor',
          dueDate: '06/01/2026',
          dateCompleted: '06/10/2026',
          sheetRowIndex: 3,
        }),
        sampleJob({
          jobNumber: '26-102A-01',
          commercialOutdoor: 'Commercial',
          dueDate: '06/01/2026',
          sheetRowIndex: 4,
        }),
        sampleJob({
          jobNumber: '26-103A-01',
          commercialOutdoor: 'Outdoor',
          dueDate: '07/01/2026',
          sheetRowIndex: 5,
        }),
      ],
      now
    );

    expect(metrics.outdoorPastDue).toBe(1);
  });
});
