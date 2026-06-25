import {
  isUiCreatedProjectPipelineJob,
  UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
} from '@/lib/project-pipeline/create-job';
import { resolveProjectPipelineSheetTab } from '@/lib/project-pipeline/sheet-tabs';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

/** Validates job objects sent from the Job Pipeline UI to pipeline write APIs. */
export function isProjectPipelineJobPayload(value: unknown): value is ProjectPipelineJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as ProjectPipelineJob;
  return (
    typeof job.jobNumber === 'string' &&
    typeof job.sheetRowIndex === 'number' &&
    Number.isFinite(job.sheetRowIndex) &&
    job.sheetRowIndex >= 0
  );
}

/** Ensure UI-created jobs keep the Supabase-only row marker before save/create. */
export function normalizeUiCreatedProjectPipelineJobPayload(
  job: ProjectPipelineJob
): ProjectPipelineJob {
  const pipelineSheetName = resolveProjectPipelineSheetTab(job.pipelineSheetName);

  if (job.uiSourceOfTruth || isUiCreatedProjectPipelineJob(job)) {
    return {
      ...job,
      jobNumber: job.jobNumber.trim(),
      pipelineSheetName,
      sheetRowIndex: UI_CREATED_PROJECT_PIPELINE_SHEET_ROW_INDEX,
      uiSourceOfTruth: true,
    };
  }

  return {
    ...job,
    jobNumber: job.jobNumber.trim(),
    pipelineSheetName,
  };
}
