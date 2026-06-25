import {
  getProjectPipelineFlagPillClasses,
  normalizeProjectPipelineFlag,
  shouldShowProjectPipelineFlagWarning,
} from '@/lib/project-pipeline/project-flag';

const PILL_BASE_CLASS_NAME =
  'inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold';

export function ProjectFlagPill({ flag }: { flag: string | null | undefined }) {
  const normalized = normalizeProjectPipelineFlag(flag);
  if (!shouldShowProjectPipelineFlagWarning(normalized)) {
    return <span className="text-neutral-400 dark:text-neutral-500">—</span>;
  }

  return (
    <span
      className={`${PILL_BASE_CLASS_NAME} ${getProjectPipelineFlagPillClasses(normalized)}`}
      title={normalized}
    >
      {normalized}
    </span>
  );
}
