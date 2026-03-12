#!/usr/bin/env npx tsx
/**
 * Export 2023-2025 rate data for Gardiner, Birchwood, Lone Oak, Mirror Lake
 * Output: reports/campspot-gardiner-birchwood-rates-2023-2025.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { query, closeLegacyCampingPool } from '../lib/legacy-camping-db';

config({ path: resolve(process.cwd(), '.env.local') });

const PROPERTIES = [
  'Gardiner',
  'Jellystone Birchwood Acres',
  'Lone Oak Campsites - East Canaan, CT',
  'Mirror Lake Retreat - Milan, NY',
];

async function main() {
  const { rows } = await query<{
    property_name: string;
    year: string;
    unit_type: string;
    avg_rate: string;
    avg_occupancy: string;
  }>(`
    WITH classified AS (
      SELECT property_name, year, avg_price, avg_occupancy,
        CASE 
          WHEN site_name ILIKE '%tent%' OR site_name ILIKE '%pop-up%' THEN 'tent'
          WHEN site_name ILIKE '%rv%' OR site_name ILIKE '%hookup%' OR site_name ILIKE '%30-amp%' OR site_name ILIKE '%50-amp%' OR site_name ILIKE '%20 amp%' THEN 'rv'
          ELSE 'lodging'
        END as unit_type
      FROM campspot.old_data_table
      WHERE property_name = ANY($1::text[])
        AND year IN (2023, 2024, 2025)
        AND NOT (avg_price BETWEEN 1011 AND 1012 AND property_name = 'Jellystone Birchwood Acres' AND year = 2025)
    )
    SELECT property_name, year::text as year, unit_type,
      round(avg(avg_price)::numeric, 2)::text as avg_rate,
      round(avg(avg_occupancy)::numeric, 1)::text as avg_occupancy
    FROM classified
    GROUP BY property_name, year, unit_type
    ORDER BY property_name, unit_type, year
  `, [PROPERTIES]);

  const pivoted: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const key = `${row.property_name}|${row.unit_type}`;
    if (!pivoted[key]) pivoted[key] = { property_name: row.property_name, unit_type: row.unit_type };
    pivoted[key][`rate_${row.year}`] = row.avg_rate;
    pivoted[key][`occupancy_${row.year}`] = row.avg_occupancy;
  }

  const csvRows = Object.values(pivoted).map((r) => {
    const rate2023 = r.rate_2023 ? parseFloat(r.rate_2023) : NaN;
    const rate2024 = r.rate_2024 ? parseFloat(r.rate_2024) : NaN;
    const rate2025 = r.rate_2025 ? parseFloat(r.rate_2025) : NaN;
    const occ2023 = r.occupancy_2023 ? parseFloat(r.occupancy_2023) : NaN;
    const occ2025 = r.occupancy_2025 ? parseFloat(r.occupancy_2025) : NaN;

    let rollingChangeYoY = '';
    if (!isNaN(rate2024) && !isNaN(rate2025) && rate2024 > 0) {
      rollingChangeYoY = (((rate2025 - rate2024) / rate2024) * 100).toFixed(1) + '%';
    }

    let rateRollingYoY = '';
    if (!isNaN(rate2023) && !isNaN(rate2025) && rate2023 > 0) {
      rateRollingYoY = (((rate2025 - rate2023) / rate2023) * 100).toFixed(1) + '%';
    }

    let occupancyRollingYoY = '';
    if (!isNaN(occ2023) && !isNaN(occ2025) && occ2023 > 0) {
      occupancyRollingYoY = (((occ2025 - occ2023) / occ2023) * 100).toFixed(1) + '%';
    }

    return {
      property_name: r.property_name,
      unit_type: r.unit_type,
      rate_2023: r.rate_2023 ?? '',
      rate_2024: r.rate_2024 ?? '',
      rate_2025: r.rate_2025 ?? '',
      occupancy_2023: r.occupancy_2023 ?? '',
      occupancy_2024: r.occupancy_2024 ?? '',
      occupancy_2025: r.occupancy_2025 ?? '',
      rolling_change_yoy: rollingChangeYoY,
      rate_rolling_yoy: rateRollingYoY,
      occupancy_rolling_yoy: occupancyRollingYoY,
    };
  });

  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  const outputPath = resolve(process.cwd(), 'reports/campspot-gardiner-birchwood-rates-2023-2025.csv');
  const csv = stringify(csvRows, {
    header: true,
    columns: [
      'property_name',
      'unit_type',
      'rate_2023',
      'rate_2024',
      'rate_2025',
      'occupancy_2023',
      'occupancy_2024',
      'occupancy_2025',
      'rolling_change_yoy',
      'rate_rolling_yoy',
      'occupancy_rolling_yoy',
    ],
  });
  writeFileSync(outputPath, csv, 'utf-8');
  console.log(`Wrote ${csvRows.length} rows to ${outputPath}`);
  await closeLegacyCampingPool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
