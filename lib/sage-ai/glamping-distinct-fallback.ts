/**
 * When `distinct_column_values` RPC is still the narrow allowlist (base
 * `sage-ai-aggregation-rpc.sql`), amenity column distincts fail. This scans
 * `all_glamping_properties` in pages and counts in memory — same behavior as
 * the extended RPC (non-null values only, ordered by frequency).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isGlampingDistinctColumn } from '@/lib/sage-ai/all-glamping-properties-columns';

const PAGE = 1000;
const MAX_ROWS_TO_SCAN = 100_000;
const IDENT = /^[a-z_][a-z0-9_]*$/i;

export function isAllowlistBlockedDistinctError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes('not in the allowlist');
}

export async function scanGlampingColumnDistinctFrequencies(
  supabase: SupabaseClient,
  column: string,
  maxDistinctReturn: number
): Promise<{
  value_rows: Array<{ value: string; row_count: number }>;
  rows_scanned: number;
  scan_truncated: boolean;
}> {
  if (!isGlampingDistinctColumn(column) || !IDENT.test(column)) {
    throw new Error('column is not allowlisted for distinct value scan');
  }
  const counts = new Map<string, number>();
  let rowsScanned = 0;
  for (let offset = 0; offset < MAX_ROWS_TO_SCAN; offset += PAGE) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(column)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Array<Record<string, unknown>>;
    rowsScanned += batch.length;
    for (const r of batch) {
      const v = r[column];
      if (v == null) continue;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (batch.length < PAGE) break;
  }
  const scanTruncated = rowsScanned >= MAX_ROWS_TO_SCAN;
  const value_rows = [...counts.entries()]
    .map(([value, row_count]) => ({ value, row_count }))
    .sort((a, b) => b.row_count - a.row_count || a.value.localeCompare(b.value));
  return {
    value_rows: value_rows.slice(0, Math.max(1, maxDistinctReturn)),
    rows_scanned: rowsScanned,
    scan_truncated: scanTruncated,
  };
}
