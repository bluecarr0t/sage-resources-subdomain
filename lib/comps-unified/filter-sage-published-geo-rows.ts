import type { SupabaseClient } from '@supabase/supabase-js';

import { SAGE_UNIFIED_SOURCE } from '@/lib/comps-unified/build-row';
import { sageRowIdFromUnifiedId } from '@/lib/comps-unified/sage-property-group-key';

export { sageRowIdFromUnifiedId };

/**
 * When cohort requires Sage `research_status = published`, drop matview rows whose
 * underlying `all_sage_data` row is not in the allowed id set.
 */
export async function filterGeoRowsToPublishedSageIds<T extends { id: string; source: string }>(
  supabase: SupabaseClient,
  rows: T[],
  sageResearchStatus: string
): Promise<T[]> {
  const sageNumericIds: string[] = [];
  for (const r of rows) {
    if (r.source !== SAGE_UNIFIED_SOURCE) continue;
    const nid = sageRowIdFromUnifiedId(r.id);
    if (nid) sageNumericIds.push(nid);
  }
  if (sageNumericIds.length === 0) return rows;

  const { data, error } = await supabase
    .from('all_sage_data')
    .select('id')
    .in('id', sageNumericIds)
    .eq('research_status', sageResearchStatus);

  if (error) {
    console.warn('[comps/unified/geo] published Sage id lookup failed:', error.message);
    return rows;
  }

  const allowed = new Set((data ?? []).map((row) => `glamp:${row.id}`));
  return rows.filter((r) => r.source !== SAGE_UNIFIED_SOURCE || allowed.has(r.id));
}
