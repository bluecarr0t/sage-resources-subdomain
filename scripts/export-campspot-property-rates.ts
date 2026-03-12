#!/usr/bin/env npx tsx
/**
 * Export 2025 month-by-month rates and occupancy for Campspot Jellystone properties
 * Output: Single combined CSV (Gardiner + Birchwood Acres)
 *
 * Uses MEDIAN for retail daily rate (not mean) to avoid skew from high-end lodges/cabins
 * which can have $900-1700/night rates vs typical RV sites at $50-200/night.
 * Only includes sites with occupancy > 5% when computing median rate (avoids placeholder
 * rates when park is closed and skewed rates from premium-only early season bookings).
 * high_month/low_month: only considers opened months (occupancy > 5%).
 * min_price/max_price: only from sites with occupancy > 5% (excludes closed-season placeholders).
 * max_price uses 95th percentile to exclude outlier rates (e.g. $1011 off-season placeholders).
 * Known placeholder rates ($1011.50, $1026.67, $705.06) are blanked regardless of occupancy.
 * Relaxed rule: show rates when ≥5 sites have occ>5% and rates are non-placeholder, even if
 * property avg occupancy ≤5% (avoids over-blanking Gardiner Nov/Dec which have valid data).
 *
 * Run: npx tsx scripts/export-campspot-property-rates.ts
 * Or:  npm run export:campspot-rates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { query, closeLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'reports');
const OUTPUT_FILE = 'campspot-jellystone-2025-rates-combined.csv';

// property_id from campspot.propertydetails (Gardiner, Birchwood Acres, Mirror Lake Retreat, Lone Oak)
const TARGET_PROPERTY_IDS = [16, 89, 3149, 4476];

// Known placeholder/artifact rates to blank (see CAMPSPOT_RATES_INVESTIGATION.md)
const KNOWN_PLACEHOLDER_RATES = new Set(['1011.5', '1011.50', '1026.67', '705.06']);

function isPlaceholderRate(val: string | undefined): boolean {
  if (!val?.trim()) return false;
  return KNOWN_PLACEHOLDER_RATES.has(val.trim());
}

type Row = {
  property_name: string;
  property_url: string;
  city: string;
  state: string;
  year: string;
  month: string;
  month_name: string;
  median_retail_daily_rate: string;
  mean_retail_daily_rate: string;
  avg_occupancy_rate_pct: string;
  revpar: string;
  min_price: string;
  max_price: string;
  site_count: string;
  high_month: string;
  low_month: string;
};

async function main() {
  console.log('Exporting Campspot 2025 rates (Gardiner, Birchwood Acres, Mirror Lake Retreat, Lone Oak)...\n');

  try {
    const { rows } = await query<{
      name: string;
      link: string;
      city: string;
      state: string;
      year: string;
      month: string;
      month_name: string;
      avg_occupancy_rate_pct: string;
      median_retail_daily_rate: string;
      mean_retail_daily_rate: string;
      revpar: string;
      min_price: string;
      max_price: string;
      site_count: string;
      sites_with_occ_above_5: string;
      high_month: string;
      low_month: string;
    }>(`
      WITH property_monthly AS (
        SELECT
          sma.property_id,
          sma.month,
          sma.month_name,
          avg(sma.avg_occupancy::float) as occ
        FROM campspot.site_monthly_analytics sma
        WHERE sma.year = '2025' AND sma.property_id = ANY($1::int[])
        GROUP BY sma.property_id, sma.month, sma.month_name
      ),
      open_months AS (
        SELECT * FROM property_monthly WHERE occ > 5
      ),
      property_peaks AS (
        SELECT
          property_id,
          (array_agg(month_name ORDER BY occ DESC))[1] as high_month,
          (array_agg(month_name ORDER BY occ ASC))[1] as low_month
        FROM open_months
        GROUP BY property_id
      )
      SELECT
        pd.name,
        pd.link,
        pd.city,
        pd.state,
        sma.year,
        sma.month,
        sma.month_name,
        round(avg(sma.avg_occupancy::numeric), 2)::text as avg_occupancy_rate_pct,
        round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5))::numeric, 2)::text as median_retail_daily_rate,
        round(avg(sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5), 2)::text as mean_retail_daily_rate,
        round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.revpar::numeric))::numeric, 2)::text as revpar,
        round(min(sma.min_price) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as min_price,
        round(percentile_cont(0.95) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as max_price,
        count(DISTINCT sma.site_id)::text as site_count,
        count(DISTINCT sma.site_id) FILTER (WHERE sma.avg_occupancy::float > 5)::text as sites_with_occ_above_5,
        pp.high_month,
        pp.low_month
      FROM campspot.site_monthly_analytics sma
      JOIN campspot.propertydetails pd ON pd.id = sma.property_id
      LEFT JOIN property_peaks pp ON pp.property_id = sma.property_id
      WHERE sma.year = '2025' AND sma.property_id = ANY($1::int[])
      GROUP BY pd.id, pd.name, pd.link, pd.city, pd.state, sma.year, sma.month, sma.month_name, pp.high_month, pp.low_month
      ORDER BY pd.name, sma.month::int
    `, [TARGET_PROPERTY_IDS]);

    if (!rows?.length) {
      console.error('No data found for the target properties.');
      process.exit(1);
    }

    const MIN_SITES_FOR_LOW_OCC_MONTH = 5;

    const csvRows: Row[] = (rows || []).map((r) => {
      const occ = parseFloat(r.avg_occupancy_rate_pct ?? '0');
      const sitesAbove5 = parseInt(r.sites_with_occ_above_5 ?? '0', 10);
      const hasValidRates =
        !isPlaceholderRate(r.median_retail_daily_rate) &&
        (r.median_retail_daily_rate ?? '').trim() !== '';
      // Relaxed: show rates when ≥5 sites have occ>5% and rates are non-placeholder, even if property avg ≤5%
      const showRates =
        occ > 5 || (sitesAbove5 >= MIN_SITES_FOR_LOW_OCC_MONTH && hasValidRates);
      const median = showRates && !isPlaceholderRate(r.median_retail_daily_rate) ? (r.median_retail_daily_rate ?? '') : '';
      const mean = showRates && !isPlaceholderRate(r.mean_retail_daily_rate) ? (r.mean_retail_daily_rate ?? '') : '';
      const minPrice = showRates && !isPlaceholderRate(r.min_price) ? (r.min_price ?? '') : '';
      const maxPrice = showRates && !isPlaceholderRate(r.max_price) ? (r.max_price ?? '') : '';
      return {
        property_name: r.name,
        property_url: r.link,
        city: r.city,
        state: r.state,
        year: r.year,
        month: r.month,
        month_name: r.month_name,
        median_retail_daily_rate: median,
        mean_retail_daily_rate: mean,
        avg_occupancy_rate_pct: r.avg_occupancy_rate_pct,
        revpar: r.revpar,
        min_price: minPrice,
        max_price: maxPrice,
        site_count: r.site_count,
        high_month: r.high_month || '',
        low_month: r.low_month || '',
      };
    });

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = resolve(OUTPUT_DIR, OUTPUT_FILE);
    const csv = stringify(csvRows, {
      header: true,
      columns: [
        'property_name',
        'property_url',
        'city',
        'state',
        'year',
        'month',
        'month_name',
        'median_retail_daily_rate',
        'mean_retail_daily_rate',
        'avg_occupancy_rate_pct',
        'revpar',
        'min_price',
        'max_price',
        'site_count',
        'high_month',
        'low_month',
      ],
    });

    writeFileSync(outputPath, csv, 'utf-8');
    console.log(`Wrote ${csvRows.length} rows to ${outputPath}`);
  } catch (err) {
    console.error('Export failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
