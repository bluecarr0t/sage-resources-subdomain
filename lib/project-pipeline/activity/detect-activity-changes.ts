import {
  formatProjectPipelineSheetDate,
  parseProjectPipelineDueDate,
} from '@/lib/project-pipeline/due-date-emphasis';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import { getProjectPipelineActivityFieldLabel } from '@/lib/project-pipeline/activity/field-labels';
import { PROJECT_PIPELINE_ACTIVITY_TRACKED_FIELDS } from '@/lib/project-pipeline/activity/field-labels';
import type { ProjectPipelineActivityChange } from '@/lib/project-pipeline/activity/types';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function normalizeFieldValue(field: string, value: unknown): string {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';

  if (field === 'reviewStatus') {
    return normalizeProjectPipelineReviewStatus(text);
  }

  if (field === 'dueDate' || field === 'contractStart' || field === 'dateCompleted') {
    const parsed = parseProjectPipelineDueDate(text);
    if (parsed == null) return text;
    return formatProjectPipelineSheetDate(text) || text;
  }

  return text;
}

export function detectProjectPipelineActivityChanges(
  previous: ProjectPipelineJob | null | undefined,
  next: ProjectPipelineJob
): ProjectPipelineActivityChange[] {
  if (!previous) return [];

  const changes: ProjectPipelineActivityChange[] = [];

  for (const field of PROJECT_PIPELINE_ACTIVITY_TRACKED_FIELDS) {
    const prevValue = normalizeFieldValue(field, previous[field]);
    const nextValue = normalizeFieldValue(field, next[field]);
    if (prevValue === nextValue) continue;

    changes.push({
      field,
      label: getProjectPipelineActivityFieldLabel(field),
      previousValue: prevValue,
      newValue: nextValue,
    });
  }

  return changes;
}
