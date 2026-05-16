/** Compact label/value tile used throughout market report sections. */
export function Stat({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: string;
  /** Renders without the surrounding card (use inside an already-bordered group). */
  plain?: boolean;
}) {
  const wrapper = plain
    ? 'flex flex-col gap-0.5'
    : 'flex flex-col gap-0.5 rounded-md border border-neutral-200/80 bg-neutral-50/60 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40';
  return (
    <div className={wrapper}>
      <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span className="tabular-nums text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
    </div>
  );
}
