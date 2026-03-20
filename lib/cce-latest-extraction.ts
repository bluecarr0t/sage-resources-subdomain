/**
 * Helper to get the latest extraction_date from cce_cost_rows.
 * Used to filter cost data to only the most recent extraction (avoids duplicates across months).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function getLatestCceExtractionDate(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from('cce_cost_rows')
    .select('extraction_date')
    .not('extraction_date', 'is', null)
    .order('extraction_date', { ascending: false })
    .limit(1);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as { extraction_date?: string } | null)?.extraction_date ?? null;
}
