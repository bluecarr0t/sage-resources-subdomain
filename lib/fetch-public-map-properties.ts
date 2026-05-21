import { createServerClient } from '@/lib/supabase';
import { applyPublicMapCohortFilters } from '@/lib/public-map-cohort-filters';
import type { SageProperty } from '@/lib/types/sage';

/** Fields loaded by MapContext for /api/properties (map markers + sidebar count). */
export const PUBLIC_MAP_PROPERTY_FIELDS =
  'id,property_name,lat,lon,state,country,unit_type,rate_category';

/**
 * Fetch all rows in the public map cohort (same filters as GET /api/properties with no query params).
 */
export async function fetchPublicMapPropertyRows(): Promise<SageProperty[]> {
  const supabase = createServerClient();

  let query = applyPublicMapCohortFilters(
    supabase.from('all_glamping_properties').select(PUBLIC_MAP_PROPERTY_FIELDS)
  ).limit(5000);

  const allData: SageProperty[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batchData, error } = await query.range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[fetchPublicMapPropertyRows]', error);
      throw new Error(`Failed to fetch map properties: ${error.message}`);
    }

    if (!batchData?.length) break;
    allData.push(...(batchData as SageProperty[]));
    if (batchData.length < batchSize) break;
    offset += batchSize;
  }

  return allData;
}
