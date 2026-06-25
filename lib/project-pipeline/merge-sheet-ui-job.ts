import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

/** Sheet columns refreshed on cron sync — not edited in the Job Pipeline UI. */
const SHEET_REFRESH_FIELDS = [
  'client',
  'propertyLocation',
  'appraiserConsultant',
  'projMgr',
  'contractStart',
  'dateCompleted',
  'commercialOutdoor',
  'propertyType',
  'service',
  'authorSlackUsername',
  'clientEmail',
  'sheetRowIndex',
] as const satisfies readonly (keyof ProjectPipelineJob)[];

type SheetRefreshFields = Pick<ProjectPipelineJob, (typeof SHEET_REFRESH_FIELDS)[number]>;

function pickSheetRefreshFields(sheetJob: ProjectPipelineJob): SheetRefreshFields {
  return {
    client: sheetJob.client,
    propertyLocation: sheetJob.propertyLocation,
    appraiserConsultant: sheetJob.appraiserConsultant,
    projMgr: sheetJob.projMgr,
    contractStart: sheetJob.contractStart,
    dateCompleted: sheetJob.dateCompleted,
    commercialOutdoor: sheetJob.commercialOutdoor,
    propertyType: sheetJob.propertyType,
    service: sheetJob.service,
    authorSlackUsername: sheetJob.authorSlackUsername,
    clientEmail: sheetJob.clientEmail,
    sheetRowIndex: sheetJob.sheetRowIndex,
  };
}

/**
 * Merge a fresh Google Sheets row with a UI-edited Supabase row.
 * UI-owned fields (review status, sent to client, due date, project status, flag, notes) win.
 */
export function mergeSheetJobWithUiEditedJob(
  sheetJob: ProjectPipelineJob,
  uiEdited: ProjectPipelineJob
): ProjectPipelineJob {
  const merged: ProjectPipelineJob = {
    ...uiEdited,
    ...pickSheetRefreshFields(sheetJob),
    uiSourceOfTruth: true,
    pipelineSheetName: sheetJob.pipelineSheetName ?? uiEdited.pipelineSheetName,
    sheetYear: sheetJob.sheetYear ?? uiEdited.sheetYear,
  };

  if (uiEdited.projectStatusManual) {
    return {
      ...merged,
      projectStatus: uiEdited.projectStatus,
      projectStatusManual: true,
    };
  }

  return withDerivedProjectPipelineProjectStatus(merged, uiEdited.projectStatus);
}
