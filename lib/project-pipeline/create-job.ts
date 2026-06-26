import { DEFAULT_PROJECT_PIPELINE_FLAG } from './project-flag';
import { DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS } from './project-status';
import { DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT } from './sent-to-client';
import { withDerivedProjectPipelineProjectStatus } from './derive-project-status';
import {
  DEFAULT_PROJECT_PIPELINE_SHEET_TAB,
  isProjectPipelineAllSheetsTab,
  isProjectPipelineSheetTab,
  parseProjectPipelineSheetYear,
  resolveProjectPipelineSheetTab,
} from './sheet-tabs';
import type { ProjectPipelineJob } from './types';

/** UI-created jobs are not tied to a Google Sheet row. */
export const UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX = 0;

export function canCreateProjectPipelineJob(input: {
  pipelineViewAll: boolean;
  isAdmin: boolean;
}): boolean {
  return input.pipelineViewAll || input.isAdmin;
}

export function resolveProjectPipelineCreateSheetTab(
  sheetName: string
): typeof DEFAULT_PROJECT_PIPELINE_SHEET_TAB {
  if (isProjectPipelineAllSheetsTab(sheetName)) {
    return DEFAULT_PROJECT_PIPELINE_SHEET_TAB;
  }
  return resolveProjectPipelineSheetTab(sheetName);
}

export function createBlankProjectPipelineJob(input: {
  pipelineSheetName: string;
  appraiserConsultant?: string;
}): ProjectPipelineJob {
  const pipelineSheetName = resolveProjectPipelineSheetTab(input.pipelineSheetName);

  return withDerivedProjectPipelineProjectStatus({
    jobNumber: '',
    client: '',
    propertyLocation: '',
    appraiserConsultant: input.appraiserConsultant?.trim() ?? '',
    projMgr: '',
    contractStart: '',
    dueDate: '',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: '',
    service: '',
    reviewStatus: '',
    sentToClient: DEFAULT_PROJECT_PIPELINE_SENT_TO_CLIENT,
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS,
    projectStatusManual: false,
    uiSourceOfTruth: true,
    flag: DEFAULT_PROJECT_PIPELINE_FLAG,
    jobNotes: [],
    reviewNotes: [],
    sheetRowIndex: UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
    pipelineSheetName,
    sheetYear: parseProjectPipelineSheetYear(pipelineSheetName),
  });
}

export function validateNewProjectPipelineJob(job: ProjectPipelineJob): string | null {
  const jobNumber = job.jobNumber.trim();
  if (!jobNumber) {
    return 'Job number is required';
  }

  const sheetName = job.pipelineSheetName?.trim();
  if (!sheetName || !isProjectPipelineSheetTab(sheetName)) {
    return 'A valid sheet year is required';
  }

  if (job.sheetRowIndex !== UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX) {
    return 'New jobs must be created from the Job Pipeline form';
  }

  return null;
}

export function isUiCreatedProjectPipelineJob(
  job: Pick<ProjectPipelineJob, 'sheetRowIndex' | 'uiSourceOfTruth'>
): boolean {
  return (
    job.sheetRowIndex === UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX ||
    Boolean(job.uiSourceOfTruth && job.sheetRowIndex < 2)
  );
}
