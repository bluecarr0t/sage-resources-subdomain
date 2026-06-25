export const PROJECT_PIPELINE_REVIEW_STATUSES = [
  'In-Progress',
  'Changes Requested',
  'Approved - Minor Changes, Then Send to Client',
  'Approved - No Changes, Send to Client',
] as const;

export type ProjectPipelineReviewStatus = (typeof PROJECT_PIPELINE_REVIEW_STATUSES)[number];

export const DEFAULT_PROJECT_PIPELINE_REVIEW_STATUS = '';

/** Display label when review status is stored as In-Progress (submitted, awaiting PM). */
export const PROJECT_PIPELINE_AWAITING_REVIEWER_LABEL = 'Awaiting Reviewer';

export function normalizeProjectPipelineReviewStatus(
  value: string | null | undefined
): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return DEFAULT_PROJECT_PIPELINE_REVIEW_STATUS;
  if (trimmed.toLowerCase() === 'not started') return DEFAULT_PROJECT_PIPELINE_REVIEW_STATUS;
  return trimmed;
}

export function getShortReviewStatusLabel(status: string): string {
  const trimmed = normalizeProjectPipelineReviewStatus(status);
  if (!trimmed) return '';

  const normalized = trimmed.toLowerCase();
  if (normalized.includes('approved')) return 'Approved';
  if (normalized.includes('cancelled')) return 'Cancelled';
  if (normalized === 'in-progress' || normalized === 'in progress') {
    return PROJECT_PIPELINE_AWAITING_REVIEWER_LABEL;
  }

  const dashIndex = trimmed.indexOf(' - ');
  if (dashIndex > 0) {
    const head = trimmed.slice(0, dashIndex).trim();
    if (head.toLowerCase() === 'in review') {
      return PROJECT_PIPELINE_AWAITING_REVIEWER_LABEL;
    }
    return head;
  }

  if (normalized === 'in review') {
    return PROJECT_PIPELINE_AWAITING_REVIEWER_LABEL;
  }

  return trimmed;
}

/** Table/readout label — empty review status renders as —. */
export function getReviewStatusDisplayLabel(status: string | null | undefined): string {
  const label = getShortReviewStatusLabel(status ?? '');
  return label || '—';
}

/** Full label for select menus — keeps distinct approved variants visible. */
export function getReviewStatusDropdownLabel(status: string): string {
  const trimmed = normalizeProjectPipelineReviewStatus(status);
  if (!trimmed) return '—';

  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith('approved -')) {
    return trimmed;
  }

  return getShortReviewStatusLabel(trimmed);
}

export function getReviewStatusSelectTextClassName(status: string): string {
  const normalized = normalizeProjectPipelineReviewStatus(status).toLowerCase();

  if (!normalized) {
    return 'font-semibold text-gray-700 dark:text-gray-200';
  }
  if (normalized.includes('cancelled')) {
    return 'font-semibold text-red-700 dark:text-red-300';
  }
  if (normalized.includes('changes requested')) {
    return 'font-semibold text-orange-700 dark:text-orange-300';
  }
  if (normalized.includes('approved')) {
    return 'font-semibold text-green-700 dark:text-green-300';
  }
  if (normalized.includes('in review')) {
    return 'font-semibold text-yellow-700 dark:text-yellow-300';
  }
  if (normalized === 'in-progress' || normalized === 'in progress') {
    return 'font-semibold text-yellow-700 dark:text-yellow-300';
  }
  return 'font-semibold text-gray-700 dark:text-gray-200';
}

/** Neutral select shell + status text color for review status dropdowns. */
export function getReviewStatusSelectClassName(status: string): string {
  return `rounded-md border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-700 disabled:!opacity-100 ${getReviewStatusSelectTextClassName(status)}`;
}

export function getReviewStatusStyle(status: string): string {
  const normalized = normalizeProjectPipelineReviewStatus(status).toLowerCase();
  const base =
    'rounded-md border font-semibold shadow-sm disabled:!opacity-100';

  if (!normalized) {
    return `${base} border-gray-600/40 !bg-gray-600/20 text-gray-800 dark:border-gray-500/50 dark:!bg-gray-500/20 dark:text-gray-200`;
  }
  if (normalized.includes('cancelled')) {
    return `${base} border-red-600/40 !bg-red-600/20 text-red-800 dark:border-red-500/50 dark:!bg-red-500/20 dark:text-red-200`;
  }
  if (normalized.includes('changes requested')) {
    return `${base} border-orange-600/40 !bg-orange-600/20 text-orange-800 dark:border-orange-500/50 dark:!bg-orange-500/20 dark:text-orange-200`;
  }
  if (normalized.includes('approved')) {
    return `${base} border-green-600/40 !bg-green-600/20 text-green-800 dark:border-green-500/50 dark:!bg-green-500/20 dark:text-green-200`;
  }
  if (normalized.includes('in review')) {
    return `${base} border-yellow-600/40 !bg-yellow-600/20 text-yellow-800 dark:border-yellow-500/50 dark:!bg-yellow-500/20 dark:text-yellow-200`;
  }
  if (normalized === 'in-progress' || normalized === 'in progress') {
    return `${base} border-yellow-600/40 !bg-yellow-600/20 text-yellow-800 dark:border-yellow-500/50 dark:!bg-yellow-500/20 dark:text-yellow-200`;
  }
  return `${base} border-gray-600/40 !bg-gray-600/20 text-gray-800 dark:border-gray-500/50 dark:!bg-gray-500/20 dark:text-gray-200`;
}
