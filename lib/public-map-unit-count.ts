import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { applyPublicMapCohortFilters } from '@/lib/public-map-cohort-filters';
import { sumUnitsByUniquePropertyName } from '@/lib/sum-units-by-unique-property-name';

const TABLE = 'all_sage_data';

/**
 * Unit inventory for the public glamping map cohort, one total per unique
 * Property Name (same filters as `fetchPublicMapPropertyRows`).
 */
async function loadPublicMapGlampingUnitCount(): Promise<number> {
  const supabase = createServerClient();

  let query = applyPublicMapCohortFilters(
    supabase
      .from(TABLE)
      .select('property_name, unit_type, quantity_of_units, property_total_sites')
  ).limit(5000);

  const rows: Array<{
    property_name?: string | null;
    unit_type?: string | null;
    quantity_of_units?: unknown;
    property_total_sites?: unknown;
  }> = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batchData, error } = await query.range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[loadPublicMapGlampingUnitCount]', error);
      throw new Error(`Failed to fetch glamping unit count: ${error.message}`);
    }

    if (!batchData?.length) break;
    rows.push(...batchData);
    if (batchData.length < batchSize) break;
    offset += batchSize;
  }

  return sumUnitsByUniquePropertyName(rows);
}

/**
 * Cached glamping unit inventory for marketing stats (homepage).
 * Invalidates with the `properties` cache tag when property data changes.
 */
export function getPublicMapGlampingUnitCount(): Promise<number> {
  return unstable_cache(
    loadPublicMapGlampingUnitCount,
    ['public-map-glamping-unit-count-unique-property-name'],
    { revalidate: 1800, tags: ['properties'] }
  )();
}
