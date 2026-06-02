/** Thrown when `glamping_industry_overview_cache` has no valid snapshot and live scan is disabled. */
export class GlampingOverviewSnapshotMissingError extends Error {
  readonly code = 'GLAMPING_OVERVIEW_SNAPSHOT_MISSING' as const;

  constructor(message?: string) {
    super(
      message ??
        'Glamping Industry Overview snapshot is missing or invalid. Run a cache refresh before loading this page.'
    );
    this.name = 'GlampingOverviewSnapshotMissingError';
  }
}

export function isGlampingOverviewSnapshotMissingError(
  err: unknown
): err is GlampingOverviewSnapshotMissingError {
  return (
    err instanceof GlampingOverviewSnapshotMissingError ||
    (err instanceof Error && err.name === 'GlampingOverviewSnapshotMissingError')
  );
}
