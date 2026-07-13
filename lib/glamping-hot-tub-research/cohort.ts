import type { SupabaseClient } from '@supabase/supabase-js';
import type { HotTubCohortRow } from '@/lib/glamping-hot-tub-research/types';

export const HOT_TUB_TABLE = 'all_sage_data';

const SELECT_COLS =
  'id, property_id, property_name, site_name, unit_type, url, ota_url_hipcamp, ota_url_airbnb, description, amenities_raw, unit_hot_tub, property_hot_tub, unit_hot_tub_or_sauna, unit_sauna, discovery_source, notes, quantity_of_units, rate_avg_retail_daily_rate, state';

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

/**
 * Legacy both-null gate (`--only-null`): skip when either tub field is already set.
 * Prefer {@link rowNeedsUnitHotTubResearch} for Amenity Impact P0 backfill.
 */
export function rowNeedsHotTubResearch(row: HotTubCohortRow): boolean {
  return (
    isHotTubFieldEmpty(row.unit_hot_tub) &&
    isHotTubFieldEmpty(row.property_hot_tub)
  );
}

/** P0 Amenity Impact: research whenever unit_hot_tub is blank (property may already be tagged). */
export function rowNeedsUnitHotTubResearch(row: HotTubCohortRow): boolean {
  return isHotTubFieldEmpty(row.unit_hot_tub);
}

export function parseUnitTypesArg(
  raw: string | undefined
): string[] | undefined {
  if (raw == null || !raw.trim()) return undefined;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

export function matchesUnitTypes(
  row: HotTubCohortRow,
  unitTypes: string[] | undefined
): boolean {
  if (unitTypes == null || unitTypes.length === 0) return true;
  const t = String(row.unit_type ?? '')
    .trim()
    .toLowerCase();
  return unitTypes.some((u) => u.trim().toLowerCase() === t);
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
  /** Legacy: both unit_hot_tub and property_hot_tub empty. */
  onlyNull?: boolean;
  /** P0: unit_hot_tub empty (property_hot_tub may be set). */
  onlyUnitHotTubNull?: boolean;
  /** Restrict qualifying properties to these unit types (case-insensitive). */
  unitTypes?: string[];
  propertyId?: string;
  limitProperties?: number;
  skipAlreadyResearched?: boolean;
};

function rowQualifiesForResearch(
  row: HotTubCohortRow,
  options: FetchCohortOptions
): boolean {
  if (!matchesUnitTypes(row, options.unitTypes)) return false;
  if (options.onlyUnitHotTubNull) return rowNeedsUnitHotTubResearch(row);
  if (options.onlyNull) return rowNeedsHotTubResearch(row);
  return true;
}

/**
 * Fetch cohort rows and group by property_id for one-scrape-per-property processing.
 *
 * When unit-type / null filters are set, a property qualifies if it has at least
 * one matching row that needs research; all of that property’s cohort rows are
 * returned (for better LLM site matching). Apply still only fills empty fields.
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
      // P0 unit blanks: do not skip prior web_research_* tags when unit_hot_tub is still empty.
      if (
        options.skipAlreadyResearched &&
        alreadyResearchedHotTub(row.discovery_source) &&
        !(options.onlyUnitHotTubNull && rowNeedsUnitHotTubResearch(row))
      ) {
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

  const filtered = new Map<string, HotTubCohortRow[]>();
  for (const [pid, rows] of byProperty) {
    const needsResearch = rows.some((r) => rowQualifiesForResearch(r, options));
    if (!needsResearch) continue;
    filtered.set(pid, rows);
  }

  if (options.limitProperties != null && options.limitProperties > 0) {
    const sorted = [...filtered.entries()].sort((a, b) => {
      // Prefer properties with more qualifying blank unit weight first.
      const unitsA = a[1]
        .filter((r) => rowQualifiesForResearch(r, options))
        .reduce((s, r) => s + Math.max(r.quantity_of_units ?? 1, 1), 0);
      const unitsB = b[1]
        .filter((r) => rowQualifiesForResearch(r, options))
        .reduce((s, r) => s + Math.max(r.quantity_of_units ?? 1, 1), 0);
      if (unitsB !== unitsA) return unitsB - unitsA;
      return b[1].length - a[1].length;
    });
    return new Map(sorted.slice(0, options.limitProperties));
  }

  return filtered;
}

export type HotTubQueueRow = {
  priority_stratum: string;
  id: number;
  property_id: string;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  state: string | null;
  unit_weight: number;
  rate_avg_retail_daily_rate: number | null;
  unit_hot_tub_current: string;
  property_hot_tub_current: string;
  unit_hot_tub_or_sauna_current: string;
  url: string | null;
  ota_url_hipcamp: string | null;
  ota_url_airbnb: string | null;
  discovery_source: string | null;
};

function displayField(value: string | null | undefined): string {
  if (isHotTubFieldEmpty(value)) return '';
  return String(value).trim();
}

function priorityStratum(row: HotTubCohortRow): string {
  const t = String(row.unit_type ?? '')
    .trim()
    .toLowerCase();
  if (t === 'safari tent' || t === 'cabin') return 'P0-Safari/Cabin-blank';
  const combo = displayField(row.unit_hot_tub_or_sauna).toLowerCase();
  const unit = displayField(row.unit_hot_tub).toLowerCase();
  if (
    (unit === 'yes' && combo === 'no') ||
    (unit === 'no' && combo === 'yes')
  ) {
    return 'P2-conflict';
  }
  return 'P0-other-blank';
}

/**
 * Flat prioritized queue of blank unit_hot_tub rows (Amenity Impact P0).
 * Safari Tent / Cabin first, then unit weight descending.
 */
export function buildPrioritizedUnitHotTubQueue(
  byProperty: Map<string, HotTubCohortRow[]>
): HotTubQueueRow[] {
  const out: HotTubQueueRow[] = [];
  for (const rows of byProperty.values()) {
    for (const row of rows) {
      if (!rowNeedsUnitHotTubResearch(row)) continue;
      if (isExcludedUnitType(row.unit_type)) continue;
      const rate =
        row.rate_avg_retail_daily_rate != null
          ? Number(row.rate_avg_retail_daily_rate)
          : null;
      out.push({
        priority_stratum: priorityStratum(row),
        id: row.id,
        property_id: row.property_id,
        property_name: row.property_name,
        site_name: row.site_name,
        unit_type: row.unit_type,
        state: row.state ?? null,
        unit_weight: Math.max(row.quantity_of_units ?? 1, 1),
        rate_avg_retail_daily_rate:
          rate != null && Number.isFinite(rate) && rate > 0 ? rate : null,
        unit_hot_tub_current: displayField(row.unit_hot_tub),
        property_hot_tub_current: displayField(row.property_hot_tub),
        unit_hot_tub_or_sauna_current: displayField(row.unit_hot_tub_or_sauna),
        url: row.url,
        ota_url_hipcamp: row.ota_url_hipcamp,
        ota_url_airbnb: row.ota_url_airbnb,
        discovery_source: row.discovery_source,
      });
    }
  }

  const stratumRank = (s: string) => {
    if (s === 'P0-Safari/Cabin-blank') return 0;
    if (s === 'P0-other-blank') return 1;
    return 2;
  };

  out.sort((a, b) => {
    const sr = stratumRank(a.priority_stratum) - stratumRank(b.priority_stratum);
    if (sr !== 0) return sr;
    if (b.unit_weight !== a.unit_weight) return b.unit_weight - a.unit_weight;
    return a.id - b.id;
  });

  return out;
}
