export const PROJECT_PIPELINE_PROJECT_STATUSES = [
  'Not Started',
  'In-Progress',
  'On Hold',
  'In Review',
  'Completed',
  'Cancelled',
] as const;

export type ProjectPipelineProjectStatus =
  (typeof PROJECT_PIPELINE_PROJECT_STATUSES)[number];

export const DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS: ProjectPipelineProjectStatus =
  'Not Started';

/** Default Project Status filter on /admin/job-pipeline. */
export const DEFAULT_PROJECT_PIPELINE_TABLE_STATUS_FILTER: ProjectPipelineProjectStatus =
  'In-Progress';

export function normalizeProjectPipelineProjectStatus(
  value: string | null | undefined
): ProjectPipelineProjectStatus {
  const trimmed = value?.trim();
  if (
    trimmed &&
    (PROJECT_PIPELINE_PROJECT_STATUSES as readonly string[]).includes(trimmed)
  ) {
    return trimmed as ProjectPipelineProjectStatus;
  }
  return DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS;
}

/** Statuses that should persist over auto-derivation from sheet fields. */
export function isStickyProjectPipelineProjectStatus(
  status: string | null | undefined
): boolean {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  return normalized === 'Cancelled' || normalized === 'On Hold';
}

/** Active-jobs consultant workload view — only Not Started and In-Progress. */
export function isConsultantWorkloadVisibleProjectStatus(
  status: string | null | undefined
): boolean {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  return normalized === 'Not Started' || normalized === 'In-Progress';
}

export function getProjectStatusSelectTextClassName(status: string): string {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  switch (normalized) {
    case 'Not Started':
      return 'font-semibold text-gray-700 dark:text-gray-300';
    case 'In-Progress':
      return 'font-semibold !text-yellow-600 dark:!text-yellow-400';
    case 'On Hold':
      return 'font-semibold text-neutral-800 dark:text-neutral-200';
    case 'In Review':
      return 'font-semibold text-blue-800 dark:text-blue-300';
    case 'Completed':
      return 'font-semibold text-green-800 dark:text-green-300';
    case 'Cancelled':
      return 'font-semibold text-red-800 dark:text-red-300';
    default:
      return 'font-semibold text-gray-700 dark:text-gray-300';
  }
}

export function getProjectStatusStyle(status: string): string {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  switch (normalized) {
    case 'Not Started':
      return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300';
    case 'In-Progress':
      return 'border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
    case 'On Hold':
      return 'border-neutral-400 bg-neutral-100 text-neutral-800 dark:border-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-200';
    case 'In Review':
      return 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'Completed':
      return 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-300';
    case 'Cancelled':
      return 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300';
    default:
      return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-300';
  }
}

/** Borderless pill surfaces for the Job Pipeline table. */
export function getProjectStatusPillClasses(status: string): string {
  const normalized = normalizeProjectPipelineProjectStatus(status);
  switch (normalized) {
    case 'Not Started':
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    case 'In-Progress':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400';
    case 'On Hold':
      return 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
    case 'In Review':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200';
    case 'Completed':
      return 'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200';
    case 'Cancelled':
      return 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200';
    default:
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
  }
}

const PROJECT_PIPELINE_PROJECT_STATUS_SORT_ORDER: Record<
  ProjectPipelineProjectStatus,
  number
> = {
  'Not Started': 0,
  'In-Progress': 1,
  'On Hold': 2,
  'In Review': 3,
  Completed: 4,
  Cancelled: 5,
};

/** Compare project statuses in pipeline workflow order for table sorting. */
export function compareProjectPipelineProjectStatus(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const aIndex =
    PROJECT_PIPELINE_PROJECT_STATUS_SORT_ORDER[normalizeProjectPipelineProjectStatus(a)];
  const bIndex =
    PROJECT_PIPELINE_PROJECT_STATUS_SORT_ORDER[normalizeProjectPipelineProjectStatus(b)];
  return aIndex - bIndex;
}
