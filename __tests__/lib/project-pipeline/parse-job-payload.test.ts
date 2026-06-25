import {
  isUiCreatedProjectPipelineJob,
  UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
} from '@/lib/project-pipeline/create-job';
import {
  isProjectPipelineJobPayload,
  normalizeUiCreatedProjectPipelineJobPayload,
} from '@/lib/project-pipeline/parse-job-payload';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: '26-TEST-06',
    client: 'Test Client',
    propertyLocation: 'Austin, TX',
    appraiserConsultant: 'Greg',
    projMgr: 'Shari',
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
    projectStatus: 'Not Started',
    uiSourceOfTruth: true,
    sheetRowIndex: UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
    pipelineSheetName: '2026 Jobs',
    ...overrides,
  };
}

describe('isProjectPipelineJobPayload', () => {
  it('accepts UI-created jobs with sheetRowIndex 0', () => {
    expect(isProjectPipelineJobPayload(sampleJob())).toBe(true);
  });

  it('accepts sheet-backed jobs with row index >= 2', () => {
    expect(isProjectPipelineJobPayload(sampleJob({ sheetRowIndex: 2, uiSourceOfTruth: false }))).toBe(
      true
    );
  });

  it('rejects jobs without a sheet row index', () => {
    expect(isProjectPipelineJobPayload(sampleJob({ sheetRowIndex: undefined as unknown as number }))).toBe(
      false
    );
  });
});

describe('normalizeUiCreatedProjectPipelineJobPayload', () => {
  it('forces UI-created markers before save', () => {
    const normalized = normalizeUiCreatedProjectPipelineJobPayload(
      sampleJob({ sheetRowIndex: 2, uiSourceOfTruth: true })
    );

    expect(normalized.sheetRowIndex).toBe(UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX);
    expect(normalized.uiSourceOfTruth).toBe(true);
    expect(isUiCreatedProjectPipelineJob(normalized)).toBe(true);
  });
});
