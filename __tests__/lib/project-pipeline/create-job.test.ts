import {
  canCreateProjectPipelineJob,
  createBlankProjectPipelineJob,
  UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
  validateNewProjectPipelineJob,
} from '@/lib/project-pipeline/create-job';
import { DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER } from '@/lib/project-pipeline/sheet-tabs';

describe('create-job', () => {
  it('allows admins and pipeline view-all users to create jobs', () => {
    expect(canCreateProjectPipelineJob({ pipelineViewAll: true, isAdmin: false })).toBe(true);
    expect(canCreateProjectPipelineJob({ pipelineViewAll: false, isAdmin: true })).toBe(true);
    expect(canCreateProjectPipelineJob({ pipelineViewAll: false, isAdmin: false })).toBe(false);
  });

  it('creates a blank UI job with sheet row index 0', () => {
    const job = createBlankProjectPipelineJob({
      pipelineSheetName: '2026 Jobs',
      appraiserConsultant: 'Luke Marran',
    });

    expect(job.sheetRowIndex).toBe(UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX);
    expect(job.uiSourceOfTruth).toBe(true);
    expect(job.jobNumber).toBe('');
    expect(job.appraiserConsultant).toBe('Luke Marran');
    expect(job.pipelineSheetName).toBe('2026 Jobs');
  });

  it('defaults sheet tab when all-years filter is active', () => {
    const job = createBlankProjectPipelineJob({
      pipelineSheetName: DEFAULT_PROJECT_PIPELINE_VIEW_SHEET_FILTER,
    });

    expect(job.pipelineSheetName).toBe('2026 Jobs');
  });

  it('validates required job number and sheet tab', () => {
    const valid = createBlankProjectPipelineJob({
      pipelineSheetName: '2026 Jobs',
    });
    valid.jobNumber = '26-999A-01';

    expect(validateNewProjectPipelineJob(valid)).toBeNull();
    expect(validateNewProjectPipelineJob({ ...valid, jobNumber: '  ' })).toBe(
      'Job number is required'
    );
    expect(
      validateNewProjectPipelineJob({ ...valid, pipelineSheetName: 'Invalid Tab' })
    ).toBe('A valid sheet year is required');
    expect(validateNewProjectPipelineJob({ ...valid, sheetRowIndex: 2 })).toBe(
      'New jobs must be created from the Job Pipeline form'
    );
  });
});
