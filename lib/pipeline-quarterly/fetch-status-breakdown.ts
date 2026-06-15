import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
  type GlampingMarketSnapshotMarket,
} from '@/lib/glamping-market-snapshot-region';
import {
  bucketGlampingIsOpenForMetrics,
  formatGlampingIsOpenPublicLabel,
  type GlampingIsOpenMetricsBucket,
} from '@/lib/glamping-is-open';
import {
  applyGlampingMarketSnapshotTierToQuery,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';
import {
  glampingMarketSnapshotUnitsForRow,
  parseGlampingMarketSnapshotPositiveNumber,
} from '@/lib/glamping-market-snapshot/site-units-for-row';
import { PIPELINE_STATUS_HISTORY_TABLE } from '@/lib/glamping-pipeline/constants';
import {
  parsePipelineQuarterlyStatusSlug,
  type PipelineQuarterlyStatusSlug,
} from './status-slugs';
import { parsePlannedOpenDateField } from '@/lib/glamping-planned-open';
import { propertyAcresFromSageFields } from './property-acres';
import {
  fetchGlampingBrandDisplayNamesByIds,
  resolveBrandDisplayName,
} from './resolve-brand-names';
import {
  accumulatePipelineUnitMixLine,
  createPipelineUnitMixMap,
  finalizePipelineUnitMix,
  primaryPipelineUnitMixLine,
  type PipelineQuarterlyUnitMixLine,
} from './unit-mix';

const PAGE_SIZE = 1000;
const NEWLY_OPENED_LOOKBACK_DAYS = 90;

const SAGE_ROW_SELECT =
  'id, property_name, property_type, unit_type, state, country, city, address, zip_code, brand_id, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, glamping_service_tier, planned_open_date, url, description, notes, phone_number, discovery_source';

type SageRow = {
  id: number;
  property_name: string | null;
  property_type: string | null;
  unit_type: string | null;
  state: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  zip_code: string | null;
  brand_id: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
  glamping_service_tier: string | null;
  planned_open_date: string | null;
  url: string | null;
  description: string | null;
  notes: string | null;
  phone_number: string | null;
  discovery_source: string | null;
};

export type PipelineQuarterlyPropertyRow = {
  id: number;
  propertyName: string;
  state: string | null;
  stateAbbr: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  zipCode: string | null;
  brandId: string | null;
  brandName: string | null;
  isOpenLabel: string;
  propertyType: string | null;
  unitType: string | null;
  units: number;
  acres: number | null;
  serviceTier: string | null;
  plannedOpenDate: string | null;
  avgRetailDailyRate: number | null;
  websiteUrl: string | null;
  description: string | null;
  phoneNumber: string | null;
  discoverySource: string | null;
  newsArticleUrl: string | null;
  unitMix: readonly PipelineQuarterlyUnitMixLine[];
};

export type { PipelineQuarterlyUnitMixLine } from './unit-mix';

export type PipelineQuarterlyStateBreakdownRow = {
  stateAbbr: string;
  stateLabel: string;
  propertyCount: number;
  unitCount: number;
};

export type PipelineQuarterlyUnitTypeBreakdownRow = {
  unitType: string;
  propertyCount: number;
  unitCount: number;
  pctOfUnits: number;
};

export type PipelineQuarterlyStatusBreakdown = {
  properties: PipelineQuarterlyPropertyRow[];
  byState: PipelineQuarterlyStateBreakdownRow[];
  byUnitType: PipelineQuarterlyUnitTypeBreakdownRow[];
  totalProperties: number;
  totalUnits: number;
  asOf: string;
};

function newlyOpenedCutoffDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - NEWLY_OPENED_LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

function preferNonEmptyString(
  current: string | null,
  next: string | null | undefined
): string | null {
  if (current?.trim()) return current;
  const n = next?.trim();
  return n ? n : current;
}

function mergePropertyDetails(
  target: PipelineQuarterlyPropertyRow,
  row: SageRow
): void {
  target.state = preferNonEmptyString(target.state, row.state);
  target.stateAbbr =
    target.stateAbbr ?? normalizeDbStateToUspsAbbr(row.state);
  target.country = preferNonEmptyString(target.country, row.country);
  target.city = preferNonEmptyString(target.city, row.city);
  target.address = preferNonEmptyString(target.address, row.address);
  target.zipCode = preferNonEmptyString(target.zipCode, row.zip_code);
  target.brandId = target.brandId ?? row.brand_id;
  target.propertyType = preferNonEmptyString(target.propertyType, row.property_type);
  target.serviceTier = preferNonEmptyString(target.serviceTier, row.glamping_service_tier);
  target.plannedOpenDate = preferNonEmptyString(
    target.plannedOpenDate,
    parsePlannedOpenDateField(row.planned_open_date)
  );
  target.websiteUrl = preferNonEmptyString(target.websiteUrl, row.url);
  target.description = preferNonEmptyString(target.description, row.description);
  target.phoneNumber = preferNonEmptyString(target.phoneNumber, row.phone_number);
  target.discoverySource = preferNonEmptyString(
    target.discoverySource,
    row.discovery_source
  );
  target.acres =
    target.acres ??
    propertyAcresFromSageFields({
      description: row.description,
      address: row.address,
      notes: row.notes,
    });
}

async function fetchLatestEvidenceUrlsByPropertyIds(
  propertyIds: number[]
): Promise<Map<number, string>> {
  if (propertyIds.length === 0) return new Map();

  const supabase = createServerClient();
  const byId = new Map<number, string>();

  for (let i = 0; i < propertyIds.length; i += PAGE_SIZE) {
    const chunk = propertyIds.slice(i, i + PAGE_SIZE);
    const { data, error } = await supabase
      .from(PIPELINE_STATUS_HISTORY_TABLE)
      .select('property_id, evidence_url, started_on')
      .in('property_id', chunk)
      .not('evidence_url', 'is', null)
      .order('started_on', { ascending: false });

    if (error) continue;

    for (const row of data ?? []) {
      if (row.property_id == null) continue;
      const id = row.property_id;
      if (byId.has(id)) continue;
      const url = row.evidence_url?.trim();
      if (url) byId.set(id, url);
    }
  }

  return byId;
}

function collapsePropertyRows(
  rows: SageRow[],
  evidenceByPropertyId: Map<number, string>
): PipelineQuarterlyPropertyRow[] {
  const byName = new Map<
    string,
    {
      row: PipelineQuarterlyPropertyRow;
      sageIds: number[];
      unitMixByType: Map<string, { units: number; avgRetailDailyRate: number | null }>;
    }
  >();

  for (const row of rows) {
    const name = (row.property_name ?? '').trim();
    if (!name) continue;

    const units = glampingMarketSnapshotUnitsForRow(row);
    const adr = parseGlampingMarketSnapshotPositiveNumber(row.rate_avg_retail_daily_rate);
    const stateAbbr = normalizeDbStateToUspsAbbr(row.state);
    const unitType = normalizeGlampingUnitTypeForStorage(row.unit_type);

    const existing = byName.get(name);
    if (!existing) {
      const unitMixByType = createPipelineUnitMixMap();
      accumulatePipelineUnitMixLine(unitMixByType, unitType, units, adr);
      const unitMix = finalizePipelineUnitMix(unitMixByType);
      const primaryLine = primaryPipelineUnitMixLine(unitMix);

      byName.set(name, {
        sageIds: [row.id],
        unitMixByType,
        row: {
          id: row.id,
          propertyName: name,
          state: row.state,
          stateAbbr,
          country: row.country,
          city: row.city,
          address: row.address?.trim() || null,
          zipCode: row.zip_code?.trim() || null,
          brandId: row.brand_id,
          brandName: null,
          isOpenLabel:
            formatGlampingIsOpenPublicLabel(row.is_open) || (row.is_open ?? ''),
          propertyType: row.property_type?.trim() || null,
          unitType: primaryLine?.unitType ?? unitType,
          units,
          acres: propertyAcresFromSageFields({
            description: row.description,
            address: row.address,
            notes: row.notes,
          }),
          serviceTier: row.glamping_service_tier,
          plannedOpenDate: parsePlannedOpenDateField(row.planned_open_date),
          avgRetailDailyRate: adr,
          websiteUrl: row.url?.trim() || null,
          description: row.description?.trim() || null,
          phoneNumber: row.phone_number?.trim() || null,
          discoverySource: row.discovery_source?.trim() || null,
          newsArticleUrl: null,
          unitMix,
        },
      });
      continue;
    }

    existing.sageIds.push(row.id);
    existing.row.units += units;
    accumulatePipelineUnitMixLine(existing.unitMixByType, unitType, units, adr);
    existing.row.unitMix = finalizePipelineUnitMix(existing.unitMixByType);
    const primaryLine = primaryPipelineUnitMixLine(existing.row.unitMix);
    if (primaryLine) existing.row.unitType = primaryLine.unitType;
    if (existing.row.avgRetailDailyRate == null && adr != null) {
      existing.row.avgRetailDailyRate = adr;
    }
    mergePropertyDetails(existing.row, row);
  }

  return [...byName.values()]
    .map(({ row, sageIds }) => {
      for (const id of sageIds) {
        const articleUrl = evidenceByPropertyId.get(id);
        if (articleUrl) {
          row.newsArticleUrl = articleUrl;
          break;
        }
      }
      return row;
    })
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));
}

function applyBrandNamesToProperties(
  properties: PipelineQuarterlyPropertyRow[],
  namesById: ReadonlyMap<string, string>
): void {
  for (const property of properties) {
    const name = resolveBrandDisplayName(property.brandId, namesById);
    property.brandName = name || null;
  }
}

function buildStateBreakdown(
  properties: PipelineQuarterlyPropertyRow[]
): PipelineQuarterlyStateBreakdownRow[] {
  const byState = new Map<string, { names: Set<string>; units: number }>();

  for (const p of properties) {
    const abbr = p.stateAbbr ?? '—';
    const label = p.state ?? abbr;
    const agg = byState.get(abbr) ?? { names: new Set<string>(), units: 0 };
    agg.names.add(p.propertyName);
    agg.units += p.units;
    byState.set(abbr, agg);
  }

  return [...byState.entries()]
    .map(([stateAbbr, agg]) => ({
      stateAbbr,
      stateLabel: properties.find((p) => (p.stateAbbr ?? '—') === stateAbbr)?.state ?? stateAbbr,
      propertyCount: agg.names.size,
      unitCount: agg.units,
    }))
    .sort((a, b) => b.propertyCount - a.propertyCount);
}

function buildUnitTypeBreakdown(
  properties: PipelineQuarterlyPropertyRow[]
): PipelineQuarterlyUnitTypeBreakdownRow[] {
  const totalUnits = properties.reduce((s, p) => s + p.units, 0);
  const byType = new Map<string, { names: Set<string>; units: number }>();

  for (const p of properties) {
    const lines =
      p.unitMix.length > 0
        ? p.unitMix
        : [
            {
              unitType: p.unitType?.trim() || 'Unspecified',
              units: p.units,
              avgRetailDailyRate: p.avgRetailDailyRate,
            },
          ];

    for (const line of lines) {
      const type = line.unitType.trim() || 'Unspecified';
      const agg = byType.get(type) ?? { names: new Set<string>(), units: 0 };
      agg.names.add(p.propertyName);
      agg.units += line.units;
      byType.set(type, agg);
    }
  }

  return [...byType.entries()]
    .map(([unitType, agg]) => ({
      unitType,
      propertyCount: agg.names.size,
      unitCount: agg.units,
      pctOfUnits: totalUnits > 0 ? Math.round((100 * agg.units) / totalUnits) : 0,
    }))
    .sort((a, b) => b.unitCount - a.unitCount);
}

async function fetchNewlyOpenedRows(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter
): Promise<SageRow[]> {
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
      .select('property_id')
      .eq('is_open', 'Yes')
      .gte('started_on', cutoff)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) break;
    const batch = data ?? [];
    if (batch.length === 0) break;
    for (const row of batch) {
      if (row.property_id != null) propertyIds.add(row.property_id);
    }
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (propertyIds.size === 0) return [];

  const ids = [...propertyIds];
  const allRows: SageRow[] = [];

  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(SAGE_ROW_SELECT)
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('country', countryIn)
        .in('id', chunk)
    );
    query = applyGlampingMarketSnapshotTierToQuery(query, tier);
    const { data, error } = await query;
    if (error) continue;
    allRows.push(...((data ?? []) as SageRow[]));
  }

  return allRows.filter(
    (row) =>
      isGlampingMarketSnapshotPropertyType(row.property_type) &&
      !isExcludedGlampingMarketSnapshotUnitType(row.unit_type)
  );
}

async function fetchStatusRows(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  metricsBucket: GlampingIsOpenMetricsBucket
): Promise<SageRow[]> {
  const supabase = createServerClient();
  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const allRows: SageRow[] = [];
  let offset = 0;

  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(SAGE_ROW_SELECT)
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('country', countryIn)
    );
    query = applyGlampingMarketSnapshotTierToQuery(query, tier);
    const { data, error } = await query
      .order('state', { ascending: true })
      .order('property_name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as SageRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
      if (bucketGlampingIsOpenForMetrics(row.is_open) !== metricsBucket) continue;
      allRows.push(row);
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}

export async function fetchPipelineQuarterlyStatusBreakdown(
  statusSlug: PipelineQuarterlyStatusSlug,
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<
  { ok: true; data: PipelineQuarterlyStatusBreakdown } | { ok: false; error: string }
> {
  const config = parsePipelineQuarterlyStatusSlug(statusSlug);
  if (!config) {
    return { ok: false, error: 'Unknown pipeline status.' };
  }

  try {
    const rawRows = config.isQuarterlyTransition
      ? await fetchNewlyOpenedRows(market, tier)
      : config.metricsBucket
        ? await fetchStatusRows(market, tier, config.metricsBucket)
        : [];

    const evidenceByPropertyId = await fetchLatestEvidenceUrlsByPropertyIds(
      rawRows.map((row) => row.id)
    );
    const properties = collapsePropertyRows(rawRows, evidenceByPropertyId);
    const brandNamesById = await fetchGlampingBrandDisplayNamesByIds(
      properties.map((property) => property.brandId).filter(Boolean) as string[]
    );
    applyBrandNamesToProperties(properties, brandNamesById);
    const totalUnits = properties.reduce((s, p) => s + p.units, 0);

    return {
      ok: true,
      data: {
        properties,
        byState: buildStateBreakdown(properties),
        byUnitType: buildUnitTypeBreakdown(properties),
        totalProperties: properties.length,
        totalUnits,
        asOf: new Date().toISOString(),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load pipeline data.';
    return { ok: false, error: message };
  }
}
