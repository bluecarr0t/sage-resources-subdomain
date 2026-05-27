type MinimalLoadingSpinnerProps = {
  label?: string;
  hint?: string;
  className?: string;
};

/** Sage admin / map loading indicator (8px ring, sage accent). */
export default function MinimalLoadingSpinner({
  label,
  hint,
  className = '',
}: MinimalLoadingSpinnerProps) {
  return (
    <div className={`text-center ${className}`.trim()}>
      <div
        className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-sage-500 border-t-transparent"
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">{hint}</p>
      ) : null}
    </div>
  );
}
