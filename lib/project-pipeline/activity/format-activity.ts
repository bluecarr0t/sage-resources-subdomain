import type {
  ProjectPipelineActivityAction,
  ProjectPipelineActivityChange,
} from '@/lib/project-pipeline/activity/types';

const ACTION_LABELS: Record<ProjectPipelineActivityAction, string> = {
  job_created: 'Created job',
  job_updated: 'Updated job',
  job_deleted: 'Deleted job',
  review_action: 'Review action',
  project_status_updated: 'Updated project status',
  sheet_sync_created: 'Synced from Google Sheets (new job)',
  sheet_sync_updated: 'Synced from Google Sheets (updated)',
  sheet_sync_removed: 'Removed from Google Sheets sync',
};

const REVIEW_ACTION_LABELS: Record<string, string> = {
  submit_for_review: 'Submitted for review',
  resubmit: 'Resubmitted for review',
  review_feedback: 'Reviewer feedback',
};

export function formatProjectPipelineActivityAction(
  action: ProjectPipelineActivityAction,
  metadata?: Record<string, unknown>
): string {
  if (action === 'review_action') {
    const reviewAction =
      typeof metadata?.reviewAction === 'string' ? metadata.reviewAction : '';
    return REVIEW_ACTION_LABELS[reviewAction] ?? ACTION_LABELS.review_action;
  }
  return ACTION_LABELS[action];
}

export function summarizeProjectPipelineActivityChanges(
  changes: readonly ProjectPipelineActivityChange[]
): string {
  if (!changes.length) return '—';
  return changes
    .map((change) => {
      const previous = change.previousValue || '—';
      const next = change.newValue || '—';
      return `${change.label}: ${previous} → ${next}`;
    })
    .join('; ');
}
