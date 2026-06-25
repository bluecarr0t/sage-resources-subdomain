import {
  formatProjectPipelineSheetDate,
  parseProjectPipelineDueDate,
} from '@/lib/project-pipeline/due-date-emphasis';
import { withDerivedProjectPipelineProjectStatus } from '@/lib/project-pipeline/derive-project-status';
import {
  normalizeProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';
import { normalizeProjectPipelineReviewStatus } from '@/lib/project-pipeline/review-status';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

export type ProjectPipelineJobChangeType = 'reviewStatus' | 'dueDate' | 'projectStatus';

export type ProjectPipelineJobChange =
  | {
      type: 'reviewStatus';
      previousValue: string;
      newValue: string;
    }
  | {
      type: 'dueDate';
      previousValue: string;
      newValue: string;
    }
  | {
      type: 'projectStatus';
      previousValue: string;
      newValue: string;
    };

function normalizeDueDateForCompare(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  const parsed = parseProjectPipelineDueDate(trimmed);
  if (parsed == null) return trimmed.toLowerCase();
  return formatProjectPipelineSheetDate(trimmed).toLowerCase();
}

function effectiveProjectStatusForNotification(job: ProjectPipelineJob): string {
  const resolved = job.projectStatusManual
    ? job
    : withDerivedProjectPipelineProjectStatus(job);
  return normalizeProjectPipelineProjectStatus(resolved.projectStatus);
}

export function detectProjectPipelineJobChanges(
  previous: ProjectPipelineJob | null | undefined,
  next: ProjectPipelineJob
): ProjectPipelineJobChange[] {
  if (!previous) return [];

  const changes: ProjectPipelineJobChange[] = [];

  const prevReview = normalizeProjectPipelineReviewStatus(previous.reviewStatus);
  const nextReview = normalizeProjectPipelineReviewStatus(next.reviewStatus);
  if (prevReview !== nextReview) {
    changes.push({
      type: 'reviewStatus',
      previousValue: prevReview,
      newValue: nextReview,
    });
  }

  const prevDue = normalizeDueDateForCompare(previous.dueDate);
  const nextDue = normalizeDueDateForCompare(next.dueDate);
  if (prevDue !== nextDue) {
    changes.push({
      type: 'dueDate',
      previousValue: previous.dueDate?.trim() ?? '',
      newValue: next.dueDate?.trim() ?? '',
    });
  }

  const prevProjectStatus = effectiveProjectStatusForNotification(previous);
  const nextProjectStatus = effectiveProjectStatusForNotification(next);
  if (prevProjectStatus !== nextProjectStatus) {
    changes.push({
      type: 'projectStatus',
      previousValue: prevProjectStatus,
      newValue: nextProjectStatus,
    });
  }

  return changes;
}
