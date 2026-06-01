/** Thrown when `campspot_rv_overview_cache` has no valid snapshot and live scan is disabled. */
export class RvOverviewSnapshotMissingError extends Error {
  readonly code = 'RV_OVERVIEW_SNAPSHOT_MISSING' as const;

  constructor(message?: string) {
    super(
      message ??
        'RV Industry Overview snapshot is missing or invalid. Run a cache refresh before loading this page.'
    );
    this.name = 'RvOverviewSnapshotMissingError';
  }
}

export function isRvOverviewSnapshotMissingError(
  error: unknown
): error is RvOverviewSnapshotMissingError {
  return (
    error instanceof RvOverviewSnapshotMissingError ||
    (error instanceof Error && error.name === 'RvOverviewSnapshotMissingError')
  );
}
