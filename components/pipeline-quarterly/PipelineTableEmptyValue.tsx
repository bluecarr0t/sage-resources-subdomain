/** Shared empty-cell placeholder for pipeline property tables. */
export const PIPELINE_EMPTY_CELL_DISPLAY = '—';

const PIPELINE_EMPTY_CELL_CLASS =
  'inline-block text-sm font-light leading-none text-neutral-400';

export function PipelineTableEmptyValue() {
  return (
    <span className={PIPELINE_EMPTY_CELL_CLASS} aria-label="Not available">
      {PIPELINE_EMPTY_CELL_DISPLAY}
    </span>
  );
}

export function renderPipelineEmptyCell(emptyDisplay?: string) {
  if (emptyDisplay === '') return null;
  return <PipelineTableEmptyValue />;
}
