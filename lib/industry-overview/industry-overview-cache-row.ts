/**
 * Shared helpers for industry overview Postgres snapshot rows (`*_overview_cache`).
 * One round-trip can supply both the materialized payload and admin cache-bar metadata.
 */

export type IndustryOverviewCacheRow = {
  payload: unknown;
  computed_at: string | null;
  rows_scanned: number | null;
};

export type IndustryOverviewSnapshotMetaFields = {
  present: boolean;
  computedAt: string | null;
  rowsScanned: number | null;
};

export function industryOverviewSnapshotMetaFromRow(
  row: IndustryOverviewCacheRow | null | undefined,
  options?: { requirePayload?: boolean }
): IndustryOverviewSnapshotMetaFields {
  if (!row) {
    return { present: false, computedAt: null, rowsScanned: null };
  }
  const hasPayload = row.payload != null;
  if (options?.requirePayload && !hasPayload) {
    return { present: false, computedAt: null, rowsScanned: null };
  }
  if (!hasPayload && row.computed_at == null) {
    return { present: false, computedAt: null, rowsScanned: null };
  }
  return {
    present: true,
    computedAt: row.computed_at ?? null,
    rowsScanned: typeof row.rows_scanned === 'number' ? row.rows_scanned : null,
  };
}
