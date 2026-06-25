import { consultantPillSurfaceClasses } from '@/lib/project-pipeline/consultant-pill-styles';

const PILL_BASE_CLASS_NAME =
  'inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium';

export function ProjMgrPill({ value }: { value: string | null | undefined }) {
  const name = value?.trim();
  if (!name) return null;

  return (
    <span
      className={`${PILL_BASE_CLASS_NAME} ${consultantPillSurfaceClasses(name)}`}
      title={name}
    >
      {name}
    </span>
  );
}
