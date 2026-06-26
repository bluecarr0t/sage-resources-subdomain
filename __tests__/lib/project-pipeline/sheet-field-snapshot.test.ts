import {
  mergeProjectPipelineSheetUiFields,
  resolveProjectPipelineSheetUiMergeField,
} from '@/lib/project-pipeline/sheet-field-snapshot';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-100A-01',
    client: 'Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
    contractStart: '01/01/2026',
    dueDate: '03/01/2026',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: 'Glamping',
    service: 'Appraisal',
    reviewStatus: 'Not Started',
    sentToClient: 'No',
    authorSlackUsername: 'greg',
    clientEmail: 'client@example.com',
    projectStatus: 'In-Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('resolveProjectPipelineSheetUiMergeField', () => {
  it('uses the sheet value on first sync when no snapshot exists', () => {
    expect(
      resolveProjectPipelineSheetUiMergeField({
        field: 'dueDate',
        sheetValue: '03/01/2026',
        snapshotValue: undefined,
        uiValue: '04/01/2026',
      })
    ).toBe('03/01/2026');
  });

  it('keeps the UI due date when the sheet is unchanged since last sync', () => {
    expect(
      resolveProjectPipelineSheetUiMergeField({
        field: 'dueDate',
        sheetValue: '03/01/2026',
        snapshotValue: '03/01/2026',
        uiValue: '04/15/2026',
      })
    ).toBe('04/15/2026');
  });

  it('applies a sheet due date change after a UI edit', () => {
    expect(
      resolveProjectPipelineSheetUiMergeField({
        field: 'dueDate',
        sheetValue: '05/01/2026',
        snapshotValue: '03/01/2026',
        uiValue: '04/15/2026',
      })
    ).toBe('05/01/2026');
  });

  it('applies a UI due date change after the sheet was synced', () => {
    expect(
      resolveProjectPipelineSheetUiMergeField({
        field: 'dueDate',
        sheetValue: '05/01/2026',
        snapshotValue: '05/01/2026',
        uiValue: '04/15/2026',
      })
    ).toBe('04/15/2026');
  });
});

describe('mergeProjectPipelineSheetUiFields', () => {
  it('merges all dual-edit fields independently', () => {
    const sheetJob = sampleJob({
      dueDate: '05/01/2026',
      reviewStatus: 'Approved',
      sentToClient: 'Yes',
    });
    const uiJob = sampleJob({
      dueDate: '04/15/2026',
      reviewStatus: 'In-Progress',
      sentToClient: 'No',
    });

    const merged = mergeProjectPipelineSheetUiFields(sheetJob, uiJob, {
      dueDate: '03/01/2026',
      reviewStatus: 'Not Started',
      sentToClient: 'No',
    });

    expect(merged.dueDate).toBe('05/01/2026');
    expect(merged.reviewStatus).toBe('Approved');
    expect(merged.sentToClient).toBe('Yes');
  });
});
