import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import { medianSorted } from '@/lib/fetch-glamping-industry-metrics';
import { normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';

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

function isCanadaRow(country: string | null | undefined): boolean {
  const u = (country ?? '').trim().toUpperCase();
  return u === 'CANADA' || u === 'CA';
}

/** Same row shape as US state metrics (reused by region UIs). */
export type GlampingCaProvinceMetricRow = {
  propertyCount: number;
  siteCount: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
};

export type GlampingCaProvinceMetricsMap = Record<string, GlampingCaProvinceMetricRow>;

type Agg = {
  names: Set<string>;
  sites: number;
  adrValues: number[];
};

/**
 * Per-province/territory aggregates for published commercial glamping in Canada only.
 */
export async function fetchGlampingIndustryCaProvinceMetrics(): Promise<
  { ok: true; data: GlampingCaProvinceMetricsMap } | { ok: false; error: string }
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
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN])
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { ok: false, error: error.message };
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isCanadaRow(row.country)) continue;
      const code = normalizeCaProvinceToCode(row.state);
      if (!code) continue;

      const name = (row.property_name ?? '').trim();
      let agg = aggs.get(code);
      if (!agg) {
        agg = { names: new Set(), sites: 0, adrValues: [] };
        aggs.set(code, agg);
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

  const out: GlampingCaProvinceMetricsMap = {};
  for (const [code, agg] of aggs) {
    const sorted = [...agg.adrValues].sort((a, b) => a - b);
    const mean =
      sorted.length > 0 ? sorted.reduce((s, x) => s + x, 0) / sorted.length : null;
    const median = sorted.length > 0 ? medianSorted(sorted) : null;
    out[code] = {
      propertyCount: agg.names.size,
      siteCount: agg.sites,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
    };
  }

  return { ok: true, data: out };
}
