import { resolveSheetSyncProjectPipelineJob } from '@/lib/project-pipeline/resolve-sheet-sync-job';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleSheetJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Sheet Client',
    propertyLocation: 'Austin, TX',
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
    projectStatus: 'Not Started',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('resolveSheetSyncProjectPipelineJob', () => {
  it('merges sheet refresh fields into UI-edited jobs', () => {
    const merged = resolveSheetSyncProjectPipelineJob({
      sheetJob: sampleSheetJob({ client: 'Updated Client', reviewStatus: 'In Review' }),
      sheetName: '2026 Jobs',
      sheetYear: 2026,
      storedStatusByJobNumber: new Map(),
      uiEditedByJobNumber: new Map([
        [
          '26-100A-01',
          sampleSheetJob({
            client: 'UI Client',
            reviewStatus: 'Changes Requested',
            dueDate: '04/01/2026',
            sheetFieldSnapshot: {
              dueDate: '03/20/2026',
              reviewStatus: 'In Review',
              sentToClient: 'No',
            },
            uiSourceOfTruth: true,
          }),
        ],
      ]),
    });

    expect(merged.client).toBe('Updated Client');
    expect(merged.reviewStatus).toBe('Changes Requested');
    expect(merged.dueDate).toBe('04/01/2026');
    expect(merged.uiSourceOfTruth).toBe(true);
  });

  it('preserves manual project status from Supabase', () => {
    const merged = resolveSheetSyncProjectPipelineJob({
      sheetJob: sampleSheetJob({ appraiserConsultant: '' }),
      sheetName: '2026 Jobs',
      sheetYear: 2026,
      storedStatusByJobNumber: new Map([
        [
          '26-100A-01',
          {
            projectStatus: 'Cancelled',
            projectStatusManual: true,
            flag: 'None',
            jobNotes: [],
            reviewNotes: [],
          },
        ],
      ]),
      uiEditedByJobNumber: new Map(),
    });

    expect(merged.projectStatus).toBe('Cancelled');
    expect(merged.projectStatusManual).toBe(true);
  });

  it('derives project status for standard sheet rows', () => {
    const merged = resolveSheetSyncProjectPipelineJob({
      sheetJob: sampleSheetJob({ appraiserConsultant: 'Greg', projectStatus: 'Not Started' }),
      sheetName: '2026 Jobs',
      sheetYear: 2026,
      storedStatusByJobNumber: new Map(),
      uiEditedByJobNumber: new Map(),
    });

    expect(merged.projectStatus).toBe('In-Progress');
  });

  it('preserves On Hold from stored status even when manual flag was not set', () => {
    const merged = resolveSheetSyncProjectPipelineJob({
      sheetJob: sampleSheetJob({ appraiserConsultant: 'Greg' }),
      sheetName: '2026 Jobs',
      sheetYear: 2026,
      storedStatusByJobNumber: new Map([
        [
          '26-100A-01',
          {
            projectStatus: 'On Hold',
            projectStatusManual: true,
            flag: 'None',
            jobNotes: [],
            reviewNotes: [],
          },
        ],
      ]),
      uiEditedByJobNumber: new Map(),
    });

    expect(merged.projectStatus).toBe('On Hold');
    expect(merged.projectStatusManual).toBe(true);
  });
});
