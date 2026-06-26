import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import { normalizeProjectPipelineSentToClient } from '@/lib/project-pipeline/sent-to-client';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

/** Fields that exist in Google Sheets and can also be edited in the Job Pipeline UI. */
export const PROJECT_PIPELINE_SHEET_UI_MERGE_FIELDS = [
  'dueDate',
  'reviewStatus',
  'sentToClient',
] as const;

export type ProjectPipelineSheetUiMergeField =
  (typeof PROJECT_PIPELINE_SHEET_UI_MERGE_FIELDS)[number];

export type ProjectPipelineSheetFieldSnapshot = Partial<
  Record<ProjectPipelineSheetUiMergeField, string>
>;

export function parseProjectPipelineSheetFieldSnapshot(
  value: unknown
): ProjectPipelineSheetFieldSnapshot {
  if (!value || typeof value !== 'object') return {};

  const snapshot = value as Record<string, unknown>;
  const result: ProjectPipelineSheetFieldSnapshot = {};

  for (const field of PROJECT_PIPELINE_SHEET_UI_MERGE_FIELDS) {
    if (typeof snapshot[field] === 'string') {
      result[field] = snapshot[field];
    }
  }

  return result;
}

export function pickProjectPipelineSheetFieldSnapshot(
  job: Pick<ProjectPipelineJob, ProjectPipelineSheetUiMergeField>
): ProjectPipelineSheetFieldSnapshot {
  return {
    dueDate: job.dueDate ?? '',
    reviewStatus: job.reviewStatus ?? '',
    sentToClient: job.sentToClient ?? '',
  };
}

function normalizeSheetUiMergeFieldValue(
  field: ProjectPipelineSheetUiMergeField,
  value: string
): string {
  if (field === 'reviewStatus') {
    return normalizeProjectPipelineReviewStatus(value);
  }
  if (field === 'sentToClient') {
    return normalizeProjectPipelineSentToClient(value);
  }
  return value.trim();
}

/**
 * Last-edited-wins for dual sheet/UI fields during sync:
 * - Sheet changed since last sync → sheet wins
 * - Sheet unchanged and UI value differs → UI wins
 * - Otherwise → sheet value
 */
export function resolveProjectPipelineSheetUiMergeField(params: {
  field: ProjectPipelineSheetUiMergeField;
  sheetValue: string;
  snapshotValue: string | undefined;
  uiValue: string;
}): string {
  const sheetValue = normalizeSheetUiMergeFieldValue(params.field, params.sheetValue);
  const uiValue = normalizeSheetUiMergeFieldValue(params.field, params.uiValue);
  const snapshotValue =
    params.snapshotValue !== undefined
      ? normalizeSheetUiMergeFieldValue(params.field, params.snapshotValue)
      : undefined;

  if (snapshotValue === undefined) {
    return sheetValue;
  }

  if (sheetValue !== snapshotValue) {
    return sheetValue;
  }

  if (uiValue !== sheetValue) {
    return uiValue;
  }

  return sheetValue;
}

export function mergeProjectPipelineSheetUiFields(
  sheetJob: ProjectPipelineJob,
  uiJob: ProjectPipelineJob,
  snapshot: ProjectPipelineSheetFieldSnapshot
): Pick<ProjectPipelineJob, ProjectPipelineSheetUiMergeField> {
  const merged = {} as Pick<ProjectPipelineJob, ProjectPipelineSheetUiMergeField>;

  for (const field of PROJECT_PIPELINE_SHEET_UI_MERGE_FIELDS) {
    merged[field] = resolveProjectPipelineSheetUiMergeField({
      field,
      sheetValue: sheetJob[field] ?? '',
      snapshotValue: snapshot[field],
      uiValue: uiJob[field] ?? '',
    });
  }

  return merged;
}
