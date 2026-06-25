import { parseAppraiserConsultantValues } from '@/lib/project-pipeline/appraiser-consultant-display';
import { consultantPillSurfaceClasses } from '@/lib/project-pipeline/consultant-pill-styles';

const PILL_BASE_CLASS_NAME =
  'inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium';

export function AppraiserConsultantPills({ value }: { value: string | null | undefined }) {
  const names = parseAppraiserConsultantValues(value);

  if (!names.length) {
    return <span className="text-sm text-neutral-700 dark:text-neutral-300">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className={`${PILL_BASE_CLASS_NAME} ${consultantPillSurfaceClasses(name)}`}
          title={name}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
