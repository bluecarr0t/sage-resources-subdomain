import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
  type GlampingMarketSnapshotMarket,
} from '@/lib/glamping-market-snapshot-region';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

const PAGE_SIZE = 1000;

export const TOP_UNIT_TYPES_COUNT = 5;

export type GlampingTopUnitTypeRow = {
  label: string;
  /** Integer percent of total sites (primary `unit_type` label per row). */
  pctOfSites: number;
};

export type GlampingIndustryMetrics = {
  totalProperties: number;
  openProperties: number;
  underConstructionProperties: number;
  totalSites: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
  topUnitTypesBySites: GlampingTopUnitTypeRow[];
  asOf: string;
};

type Row = {
  property_name: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
};

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeIsOpen(raw: string | null | undefined): 'yes' | 'under_construction' | 'closed' | 'other' {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'yes') return 'yes';
  if (v === 'under construction') return 'under_construction';
  if (v === 'closed' || v === 'no') return 'closed';
  return 'other';
}

function sitesForRow(row: Row): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  const n = fromUnits ?? fromTotal ?? 0;
  return Math.round(n);
}

/** Median of a non-empty sorted array (ascending). */
export function medianSorted(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid];
  return (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

/**
 * Published commercial-glamping universe (same land-tenure scope as the public map),
 * filtered to {@link GlampingMarketSnapshotMarket}: United States or Canada.
 */
export async function fetchGlampingIndustryMetrics(
  market: GlampingMarketSnapshotMarket = 'us'
): Promise<{ ok: true; data: GlampingIndustryMetrics } | { ok: false; error: string }> {
  const supabase = createServerClient();

  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const distinctNames = new Set<string>();
  const openNames = new Set<string>();
  const underConstructionNames = new Set<string>();

  let totalSites = 0;
  const adrValues: number[] = [];
  const sitesByPrimaryUnitLabel = new Map<string, number>();

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'property_name, unit_type, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate'
      )
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', countryIn)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { ok: false, error: error.message };
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      const name = (row.property_name ?? '').trim();
      if (name) {
        distinctNames.add(name);
        const openState = normalizeIsOpen(row.is_open);
        if (openState === 'yes') openNames.add(name);
        if (openState === 'under_construction') underConstructionNames.add(name);
      }

      const rowSites = sitesForRow(row);
      totalSites += rowSites;

      const primaryLabel = normalizeGlampingUnitTypeForStorage(row.unit_type);
      if (primaryLabel) {
        sitesByPrimaryUnitLabel.set(
          primaryLabel,
          (sitesByPrimaryUnitLabel.get(primaryLabel) ?? 0) + rowSites
        );
      }

      if (normalizeIsOpen(row.is_open) === 'yes') {
        const adr = parsePositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null) adrValues.push(adr);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  adrValues.sort((a, b) => a - b);
  const mean =
    adrValues.length > 0 ? adrValues.reduce((s, x) => s + x, 0) / adrValues.length : null;
  const median = adrValues.length > 0 ? medianSorted(adrValues) : null;

  const rankedUnitTypes = [...sitesByPrimaryUnitLabel.entries()].sort((a, b) => b[1] - a[1]);
  const topUnitTypesBySites: GlampingTopUnitTypeRow[] =
    totalSites > 0
      ? rankedUnitTypes.slice(0, TOP_UNIT_TYPES_COUNT).map(([label, n]) => ({
          label,
          pctOfSites: Math.round((100 * n) / totalSites),
        }))
      : [];

  return {
    ok: true,
    data: {
      totalProperties: distinctNames.size,
      openProperties: openNames.size,
      underConstructionProperties: underConstructionNames.size,
      totalSites,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
      topUnitTypesBySites,
      asOf: new Date().toISOString(),
    },
  };
}
