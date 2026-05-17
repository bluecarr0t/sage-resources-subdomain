import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import { medianSorted } from '@/lib/fetch-glamping-industry-metrics';

const PAGE_SIZE = 1000;

type Row = {
  property_name: string | null;
  state: string | null;
  country: string | null;
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

function isUsRow(country: string | null | undefined): boolean {
  const u = (country ?? '').trim().toUpperCase();
  return (
    u === 'UNITED STATES' ||
    u === 'USA' ||
    u === 'US' ||
    u === 'UNITED STATES OF AMERICA'
  );
}

export type GlampingUsStateMetricRow = {
  propertyCount: number;
  siteCount: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
};

export type GlampingUsStateMetricsMap = Record<string, GlampingUsStateMetricRow>;

type Agg = {
  names: Set<string>;
  sites: number;
  adrValues: number[];
};

/**
 * Per-USPS-state aggregates for published commercial glamping in the United States only
 * (Canada is included in national snapshot metrics but has no US-state breakdown here).
 */
export async function fetchGlampingIndustryUsStateMetrics(): Promise<
  { ok: true; data: GlampingUsStateMetricsMap } | { ok: false; error: string }
> {
  const supabase = createServerClient();
  const aggs = new Map<string, Agg>();

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'property_name, state, country, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate'
      )
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN])
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { ok: false, error: error.message };
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isUsRow(row.country)) continue;
      const abbr = normalizeDbStateToUspsAbbr(row.state);
      if (!abbr) continue;

      const name = (row.property_name ?? '').trim();
      let agg = aggs.get(abbr);
      if (!agg) {
        agg = { names: new Set(), sites: 0, adrValues: [] };
        aggs.set(abbr, agg);
      }

      if (name) agg.names.add(name);
      agg.sites += sitesForRow(row);

      if (normalizeIsOpen(row.is_open) === 'yes') {
        const adr = parsePositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null) agg.adrValues.push(adr);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const out: GlampingUsStateMetricsMap = {};
  for (const [abbr, agg] of aggs) {
    const sorted = [...agg.adrValues].sort((a, b) => a - b);
    const mean =
      sorted.length > 0 ? sorted.reduce((s, x) => s + x, 0) / sorted.length : null;
    const median = sorted.length > 0 ? medianSorted(sorted) : null;
    out[abbr] = {
      propertyCount: agg.names.size,
      siteCount: agg.sites,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
    };
  }

  return { ok: true, data: out };
}
