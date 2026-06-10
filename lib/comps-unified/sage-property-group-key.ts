import type { SupabaseClient } from '@supabase/supabase-js';

import { SAGE_UNIFIED_SOURCE } from '@/lib/comps-unified/build-row';

/** Strip `glamp:` prefix from unified_comps matview ids. */
export function sageRowIdFromUnifiedId(id: string): string | null {
  const m = /^glamp:(\d+)$/.exec(id.trim());
  return m ? m[1] : null;
}

export type SagePropertyIdFields = {
  sage_property_id?: string | null;
  /** True when 2+ Sage rows in the batch share the same property_id. */
  sage_property_id_shared?: boolean;
};

/**
 * Client-side group key aligned with `unified_comps_property_group_key()` in Postgres.
 * For Sage, groups by shared `property_id` when multiple site rows use it; otherwise address_key.
 */
export function unifiedPropertyGroupKey(
  row: {
    source: string;
    address_key?: string | null;
    id: string;
  } & SagePropertyIdFields
): string {
  if (row.source === SAGE_UNIFIED_SOURCE) {
    const pid = row.sage_property_id?.trim();
    if (pid && row.sage_property_id_shared) {
      return `${row.source}\u0001${pid}`;
    }
  }
  const k = row.address_key?.trim();
  if (k) return `${row.source}\u0001${k}`;
  return `${row.source}\u0001__row:${row.id}`;
}

async function fetchGloballySharedSagePropertyIds(
  supabase: SupabaseClient,
  propertyIds: string[]
): Promise<Set<string>> {
  const unique = [...new Set(propertyIds.map((p) => p.trim()).filter(Boolean))];
  if (unique.length === 0) return new Set();

  const { data, error } = await supabase
    .from('all_sage_data')
    .select('property_id')
    .in('property_id', unique);

  if (error) {
    console.warn('[comps-unified] shared property_id lookup failed:', error.message);
    return new Set();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row && typeof row === 'object' && 'property_id' in row) {
      const pid = String((row as { property_id: string }).property_id).trim();
      if (pid) counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }
  const shared = new Set<string>();
  for (const [pid, n] of counts) {
    if (n > 1) shared.add(pid);
  }
  return shared;
}

export async function attachSagePropertyIds<T extends { id: string; source: string }>(
  supabase: SupabaseClient,
  rows: T[]
): Promise<Array<T & SagePropertyIdFields & { sage_property_id_shared: boolean }>> {
  const sageNumericIds: string[] = [];
  for (const r of rows) {
    if (r.source !== SAGE_UNIFIED_SOURCE) continue;
    const nid = sageRowIdFromUnifiedId(r.id);
    if (nid) sageNumericIds.push(nid);
  }
  if (sageNumericIds.length === 0) {
    return rows.map((r) => ({
      ...r,
      sage_property_id: null,
      sage_property_id_shared: false,
    }));
  }

  const { data, error } = await supabase
    .from('all_sage_data')
    .select('id, property_id')
    .in('id', sageNumericIds);

  if (error) {
    console.warn('[comps-unified] sage property_id lookup failed:', error.message);
    return rows.map((r) => ({
      ...r,
      sage_property_id: null,
      sage_property_id_shared: false,
    }));
  }

  const pidByRowId = new Map<string, string>();
  for (const row of data ?? []) {
    if (row && typeof row === 'object' && 'id' in row && 'property_id' in row) {
      const r = row as { id: number | string; property_id: string };
      pidByRowId.set(String(r.id), String(r.property_id));
    }
  }

  const withPid = rows.map((r) => {
    if (r.source !== SAGE_UNIFIED_SOURCE) {
      return { ...r, sage_property_id: null as string | null };
    }
    const nid = sageRowIdFromUnifiedId(r.id);
    return { ...r, sage_property_id: nid ? (pidByRowId.get(nid) ?? null) : null };
  });

  const sharedPids = await fetchGloballySharedSagePropertyIds(
    supabase,
    withPid.map((r) => r.sage_property_id).filter((p): p is string => Boolean(p))
  );

  return withPid.map((r) => {
    const pid = r.sage_property_id?.trim();
    return {
      ...r,
      sage_property_id_shared: Boolean(pid && sharedPids.has(pid)),
    };
  });
}
