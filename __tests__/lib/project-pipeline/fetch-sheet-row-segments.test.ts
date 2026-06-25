import type { sheets_v4 } from 'googleapis';
import {
  applySheetRowSegmentsToJobs,
  buildRowSegmentGetter,
} from '@/lib/project-pipeline/fetch-sheet-row-segments';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

describe('buildRowSegmentGetter', () => {
  it('maps green-highlighted rows to Outdoor and plain rows to Commercial', () => {
    const rowData: sheets_v4.Schema$RowData[] = [
      { values: [{ effectiveFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }] },
      {
        values: [
          {
            effectiveFormat: {
              backgroundColor: { red: 0.851, green: 0.918, blue: 0.827 },
            },
          },
        ],
      },
      { values: [{ effectiveFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }] },
    ];

    const getRowSegment = buildRowSegmentGetter(rowData);

    expect(getRowSegment(1)).toBe('Outdoor');
    expect(getRowSegment(2)).toBe('Commercial');
  });
});

describe('applySheetRowSegmentsToJobs', () => {
  it('corrects mirror rows tagged Outdoor when the sheet row is not green', async () => {
    const rowData: sheets_v4.Schema$RowData[] = [
      { values: [{ effectiveFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }] },
      { values: [{ effectiveFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }] },
    ];

    const sheets = {
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: { sheets: [{ data: [{ rowData }] }] },
        }),
      },
    } as unknown as sheets_v4.Sheets;

    const jobs: ProjectPipelineJob[] = [
      {
        jobNumber: '25-100A-01',
        client: 'Commercial Client',
        propertyLocation: 'Austin, TX',
        appraiserConsultant: 'Nick',
        projMgr: '',
        contractStart: '',
        dueDate: '',
        dateCompleted: '',
        commercialOutdoor: 'Outdoor',
        propertyType: '',
        service: '',
        reviewStatus: '',
        sentToClient: 'No',
        authorSlackUsername: '',
        clientEmail: '',
        projectStatus: 'In-Progress',
        sheetRowIndex: 2,
        pipelineSheetName: '2026 Jobs',
      },
    ];

    const updated = await applySheetRowSegmentsToJobs({
      jobs,
      sheetId: 'sheet-1',
      sheetName: '2026 Jobs',
      sheets,
    });

    expect(updated[0].commercialOutdoor).toBe('Commercial');
  });
});
