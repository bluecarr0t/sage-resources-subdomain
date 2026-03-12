#!/usr/bin/env npx tsx
/**
 * Export 2025 site-level rates and occupancy for Campspot Jellystone properties
 * Each row = one unique site; columns = rate and occupancy by month (Jan-Dec)
 *
 * unit_type comes from parent sitedetails via campspot.sites.parent_id
 * (Lodging, RV, Tent - matches Campspot site type filter)
 *
 * Rates are blanked when:
 * - occupancy <= 5% (closed-season)
 * - rate is a known placeholder ($1011.50, $1026.67, $705.06 - data artifacts)
 *
 * Run: npx tsx scripts/export-campspot-sites-rates.ts
 * Or:  npm run export:campspot-sites
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { query, closeLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'reports');
const OUTPUT_FILE = 'campspot-jellystone-2025-sites-rates.csv';

// Gardiner (16) + Birchwood Acres (89) + Mirror Lake Retreat (3149) + Lone Oak Campsites (4476)
const TARGET_PROPERTY_IDS = [16, 89, 3149, 4476];

// Known placeholder/artifact rates to blank (see CAMPSPOT_RATES_INVESTIGATION.md)
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

async function main() {
  console.log('Exporting Campspot 2025 site-level rates (Gardiner, Birchwood Acres, Mirror Lake Retreat, Lone Oak)...\n');

  try {
    const rateCols = MONTHS.map(
      (m) =>
        `CASE WHEN max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::float END) > 5 THEN round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_price::numeric END), 2)::text END as rate_${m.name}`
    ).join(',\n        ');
    const occCols = MONTHS.map((m) => `round(max(CASE WHEN sma.month = '${m.num}' THEN sma.avg_occupancy::numeric END), 2)::text as occupancy_${m.name}`).join(',\n        ');

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
    `, [TARGET_PROPERTY_IDS]);

    if (!rows?.length) {
      console.error('No data found for the target properties.');
      process.exit(1);
    }

    // Blank known placeholder rates (regardless of occupancy)
    for (const row of rows) {
      for (const m of MONTHS) {
        const key = `rate_${m.name}`;
        if (isPlaceholderRate(row[key])) row[key] = '';
      }
    }

    // site_url from property link (campspot.propertydetails.link) - no construction from site_id
    for (const row of rows) {
      row.site_url = row.property_link || '';
    }

    // Compute high/low rate and occupancy with month names
    for (const row of rows) {
      const hl = computeHighLow(row);
      Object.assign(row, hl);
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

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = resolve(OUTPUT_DIR, OUTPUT_FILE);
    const csv = stringify(rows, { header: true, columns });
    writeFileSync(outputPath, csv, 'utf-8');
    console.log(`Wrote ${rows.length} rows to ${outputPath}`);
  } catch (err) {
    console.error('Export failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
