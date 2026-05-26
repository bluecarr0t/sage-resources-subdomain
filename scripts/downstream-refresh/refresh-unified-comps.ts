import type { PoolClient } from 'pg';

export type UnifiedCompsRefreshMode = 'concurrent' | 'plain';

export interface RefreshUnifiedCompsResult {
  mode: UnifiedCompsRefreshMode;
  durationMs: number;
  rowCount: number | null;
}

/**
 * Refresh public.unified_comps after hipcamp/campspot flat table updates.
 * Tries CONCURRENTLY first (non-blocking reads); falls back to plain refresh.
 */
export async function refreshUnifiedCompsMatview(
  client: PoolClient
): Promise<RefreshUnifiedCompsResult> {
  const started = Date.now();
  let mode: UnifiedCompsRefreshMode = 'concurrent';

  try {
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps');
  } catch (concurrentErr) {
    const message =
      concurrentErr instanceof Error ? concurrentErr.message : String(concurrentErr);
    console.warn(
      `  unified_comps concurrent refresh failed, using plain refresh: ${message}`
    );
    mode = 'plain';
    await client.query('REFRESH MATERIALIZED VIEW public.unified_comps');
  }

  const countRes = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM public.unified_comps`
  );
  const rowCount = parseInt(countRes.rows[0]?.count ?? '0', 10);

  return {
    mode,
    durationMs: Date.now() - started,
    rowCount,
  };
}
