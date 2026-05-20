import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import type { SageProperty } from '@/lib/types/sage';

/** Fields loaded by MapContext for /api/properties (map markers + sidebar count). */
export const PUBLIC_MAP_PROPERTY_FIELDS =
  'id,property_name,lat,lon,state,country,unit_type,rate_category';

/**
 * Fetch all rows in the public map cohort (same filters as GET /api/properties with no query params).
 */
export async function fetchPublicMapPropertyRows(): Promise<SageProperty[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('all_glamping_properties')
    .select(PUBLIC_MAP_PROPERTY_FIELDS)
    .eq('is_glamping_property', 'Yes')
    .eq('is_open', 'Yes')
    .neq('is_open', 'Proposed Development')
    .neq('is_open', 'Under Construction')
    .neq('is_open', 'Closed')
    .eq('research_status', 'published')
    .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
    .limit(5000);

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
