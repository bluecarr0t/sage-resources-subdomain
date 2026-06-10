import type { SupabaseClient } from '@supabase/supabase-js';
import type { HotTubCohortRow } from '@/lib/glamping-hot-tub-research/types';

export const HOT_TUB_TABLE = 'all_sage_data';

const SELECT_COLS =
  'id, property_id, property_name, site_name, unit_type, url, ota_url_hipcamp, ota_url_airbnb, description, amenities_raw, unit_hot_tub, property_hot_tub, unit_hot_tub_or_sauna, unit_sauna, discovery_source, notes, quantity_of_units';

/** Same filters as queries/ardr_drivers_post.sql cohort. */
export function isExcludedUnitType(unitType: string | null | undefined): boolean {
  if (unitType != null && /\btent\s*site/i.test(String(unitType))) return true;
  const normalized = String(unitType ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return ['vehicles', 'vehicle', 'rv site', 'rv sites'].includes(normalized);
}

export function isHotTubFieldEmpty(value: string | null | undefined): boolean {
  const s = String(value ?? '').trim().toLowerCase();
  return s === '' || s === 'null';
}

export function rowNeedsHotTubResearch(row: HotTubCohortRow): boolean {
  return (
    isHotTubFieldEmpty(row.unit_hot_tub) &&
    isHotTubFieldEmpty(row.property_hot_tub)
  );
}

export function pickScrapeUrl(row: HotTubCohortRow): string | null {
  for (const u of [row.url, row.ota_url_hipcamp, row.ota_url_airbnb]) {
    const t = String(u ?? '').trim();
    if (t) return t;
  }
  return null;
}

export function alreadyResearchedHotTub(discoverySource: string | null): boolean {
  return /web_research_hot_tub/i.test(String(discoverySource ?? ''));
}

export type FetchCohortOptions = {
  onlyNull?: boolean;
  propertyId?: string;
  limitProperties?: number;
  skipAlreadyResearched?: boolean;
};

/**
 * Fetch cohort rows and group by property_id for one-scrape-per-property processing.
 */
export async function fetchCohortByProperty(
  supabase: SupabaseClient,
  options: FetchCohortOptions = {}
): Promise<Map<string, HotTubCohortRow[]>> {
  const byProperty = new Map<string, HotTubCohortRow[]>();

  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    let q = supabase
      .from(HOT_TUB_TABLE)
      .select(SELECT_COLS)
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or('land_operator_category.is.null,land_operator_category.eq.private_commercial')
      .in('country', ['United States', 'US', 'USA', 'United States of America'])
      .eq('property_type', 'Glamping')
      .eq('is_open', 'Yes')
      .order('property_id', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (options.propertyId) {
      q = q.eq('property_id', options.propertyId);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as HotTubCohortRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (isExcludedUnitType(row.unit_type)) continue;
      if (options.onlyNull && !rowNeedsHotTubResearch(row)) continue;
      if (options.skipAlreadyResearched && alreadyResearchedHotTub(row.discovery_source)) {
        continue;
      }

      const pid = String(row.property_id);
      const list = byProperty.get(pid) ?? [];
      list.push(row);
      byProperty.set(pid, list);
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  if (options.limitProperties != null && options.limitProperties > 0) {
    const sorted = [...byProperty.entries()].sort((a, b) => {
      const unitsA = a[1].reduce((s, r) => s + Math.max(r.quantity_of_units ?? 1, 1), 0);
      const unitsB = b[1].reduce((s, r) => s + Math.max(r.quantity_of_units ?? 1, 1), 0);
      if (unitsB !== unitsA) return unitsB - unitsA;
      return b[1].length - a[1].length;
    });
    return new Map(sorted.slice(0, options.limitProperties));
  }

  return byProperty;
}
