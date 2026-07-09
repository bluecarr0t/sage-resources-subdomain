#!/usr/bin/env npx tsx
/**
 * Phase 0: export Sage Glamping rows missing winter rates in the Proximity Insights
 * aggregation cohort (matches admin data quality badge for ski + glamping).
 *
 * Usage:
 *   npx tsx scripts/export-proximity-insights-missing-winter-rates.ts
 *   npx tsx scripts/export-proximity-insights-missing-winter-rates.ts --output docs/data/exports/my-cohort.csv
 *   npx tsx scripts/export-proximity-insights-missing-winter-rates.ts --anchor-type national-parks
 *   npx tsx scripts/export-proximity-insights-missing-winter-rates.ts --all-sage-in-cohort
 *
 * Writes:
 *   - CSV with one row per missing-winter Sage property (default)
 *   - Sidecar .manifest.json with cohort params, counts, and frozen id list
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { buildAggregationCohort } from '@/lib/anchor-point-insights/build-aggregation-cohort';
import {
  getPropertyRateForState,
  isPropertyRateMissingForQuality,
} from '@/lib/anchor-point-insights/aggregate';
import {
  anchorUsesYearAvgStateRate,
  parseAnchorPointAnchorType,
  type AnchorPointAnchorType,
} from '@/lib/anchor-point-insights/anchor-type';
import type { PropertyTypeFilter } from '@/lib/anchor-point-insights/property-type-filter';
import type { PropertyWithProximity } from '@/lib/anchor-point-insights/types';
import { classifyWinterMissingSegment } from '@/lib/anchor-point-insights/winter-rate-research-segment';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const GLAMPING_DETAIL_COLUMNS = [
  'id',
  'property_name',
  'site_name',
  'city',
  'state',
  'zip_code',
  'country',
  'url',
  'unit_type',
  'property_type',
  'quantity_of_units',
  'property_total_sites',
  'brand_id',
  'is_open',
  'research_status',
  'discovery_source',
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
  'rate_unit_rates_by_year',
] as const;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv: string[]) {
  const outputIdx = argv.indexOf('--output');
  const anchorIdx = argv.indexOf('--anchor-type');
  const stateIdx = argv.indexOf('--state');
  const typeIdx = argv.indexOf('--property-type');

  return {
    outputPath:
      outputIdx >= 0
        ? argv[outputIdx + 1]
        : resolve(
            process.cwd(),
            `docs/data/exports/proximity-insights-ski-glamping-missing-winter-rates-${todayStamp()}.csv`
          ),
    anchorType: parseAnchorPointAnchorType(
      anchorIdx >= 0 ? argv[anchorIdx + 1] : 'ski'
    ),
    stateFilter: stateIdx >= 0 ? argv[stateIdx + 1] : null,
    propertyTypeFilter: (typeIdx >= 0 ? argv[typeIdx + 1] : 'glamping') as PropertyTypeFilter,
    allSageInCohort: argv.includes('--all-sage-in-cohort'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function fetchGlampingDetails(ids: number[]) {
  const byId = new Map<number, Record<string, unknown>>();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(GLAMPING_DETAIL_COLUMNS.join(','))
      .in('id', chunk);
    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    for (const row of data ?? []) {
      byId.set(Number((row as { id: number }).id), row as Record<string, unknown>);
    }
  }
  return byId;
}

function buildExportRow(
  p: PropertyWithProximity,
  details: Record<string, unknown> | undefined,
  useYearAvgRate: boolean
): Record<string, unknown> {
  const avg = details?.rate_avg_retail_daily_rate;
  const avgNum =
    avg === null || avg === undefined
      ? null
      : typeof avg === 'number'
        ? avg
        : parseFloat(String(avg));

  const segment = classifyWinterMissingSegment({
    ...p,
    rate_avg_retail_daily_rate: Number.isFinite(avgNum as number) ? avgNum : null,
  });

  return {
    id: p.source_row_id,
    research_segment: segment,
    property_name: p.property_name,
    state: p.state,
    lat: p.lat,
    lon: p.lon,
    distance_miles: Math.round(p.distance_miles * 100) / 100,
    distance_band: p.distance_band,
    nearest_anchor: p.nearest_anchor,
    drive_time_hours: p.drive_time_hours,
    cohort_winter_weekday: p.winter_weekday,
    cohort_winter_weekend: p.winter_weekend,
    cohort_summer_weekday: p.summer_weekday,
    cohort_summer_weekend: p.summer_weekend,
    has_url: Boolean(details?.url && String(details.url).trim()),
    site_name: details?.site_name ?? null,
    city: details?.city ?? null,
    zip_code: details?.zip_code ?? null,
    country: details?.country ?? null,
    url: details?.url ?? null,
    unit_type: details?.unit_type ?? p.unit_type ?? null,
    property_type: details?.property_type ?? p.property_type ?? null,
    quantity_of_units: details?.quantity_of_units ?? p.quantity_of_units ?? null,
    property_total_sites: details?.property_total_sites ?? p.property_total_sites ?? null,
    brand_id: details?.brand_id ?? null,
    is_open: details?.is_open ?? null,
    research_status: details?.research_status ?? null,
    discovery_source: details?.discovery_source ?? null,
    rate_avg_retail_daily_rate: details?.rate_avg_retail_daily_rate ?? null,
    rate_winter_weekday: details?.rate_winter_weekday ?? null,
    rate_winter_weekend: details?.rate_winter_weekend ?? null,
    rate_spring_weekday: details?.rate_spring_weekday ?? null,
    rate_spring_weekend: details?.rate_spring_weekend ?? null,
    rate_summer_weekday: details?.rate_summer_weekday ?? null,
    rate_summer_weekend: details?.rate_summer_weekend ?? null,
    rate_fall_weekday: details?.rate_fall_weekday ?? null,
    rate_fall_weekend: details?.rate_fall_weekend ?? null,
    rate_unit_rates_by_year: details?.rate_unit_rates_by_year ?? null,
    rate_definition: useYearAvgRate ? 'year_avg_any_season' : 'winter_weekday_or_weekend',
  };
}

const EXPORT_COLUMNS = [
  'id',
  'research_segment',
  'property_name',
  'site_name',
  'city',
  'state',
  'zip_code',
  'country',
  'url',
  'lat',
  'lon',
  'distance_miles',
  'distance_band',
  'nearest_anchor',
  'drive_time_hours',
  'unit_type',
  'property_type',
  'quantity_of_units',
  'property_total_sites',
  'brand_id',
  'is_open',
  'research_status',
  'discovery_source',
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
  'rate_unit_rates_by_year',
  'cohort_winter_weekday',
  'cohort_winter_weekend',
  'cohort_summer_weekday',
  'cohort_summer_weekend',
  'has_url',
  'rate_definition',
] as const;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: npx tsx scripts/export-proximity-insights-missing-winter-rates.ts [options]

Options:
  --output <path>           CSV path (default: docs/data/exports/proximity-insights-ski-glamping-missing-winter-rates-YYYY-MM-DD.csv)
  --anchor-type <ski|...>   Anchor category (default: ski)
  --property-type <filter>  glamping | rv | all (default: glamping)
  --state <US state>        Optional state filter
  --all-sage-in-cohort      Export all Sage rows in cohort, not only missing winter
  --help`);
    return;
  }

  const { cohort, dataQuality, useYearAvgRate, withinMiThreshold, anchorType } =
    await buildAggregationCohort(supabase, {
      anchorType: args.anchorType,
      stateFilter: args.stateFilter,
      propertyTypeFilter: args.propertyTypeFilter,
    });

  const sageInCohort = cohort.filter((p) => p.source === 'sage_glamping');
  const sageMissing = sageInCohort.filter((p) =>
    isPropertyRateMissingForQuality(p, useYearAvgRate)
  );

  const exportProperties = args.allSageInCohort ? sageInCohort : sageMissing;

  const sageQuality = dataQuality.by_source.find((s) => s.source === 'Sage Glamping');
  const expectedMissing = sageQuality?.missing_rate ?? null;
  const expectedTotal = sageQuality?.total ?? null;

  if (
    !args.allSageInCohort &&
    expectedMissing != null &&
    exportProperties.length !== expectedMissing
  ) {
    console.warn(
      `Warning: export row count (${exportProperties.length}) != data quality missing_rate (${expectedMissing}). ` +
        'Cohort may have changed since page load.'
    );
  }

  const ids = exportProperties.map((p) => p.source_row_id);
  const detailsById = await fetchGlampingDetails(ids);

  const rows = exportProperties
    .map((p) => buildExportRow(p, detailsById.get(p.source_row_id), useYearAvgRate))
    .sort((a, b) => {
      const da = Number(a.distance_miles ?? 999);
      const db = Number(b.distance_miles ?? 999);
      if (da !== db) return da - db;
      return String(a.property_name).localeCompare(String(b.property_name));
    });

  const csvPath = args.outputPath;
  const manifestPath = csvPath.replace(/\.csv$/i, '.manifest.json');

  fs.mkdirSync(resolve(csvPath, '..'), { recursive: true });
  const header = EXPORT_COLUMNS.map(escapeCsv).join(',');
  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => escapeCsv(row[col])).join(',')
  );
  fs.writeFileSync(csvPath, [header, ...body].join('\n') + '\n', 'utf8');

  const segmentCounts: Record<string, number> = {};
  for (const row of rows) {
    const seg = String(row.research_segment);
    segmentCounts[seg] = (segmentCounts[seg] ?? 0) + 1;
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    admin_url_query: `type=${args.propertyTypeFilter}&anchor_type=${anchorType}`,
    params: {
      anchor_type: anchorType,
      property_type_filter: args.propertyTypeFilter,
      state_filter: args.stateFilter,
      within_mi_threshold: withinMiThreshold,
      rate_definition: useYearAvgRate ? 'year_avg_any_season' : 'winter_weekday_or_weekend',
      export_mode: args.allSageInCohort ? 'all_sage_in_cohort' : 'missing_winter_only',
    },
    counts: {
      cohort_total_properties: cohort.length,
      sage_in_cohort: sageInCohort.length,
      sage_missing_rate: sageMissing.length,
      data_quality_sage_total: expectedTotal,
      data_quality_sage_missing_rate: expectedMissing,
      exported_rows: rows.length,
      by_research_segment: segmentCounts,
    },
    frozen_ids: rows.map((r) => r.id),
    csv_path: csvPath,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`Anchor type: ${anchorType} (${useYearAvgRate ? 'blended seasonal rate' : 'winter only'})`);
  console.log(`Cohort: ${cohort.length} properties within ${withinMiThreshold} mi`);
  console.log(`Sage in cohort: ${sageInCohort.length} (missing rate: ${sageMissing.length})`);
  console.log(`Exported: ${rows.length} rows → ${csvPath}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log('Segments:', segmentCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
