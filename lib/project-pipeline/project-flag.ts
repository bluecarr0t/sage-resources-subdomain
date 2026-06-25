export const PROJECT_PIPELINE_FLAG_VALUES = [
  'None',
  'Attention',
  'Escalation',
  'Client Issue',
  'Data Issue',
  'Scope Risk',
] as const;

export type ProjectPipelineFlag = (typeof PROJECT_PIPELINE_FLAG_VALUES)[number];

export const DEFAULT_PROJECT_PIPELINE_FLAG: ProjectPipelineFlag = 'None';

export function normalizeProjectPipelineFlag(
  value: string | null | undefined
): ProjectPipelineFlag {
  const trimmed = value?.trim();
  if (trimmed && (PROJECT_PIPELINE_FLAG_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed as ProjectPipelineFlag;
  }
  return DEFAULT_PROJECT_PIPELINE_FLAG;
}

export function shouldShowProjectPipelineFlagWarning(flag: string | null | undefined): boolean {
  return normalizeProjectPipelineFlag(flag) !== DEFAULT_PROJECT_PIPELINE_FLAG;
}

export function getProjectPipelineFlagSelectTextClassName(
  flag: string | null | undefined
): string {
  const normalized = normalizeProjectPipelineFlag(flag);
  switch (normalized) {
    case 'Attention':
      return 'font-semibold text-amber-700 dark:text-amber-300';
    case 'Escalation':
      return 'font-semibold text-red-700 dark:text-red-300';
    case 'Client Issue':
      return 'font-semibold text-orange-700 dark:text-orange-300';
    case 'Data Issue':
      return 'font-semibold text-violet-700 dark:text-violet-300';
    case 'Scope Risk':
      return 'font-semibold text-rose-700 dark:text-rose-300';
    default:
      return 'font-semibold text-neutral-600 dark:text-neutral-300';
  }
}

export function getProjectPipelineFlagPillClasses(flag: string | null | undefined): string {
  const normalized = normalizeProjectPipelineFlag(flag);
  switch (normalized) {
    case 'Attention':
      return 'border-amber-500/40 !bg-amber-500/20 text-amber-900 dark:border-amber-500/50 dark:!bg-amber-500/20 dark:text-amber-100';
    case 'Escalation':
      return 'border-red-600/40 !bg-red-600/20 text-red-900 dark:border-red-500/50 dark:!bg-red-500/20 dark:text-red-100';
    case 'Client Issue':
      return 'border-orange-600/40 !bg-orange-600/20 text-orange-900 dark:border-orange-500/50 dark:!bg-orange-500/20 dark:text-orange-100';
    case 'Data Issue':
      return 'border-violet-600/40 !bg-violet-600/20 text-violet-900 dark:border-violet-500/50 dark:!bg-violet-500/20 dark:text-violet-100';
    case 'Scope Risk':
      return 'border-rose-600/40 !bg-rose-600/20 text-rose-900 dark:border-rose-500/50 dark:!bg-rose-500/20 dark:text-rose-100';
    default:
      return 'border-neutral-300 !bg-neutral-100/20 text-neutral-600 dark:border-neutral-600 dark:!bg-neutral-700/20 dark:text-neutral-300';
  }
}

export function getProjectPipelineFlagWarningIconClassName(
  flag: string | null | undefined
): string {
  const normalized = normalizeProjectPipelineFlag(flag);
  switch (normalized) {
    case 'Escalation':
      return 'text-red-600 dark:text-red-400';
    case 'Attention':
      return 'text-amber-600 dark:text-amber-400';
    case 'Client Issue':
      return 'text-orange-600 dark:text-orange-400';
    case 'Data Issue':
      return 'text-violet-600 dark:text-violet-400';
    case 'Scope Risk':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-amber-600 dark:text-amber-400';
  }
}
