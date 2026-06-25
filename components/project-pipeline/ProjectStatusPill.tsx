import { getProjectStatusPillClasses } from '@/lib/project-pipeline/project-status';

const PILL_BASE_CLASS_NAME =
  'inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium';

export function ProjectStatusPill({ status }: { status: string }) {
  const label = status.trim() || 'Not Started';

  return (
    <span className={`${PILL_BASE_CLASS_NAME} ${getProjectStatusPillClasses(label)}`} title={label}>
      {label}
    </span>
  );
}
