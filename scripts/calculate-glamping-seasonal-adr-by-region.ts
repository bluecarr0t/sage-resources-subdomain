/**
 * Avg retail daily rate by season × region from `all_glamping_properties`.
 * Cohort: published private commercial Glamping (market overview scope), open rows with rates.
 *
 * Run: npx tsx scripts/calculate-glamping-seasonal-adr-by-region.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';
import { isGlampingMarketSnapshotPropertyType } from '../lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '../lib/glamping-market-snapshot-unit-filter';
import { bucketGlampingIsOpenForMetrics } from '../lib/glamping-is-open';
import { normalizeDbStateToUspsAbbr } from '../lib/normalize-us-state-abbr';
import { normalizeCaProvinceToCode } from '../lib/normalize-ca-province-key';
import {
  getRvIndustryRegionForStateAbbr,
  RV_INDUSTRY_REGION_IDS,
  type RvIndustryRegionId,
} from '../lib/rv-industry-overview/us-rv-regions';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];

type RegionId = RvIndustryRegionId | 'canada';

const REGION_LABEL: Record<RegionId, string> = {
  west: 'West',
  southwest: 'Southwest',
  midwest: 'Midwest',
  southeast: 'Southeast',
  northeast: 'Northeast',
  canada: 'Canada',
};

type Row = {
  state: string | null;
  country: string | null;
  property_type: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  rate_winter_weekday: string | number | null;
  rate_winter_weekend: string | number | null;
  rate_spring_weekday: string | number | null;
  rate_spring_weekend: string | number | null;
  rate_summer_weekday: string | number | null;
  rate_summer_weekend: string | number | null;
  rate_fall_weekday: string | number | null;
  rate_fall_weekend: string | number | null;
};

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function unitsWeight(row: Row): number {
  const u = toNum(row.quantity_of_units);
  return u != null && u > 0 ? Math.round(u) : 1;
}

function isCanada(country: string | null): boolean {
  const c = (country ?? '').trim().toUpperCase();
  return c === 'CANADA' || c === 'CA';
}

function regionForRow(row: Row): RegionId | null {
  if (isCanada(row.country)) {
    const prov = normalizeCaProvinceToCode(row.state);
    return prov ? 'canada' : null;
  }
  const abbr = normalizeDbStateToUspsAbbr(row.state);
  if (!abbr) return null;
  const us = getRvIndustryRegionForStateAbbr(abbr);
  return us;
}

function isSafariTentUnitType(unitType: string | null | undefined): boolean {
  const raw = (unitType ?? '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (lower === 'safari tent' || lower.startsWith('safari tent')) return true;
  return /^safari tent\b/.test(lower);
}

function seasonRateFromRow(row: Row, season: Season): number | null {
  const wd = toNum(row[`rate_${season}_weekday` as keyof Row]);
  const we = toNum(row[`rate_${season}_weekend` as keyof Row]);
  const vals = [wd, we].filter((x): x is number => x != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

type Bucket = { weightedSum: number; weightedN: number; rowCount: number };

function emptySeasonBuckets(): Record<Season, Bucket> {
  return {
    winter: { weightedSum: 0, weightedN: 0, rowCount: 0 },
    spring: { weightedSum: 0, weightedN: 0, rowCount: 0 },
    summer: { weightedSum: 0, weightedN: 0, rowCount: 0 },
    fall: { weightedSum: 0, weightedN: 0, rowCount: 0 },
  };
}

function foldRow(
  byRegion: Map<RegionId, Record<Season, Bucket>>,
  row: Row,
  safariOnly: boolean
) {
  if (safariOnly && !isSafariTentUnitType(row.unit_type)) return;
  const region = regionForRow(row);
  if (!region) return;

  let seasons = byRegion.get(region);
  if (!seasons) {
    seasons = emptySeasonBuckets();
    byRegion.set(region, seasons);
  }

  const w = unitsWeight(row);
  for (const s of SEASONS) {
    const rate = seasonRateFromRow(row, s);
    if (rate == null) continue;
    seasons[s].weightedSum += rate * w;
    seasons[s].weightedN += w;
    seasons[s].rowCount += 1;
  }
}

function avgFromBucket(b: Bucket): number | null {
  if (b.weightedN <= 0) return null;
  return Math.round(b.weightedSum / b.weightedN);
}

async function fetchRows(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        [
          'state',
          'country',
          'property_type',
          'unit_type',
          'is_open',
          'quantity_of_units',
          'rate_winter_weekday',
          'rate_winter_weekend',
          'rate_spring_weekday',
          'rate_spring_weekend',
          'rate_summer_weekday',
          'rate_summer_weekend',
          'rate_fall_weekday',
          'rate_fall_weekend',
        ].join(',')
      )
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_COUNTRY_IN])
      .order('id', { ascending: true })
      .range(offset, offset + batch - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < batch) break;
    offset += batch;
  }
  return all;
}

function buildAggregates(rows: Row[], safariOnly: boolean) {
  const byRegion = new Map<RegionId, Record<Season, Bucket>>();
  let cohortRows = 0;
  let matchedRows = 0;

  for (const row of rows) {
    if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
    if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
    if (bucketGlampingIsOpenForMetrics(row.is_open) !== 'yes') continue;

    cohortRows += 1;
    if (safariOnly && !isSafariTentUnitType(row.unit_type)) continue;
    matchedRows += 1;
    foldRow(byRegion, row, safariOnly);
  }

  return { byRegion, cohortRows, matchedRows };
}

function printTable(title: string, byRegion: Map<RegionId, Record<Season, Bucket>>) {
  console.log(`\n=== ${title} ===`);
  console.log(
    'Region'.padEnd(12) +
      SEASONS.map((s) => s.padStart(10)).join('') +
      '  (unit-weighted avg $/night; seasonal columns only)'
  );
  console.log('-'.repeat(12 + SEASONS.length * 10));

  const order: RegionId[] = [...RV_INDUSTRY_REGION_IDS, 'canada'];
  for (const region of order) {
    const seasons = byRegion.get(region);
    if (!seasons) {
      console.log(REGION_LABEL[region].padEnd(12) + SEASONS.map(() => '—'.padStart(10)).join(''));
      continue;
    }
    const cells = SEASONS.map((s) => {
      const avg = avgFromBucket(seasons[s]);
      const n = seasons[s].weightedN;
      return avg != null ? `$${avg}`.padStart(10) + ` (${n}u)` : '—'.padStart(10);
    });
    console.log(REGION_LABEL[region].padEnd(12) + cells.join(''));
  }
}

async function main() {
  const rows = await fetchRows();
  const allUnits = buildAggregates(rows, false);
  const safari = buildAggregates(rows, true);

  console.log('Source: all_glamping_properties');
  console.log(
    'Cohort: published, open, private commercial, US+Canada, property_type=Glamping, excl. RV/tent inventory'
  );
  console.log(`Open glamping unit rows in cohort: ${allUnits.cohortRows}`);
  console.log(`Safari tent unit rows in cohort: ${safari.matchedRows}`);
  console.log(
    'Season ADR = mean of weekday+weekend when present; regional avg unit-weighted by quantity_of_units'
  );

  printTable('All units', allUnits.byRegion);
  printTable('Safari tents only', safari.byRegion);

  // JSON for downstream use
  const json = {
    allUnits: Object.fromEntries(
      [...allUnits.byRegion.entries()].map(([r, seasons]) => [
        r,
        Object.fromEntries(
          SEASONS.map((s) => [
            s,
            {
              avgUsd: avgFromBucket(seasons[s]),
              weightedUnits: seasons[s].weightedN,
              rowsWithRate: seasons[s].rowCount,
            },
          ])
        ),
      ])
    ),
    safariTents: Object.fromEntries(
      [...safari.byRegion.entries()].map(([r, seasons]) => [
        r,
        Object.fromEntries(
          SEASONS.map((s) => [
            s,
            {
              avgUsd: avgFromBucket(seasons[s]),
              weightedUnits: seasons[s].weightedN,
              rowsWithRate: seasons[s].rowCount,
            },
          ])
        ),
      ])
    ),
  };
  console.log('\n--- JSON ---');
  console.log(JSON.stringify(json, null, 2));
}

main();
