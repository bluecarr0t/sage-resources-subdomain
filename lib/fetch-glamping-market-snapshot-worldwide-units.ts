import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_OVERVIEW_CACHE_TAGS,
  GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/glamping-market-overview-cache';
import { applyGlampingOnlyPropertyTypeFilter } from '@/lib/glamping-market-snapshot-property-type-filter';
import { sumGlampingMarketSnapshotInventoryUnits } from '@/lib/glamping-market-snapshot-inventory';

const TABLE = 'all_sage_data';
const PAGE_SIZE = 1000;

type SnapshotUnitRow = {
  property_type: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
};

/**
 * Total glamping units worldwide using `/glamping-market-overview` rules
 * (published private-commercial Glamping rows, all countries, no map open/coords filter).
 */
async function loadGlampingMarketSnapshotWorldwideUnitCount(): Promise<number> {
  const supabase = createServerClient();
  let total = 0;
  let offset = 0;

  for (;;) {
    const query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from(TABLE)
        .select('property_type, unit_type, is_open, quantity_of_units, property_total_sites')
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
    );

    const { data, error } = await query
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[loadGlampingMarketSnapshotWorldwideUnitCount]', error);
      throw new Error(`Failed to fetch worldwide glamping unit count: ${error.message}`);
    }

    const batch = (data ?? []) as SnapshotUnitRow[];
    if (batch.length === 0) break;

    total += sumGlampingMarketSnapshotInventoryUnits(batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return total;
}

export function getGlampingMarketSnapshotWorldwideUnitCount(): Promise<number> {
  return unstable_cache(
    loadGlampingMarketSnapshotWorldwideUnitCount,
    ['glamping-market-snapshot-worldwide-unit-count'],
    {
      revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
      tags: [...GLAMPING_MARKET_OVERVIEW_CACHE_TAGS],
    }
  )();
}
