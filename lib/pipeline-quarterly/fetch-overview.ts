import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
  type GlampingMarketSnapshotMarket,
} from '@/lib/glamping-market-snapshot-region';
import { bucketGlampingIsOpenForMetrics } from '@/lib/glamping-is-open';
import {
  applyGlampingMarketSnapshotTierToQuery,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import {
  glampingMarketSnapshotUnitsForRow,
  parseGlampingMarketSnapshotPositiveNumber,
} from '@/lib/glamping-market-snapshot/site-units-for-row';
import { PIPELINE_STATUS_HISTORY_TABLE } from '@/lib/glamping-pipeline/constants';
import { PIPELINE_QUARTERLY_STATUSES } from './status-slugs';

const PAGE_SIZE = 1000;
const NEWLY_OPENED_LOOKBACK_DAYS = 90;

type Row = {
  property_name: string | null;
  property_type: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  updated_at: string | null;
  created_at: string | null;
};

export type PipelineQuarterlyStatusCount = {
  slug: (typeof PIPELINE_QUARTERLY_STATUSES)[number]['slug'];
  label: string;
  propertyCount: number;
  unitCount: number;
};

export type PipelineQuarterlyOverview = {
  totalProperties: number;
  totalUnits: number;
  statusCounts: PipelineQuarterlyStatusCount[];
  asOf: string;
  quarterLabel: string;
};

function parseTimestampMs(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

function currentQuarterLabel(asOf: Date): string {
  const q = Math.floor(asOf.getUTCMonth() / 3) + 1;
  return `Q${q} ${asOf.getUTCFullYear()}`;
}

function newlyOpenedCutoffDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - NEWLY_OPENED_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

async function countNewlyOpenedProperties(
  market: GlampingMarketSnapshotMarket
): Promise<number> {
  const supabase = createServerClient();
  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const cutoff = newlyOpenedCutoffDate();
  const propertyIds = new Set<number>();

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(PIPELINE_STATUS_HISTORY_TABLE)
      .select('property_id, started_on, is_open')
      .eq('is_open', 'Yes')
      .gte('started_on', cutoff)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) return 0;
    const batch = data ?? [];
    if (batch.length === 0) break;
    for (const row of batch) {
      if (row.property_id != null) propertyIds.add(row.property_id);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (propertyIds.size === 0) return 0;

  const ids = [...propertyIds];
  let publishedCount = 0;
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    const { data, error } = await applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select('id, country')
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('id', chunk)
    );
    if (error) continue;
    for (const row of data ?? []) {
      const country = (row.country ?? '').trim().toUpperCase();
      const inMarket = countryIn.some((c) => c.toUpperCase() === country);
      if (inMarket) publishedCount += 1;
    }
  }

  return publishedCount;
}

/**
 * Headline pipeline counts for the quarterly product overview.
 */
export async function fetchPipelineQuarterlyOverview(
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<{ ok: true; data: PipelineQuarterlyOverview } | { ok: false; error: string }> {
  const supabase = createServerClient();

  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const distinctNames = new Set<string>();
  const unitsByBucket = new Map<string, number>();
  const namesByBucket = new Map<string, Set<string>>();

  for (const status of PIPELINE_QUARTERLY_STATUSES) {
    if (!status.isQuarterlyTransition) {
      namesByBucket.set(status.slug, new Set());
      unitsByBucket.set(status.slug, 0);
    }
  }

  let totalUnits = 0;
  let dataFreshnessMs = 0;

  let offset = 0;
  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(
          'property_name, property_type, unit_type, is_open, quantity_of_units, property_total_sites, updated_at, created_at'
        )
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('country', countryIn)
    );
    query = applyGlampingMarketSnapshotTierToQuery(query, tier);
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { ok: false, error: error.message };
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;

      const u = parseTimestampMs(row.updated_at);
      const c = parseTimestampMs(row.created_at);
      const rowFresh = Math.max(u ?? 0, c ?? 0);
      if (rowFresh > 0) dataFreshnessMs = Math.max(dataFreshnessMs, rowFresh);

      const name = (row.property_name ?? '').trim();
      if (name) distinctNames.add(name);

      const rowUnits = glampingMarketSnapshotUnitsForRow(row);
      totalUnits += rowUnits;

      const bucket = bucketGlampingIsOpenForMetrics(row.is_open);
      for (const status of PIPELINE_QUARTERLY_STATUSES) {
        if (status.isQuarterlyTransition || !status.metricsBucket) continue;
        if (status.metricsBucket === bucket) {
          unitsByBucket.set(status.slug, (unitsByBucket.get(status.slug) ?? 0) + rowUnits);
          if (name) namesByBucket.get(status.slug)?.add(name);
        }
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const newlyOpenedCount = await countNewlyOpenedProperties(market);
  const asOfDate =
    dataFreshnessMs > 0 ? new Date(dataFreshnessMs) : new Date();

  const statusCounts: PipelineQuarterlyStatusCount[] = PIPELINE_QUARTERLY_STATUSES.map(
    (status) => {
      if (status.isQuarterlyTransition) {
        return {
          slug: status.slug,
          label: status.label,
          propertyCount: newlyOpenedCount,
          unitCount: 0,
        };
      }
      const names = namesByBucket.get(status.slug);
      return {
        slug: status.slug,
        label: status.label,
        propertyCount: names?.size ?? 0,
        unitCount: unitsByBucket.get(status.slug) ?? 0,
      };
    }
  );

  return {
    ok: true,
    data: {
      totalProperties: distinctNames.size,
      totalUnits,
      statusCounts,
      asOf: asOfDate.toISOString(),
      quarterLabel: currentQuarterLabel(asOfDate),
    },
  };
}
