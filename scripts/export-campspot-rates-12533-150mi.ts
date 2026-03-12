#!/usr/bin/env npx tsx
/**
 * Export 2025 Campspot site-level and property-level rates for properties within
 * 150 miles of zip code 12533 (Hopewell Junction, NY).
 *
 * Output files (identical format to jellystone exports):
 * - reports/campspot-12533-150mi-2025-sites-rates.csv (site-level)
 * - reports/campspot-12533-150mi-2025-rates-combined.csv (property-level)
 *
 * Run: npx tsx scripts/export-campspot-rates-12533-150mi.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { query, closeLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'reports');
const SITES_FILE = 'campspot-12533-150mi-2025-sites-rates.csv';
const PROPERTY_FILE = 'campspot-12533-150mi-2025-rates-combined.csv';

// Zip 12533 (Hopewell Junction, NY) centroid
const ZIP_LAT = 41.574;
const ZIP_LON = -73.796;
const RADIUS_MILES = 150;
const RADIUS_METERS = RADIUS_MILES * 1609.344;

const KNOWN_PLACEHOLDER_RATES = new Set(['1011.5', '1011.50', '1026.67', '705.06']);

function isPlaceholderRate(val: string | undefined): boolean {
  if (!val?.trim()) return false;
  return KNOWN_PLACEHOLDER_RATES.has(val.trim());
}

const MONTHS = [
  { num: '1', name: 'january', display: 'January' },
  { num: '2', name: 'february', display: 'February' },
  { num: '3', name: 'march', display: 'March' },
  { num: '4', name: 'april', display: 'April' },
  { num: '5', name: 'may', display: 'May' },
  { num: '6', name: 'june', display: 'June' },
  { num: '7', name: 'july', display: 'July' },
  { num: '8', name: 'august', display: 'August' },
  { num: '9', name: 'september', display: 'September' },
  { num: '10', name: 'october', display: 'October' },
  { num: '11', name: 'november', display: 'November' },
  { num: '12', name: 'december', display: 'December' },
];

function computeHighLow(row: Record<string, string>) {
  const rateEntries: { val: number; month: string }[] = [];
  const occEntries: { val: number; month: string }[] = [];
  const occForMean: number[] = [];
  const rateForMean: number[] = [];
  for (const m of MONTHS) {
    const rate = row[`rate_${m.name}`];
    const occ = row[`occupancy_${m.name}`];
    if (rate?.trim() && !isPlaceholderRate(rate)) {
      const n = parseFloat(rate);
      if (!isNaN(n)) {
        rateEntries.push({ val: n, month: m.display });
        rateForMean.push(n);
      }
    }
    if (occ?.trim()) {
      const n = parseFloat(occ);
      if (!isNaN(n) && n > 0) occEntries.push({ val: n, month: m.display });
      if (!isNaN(n)) occForMean.push(n);
    }
  }
  const highRate = rateEntries.length ? rateEntries.reduce((a, b) => (a.val >= b.val ? a : b)) : null;
  const lowRate = rateEntries.length ? rateEntries.reduce((a, b) => (a.val <= b.val ? a : b)) : null;
  const highOcc = occEntries.length ? occEntries.reduce((a, b) => (a.val >= b.val ? a : b)) : null;
  const lowOcc = occEntries.length ? occEntries.reduce((a, b) => (a.val <= b.val ? a : b)) : null;
  const avgOccupancy =
    occForMean.length > 0 ? (occForMean.reduce((a, b) => a + b, 0) / occForMean.length).toFixed(2) : '';
  const avgRate =
    rateForMean.length > 0 ? (rateForMean.reduce((a, b) => a + b, 0) / rateForMean.length).toFixed(2) : '';
  return {
    avg_occupancy: avgOccupancy,
    avg_rate: avgRate,
    high_month_rate: highRate?.val.toString() ?? '',
    high_month_rate_name: highRate?.month ?? '',
    low_month_rate: lowRate?.val.toString() ?? '',
    low_month_rate_name: lowRate?.month ?? '',
    high_occupancy_rate: highOcc?.val.toString() ?? '',
    high_month_occupancy_name: highOcc?.month ?? '',
    low_occupancy_rate: lowOcc?.val.toString() ?? '',
    low_month_occupancy_name: lowOcc?.month ?? '',
  };
}

async function getPropertyIdsInRadius(): Promise<number[]> {
  const { rows } = await query<{ id: number }>(`
    SELECT pd.id
    FROM campspot.propertydetails pd
    WHERE pd.coordinates IS NOT NULL
      AND ST_DWithin(
        pd.coordinates::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
  `, [ZIP_LON, ZIP_LAT, RADIUS_METERS]);
  return (rows || []).map((r) => r.id);
}

async function exportSitesRates(propertyIds: number[]) {
  if (propertyIds.length === 0) {
    console.log('No properties in radius, skipping sites export.');
    return;
  }

  const rateCols = MONTHS.map(
    (m) =>
      `CASE WHEN max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::float END) > 5 THEN round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_price::numeric END), 2)::text END as rate_${m.name}`
  ).join(',\n        ');
  const occCols = MONTHS.map(
    (m) =>
      `round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::numeric END), 2)::text as occupancy_${m.name}`
  ).join(',\n        ');

  const { rows } = await query<Record<string, string>>(`
    WITH site_parent AS (
      SELECT DISTINCT ON (id, property_id) id, property_id, parent_id
      FROM campspot.sites
      WHERE property_id = ANY($1::int[])
      ORDER BY id, property_id, scraping_id DESC
    )
    SELECT
      pd.name as property_name,
      pd.link as property_link,
      pd.city,
      pd.state,
      sma.property_id,
      sma.site_id,
      sd_parent.category as unit_type,
      sd_parent.name as site_name,
      max(CASE WHEN (sd_parent.amenities::jsonb ? 'Private Bathroom' OR sd_parent.amenities::jsonb ? 'Private Shower') THEN 'Yes' ELSE 'No' END) as amenity_private_bathroom,
      max(CASE WHEN sd_parent.amenities::jsonb ? 'Water Hook-Up' THEN 'Yes' ELSE 'No' END) as amenity_water,
      max(CASE WHEN sd_parent.amenities::jsonb ? 'Sewer Hook-Up' THEN 'Yes' ELSE 'No' END) as amenity_sewer,
      max(CASE WHEN (sd_parent.amenities::jsonb ? 'Water Hook-Up' AND sd_parent.amenities::jsonb ? 'Sewer Hook-Up' AND (sd_parent.amenities::jsonb ? '30-Amp' OR sd_parent.amenities::jsonb ? '50-Amp')) THEN 'Yes' ELSE 'No' END) as amenity_full_hookup,
      max(CASE WHEN sd_parent.amenities::jsonb ? '50-Amp' THEN 'Yes' ELSE 'No' END) as amenity_50amp,
      max(CASE WHEN sd_parent.amenities::jsonb ? '30-Amp' THEN 'Yes' ELSE 'No' END) as amenity_30amp,
      max(CASE WHEN sd_parent.amenities::jsonb ? '20-Amp' THEN 'Yes' ELSE 'No' END) as amenity_20amp,
      max(CASE WHEN (sd_parent.amenities::jsonb ? 'Pull-Through' OR sd_parent.amenities::jsonb ? 'Pull-Through Site') THEN 'Yes' ELSE 'No' END) as amenity_pull_through,
      max(CASE WHEN (sd_parent.amenities::jsonb ? 'Back-In' OR sd_parent.amenities::jsonb ? 'Back-In Site') THEN 'Yes' ELSE 'No' END) as amenity_back_in,
      ${rateCols},
      ${occCols}
    FROM campspot.site_monthly_analytics sma
    JOIN campspot.propertydetails pd ON pd.id = sma.property_id
    LEFT JOIN site_parent sp ON sp.id = sma.site_id AND sp.property_id = sma.property_id
    LEFT JOIN campspot.sitedetails sd_parent ON sd_parent.id = sp.parent_id AND sd_parent.property_id = sma.property_id
    WHERE sma.year = '2025' AND sma.property_id = ANY($1::int[])
    GROUP BY pd.name, pd.link, pd.city, pd.state, sma.property_id, sma.site_id, sd_parent.category, sd_parent.name
    ORDER BY pd.name, sma.site_id
  `, [propertyIds]);

  if (!rows?.length) {
    console.log('No site-level data for properties in radius.');
    return;
  }

  for (const row of rows) {
    for (const m of MONTHS) {
      const key = `rate_${m.name}`;
      if (isPlaceholderRate(row[key])) row[key] = '';
    }
    row.site_url = row.property_link || '';
    Object.assign(row, computeHighLow(row));
  }

  const columns = [
    'property_name',
    'site_url',
    'city',
    'state',
    'site_id',
    'unit_type',
    'site_name',
    'amenity_private_bathroom',
    'amenity_water',
    'amenity_sewer',
    'amenity_full_hookup',
    'amenity_50amp',
    'amenity_30amp',
    'amenity_20amp',
    'amenity_pull_through',
    'amenity_back_in',
    ...MONTHS.flatMap((m) => [`rate_${m.name}`, `occupancy_${m.name}`]),
    'avg_occupancy',
    'avg_rate',
    'high_month_rate',
    'low_month_rate',
    'high_month_rate_name',
    'low_month_rate_name',
    'high_occupancy_rate',
    'low_occupancy_rate',
    'high_month_occupancy_name',
    'low_month_occupancy_name',
  ];

  const outputPath = resolve(OUTPUT_DIR, SITES_FILE);
  writeFileSync(outputPath, stringify(rows, { header: true, columns }), 'utf-8');
  console.log(`Wrote ${rows.length} site rows to ${outputPath}`);
}

async function exportPropertyRates(propertyIds: number[]) {
  if (propertyIds.length === 0) {
    console.log('No properties in radius, skipping property export.');
    return;
  }

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
      SELECT sma.property_id, sma.month, sma.month_name, avg(sma.avg_occupancy::float) as occ
      FROM campspot.site_monthly_analytics sma
      WHERE sma.year = '2025' AND sma.property_id = ANY($1::int[])
      GROUP BY sma.property_id, sma.month, sma.month_name
    ),
    open_months AS (SELECT * FROM property_monthly WHERE occ > 5),
    property_peaks AS (
      SELECT property_id,
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
  `, [propertyIds]);

  if (!rows?.length) {
    console.log('No property-level data for properties in radius.');
    return;
  }

  const MIN_SITES_FOR_LOW_OCC_MONTH = 5;
  const csvRows = rows.map((r) => {
    const occ = parseFloat(r.avg_occupancy_rate_pct ?? '0');
    const sitesAbove5 = parseInt(r.sites_with_occ_above_5 ?? '0', 10);
    const hasValidRates =
      !isPlaceholderRate(r.median_retail_daily_rate) && (r.median_retail_daily_rate ?? '').trim() !== '';
    const showRates = occ > 5 || (sitesAbove5 >= MIN_SITES_FOR_LOW_OCC_MONTH && hasValidRates);
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

  const outputPath = resolve(OUTPUT_DIR, PROPERTY_FILE);
  writeFileSync(
    outputPath,
    stringify(csvRows, {
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
    }),
    'utf-8'
  );
  console.log(`Wrote ${csvRows.length} property-month rows to ${outputPath}`);
}

async function main() {
  console.log(`Exporting Campspot 2025 rates for properties within ${RADIUS_MILES} miles of zip 12533...\n`);

  try {
    const propertyIds = await getPropertyIdsInRadius();
    console.log(`Found ${propertyIds.length} properties within ${RADIUS_MILES} miles of 12533.\n`);

    mkdirSync(OUTPUT_DIR, { recursive: true });

    await exportSitesRates(propertyIds);
    await exportPropertyRates(propertyIds);
  } catch (err) {
    console.error('Export failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
