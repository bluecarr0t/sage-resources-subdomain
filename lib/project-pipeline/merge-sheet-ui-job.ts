import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';
import {
  mergeProjectPipelineSheetUiFields,
  type ProjectPipelineSheetFieldSnapshot,
} from '@/lib/project-pipeline/sheet-field-snapshot';

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
 * Sheet refresh columns always come from the sheet; dual-edit fields use last-edited-wins.
 */
export function mergeSheetJobWithUiEditedJob(
  sheetJob: ProjectPipelineJob,
  uiEdited: ProjectPipelineJob,
  options?: { sheetFieldSnapshot?: ProjectPipelineSheetFieldSnapshot }
): ProjectPipelineJob {
  const snapshot = options?.sheetFieldSnapshot ?? uiEdited.sheetFieldSnapshot ?? {};
  const mergedSheetUiFields = mergeProjectPipelineSheetUiFields(sheetJob, uiEdited, snapshot);

  const merged: ProjectPipelineJob = {
    ...uiEdited,
    ...pickSheetRefreshFields(sheetJob),
    ...mergedSheetUiFields,
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
