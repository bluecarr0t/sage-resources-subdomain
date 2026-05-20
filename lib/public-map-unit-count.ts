import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { parseNum } from '@/lib/comps-v2/geo';

const TABLE = 'all_glamping_properties';

function unitsFromRow(quantity_of_units: unknown): number {
  const n = parseNum(quantity_of_units);
  if (n == null || n <= 0) return 0;
  return Math.round(n);
}

/**
 * Sum of `quantity_of_units` for the public glamping map cohort
 * (same filters as `fetchPublicMapPropertyRows`).
 */
async function loadPublicMapGlampingUnitCount(): Promise<number> {
  const supabase = createServerClient();

  let query = supabase
    .from(TABLE)
    .select('quantity_of_units')
    .eq('is_glamping_property', 'Yes')
    .eq('is_open', 'Yes')
    .neq('is_open', 'Proposed Development')
    .neq('is_open', 'Under Construction')
    .neq('is_open', 'Closed')
    .eq('research_status', 'published')
    .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
    .limit(5000);

  let total = 0;
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batchData, error } = await query.range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[loadPublicMapGlampingUnitCount]', error);
      throw new Error(`Failed to fetch glamping unit count: ${error.message}`);
    }

    if (!batchData?.length) break;

    for (const row of batchData) {
      total += unitsFromRow(row.quantity_of_units);
    }

    if (batchData.length < batchSize) break;
    offset += batchSize;
  }

  return total;
}

/**
 * Cached glamping unit inventory for marketing stats (homepage).
 * Invalidates with the `properties` cache tag when property data changes.
 */
export function getPublicMapGlampingUnitCount(): Promise<number> {
  return unstable_cache(
    loadPublicMapGlampingUnitCount,
    ['public-map-glamping-unit-count'],
    { revalidate: 1800, tags: ['properties'] }
  )();
}
