import { buildProjectPipelineSheetSyncActivityRows } from '@/lib/project-pipeline/activity/record-sheet-sync-activity';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Test Client',
    propertyLocation: 'Hopewell Junction, NY',
    appraiserConsultant: 'Luke Marran',
    projMgr: 'Shari',
    contractStart: '01/21/2026',
    dueDate: '3/20/26',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Feasibility Study',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: 'luke',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

const managedUsers = [
  {
    email: 'marran@sageoutdooradvisory.com',
    display_name: 'Luke Marran',
    first_name: 'Luke',
    last_name: 'Marran',
  },
] as const;

describe('buildProjectPipelineSheetSyncActivityRows', () => {
  it('records new jobs, field updates, and removals', () => {
    const rows = buildProjectPipelineSheetSyncActivityRows({
      sheetId: 'sheet-1',
      sheetName: '2026 Jobs',
      syncRunId: 'run-1',
      previousJobsByNumber: new Map([
        ['26-100A-01', sampleJob({ client: 'Old Client' })],
      ]),
      syncedJobs: [
        sampleJob({ jobNumber: '26-100A-01', client: 'New Client' }),
        sampleJob({ jobNumber: '26-200A-01', client: 'Brand New' }),
      ],
      removedJobs: [
        {
          jobNumber: '26-999A-01',
          client: 'Removed Client',
          appraiserConsultant: 'Luke Marran',
          projMgr: 'Shari',
        },
      ],
      managedUsers,
    });

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.action === 'sheet_sync_created')?.job_number).toBe('26-200A-01');
    expect(rows.find((row) => row.action === 'sheet_sync_updated')?.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'client', previousValue: 'Old Client', newValue: 'New Client' }),
      ])
    );
    expect(rows.find((row) => row.action === 'sheet_sync_removed')?.job_number).toBe('26-999A-01');
    expect(rows.every((row) => row.actor_display_name === 'Google Sheets')).toBe(true);
    expect(rows.every((row) => row.metadata.source === 'sheet_sync')).toBe(true);
  });

  it('skips unchanged jobs', () => {
    const job = sampleJob();
    const rows = buildProjectPipelineSheetSyncActivityRows({
      sheetId: 'sheet-1',
      sheetName: '2026 Jobs',
      syncRunId: 'run-1',
      previousJobsByNumber: new Map([[job.jobNumber, job]]),
      syncedJobs: [{ ...job }],
      removedJobs: [],
      managedUsers,
    });

    expect(rows).toEqual([]);
  });
});
