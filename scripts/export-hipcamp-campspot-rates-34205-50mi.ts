#!/usr/bin/env npx tsx
/**
 * Export Hipcamp + Campspot property-level month-over-month occupancy and rates
 * for 2025 and 2026 within a radius of zip 34205 (Sarasota, FL).
 *
 * Output:
 * - reports/hipcamp-34205-50mi-2025-2026-property-monthly.csv
 * - reports/campspot-34205-50mi-2025-2026-property-monthly.csv
 * - reports/hipcamp-campspot-34205-50mi-2025-2026-property-monthly-combined.csv
 *
 * Run: npx tsx scripts/export-hipcamp-campspot-rates-34205-50mi.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { closeLegacyCampingPool } from '../lib/legacy-camping-db';
import {
  exportOtaPropertyMonthlyByRadius,
  OTA_MONTHLY_EXPORT_COLUMNS,
} from '../lib/ota-monthly-radius-export';

config({ path: resolve(process.cwd(), '.env.local') });

const OUTPUT_DIR = resolve(process.cwd(), 'reports');
const ZIP = '34205';
const RADIUS_MILES = 50;

function writeCsv(filename: string, rows: Record<string, string>[]) {
  const outputPath = resolve(OUTPUT_DIR, filename);
  writeFileSync(
    outputPath,
    stringify(rows, { header: true, columns: [...OTA_MONTHLY_EXPORT_COLUMNS] }),
    'utf-8',
  );
  console.log(`Wrote ${rows.length} rows to ${outputPath}`);
}

async function main() {
  console.log(
    `Exporting Hipcamp + Campspot property monthly rates (2025, 2026) within ${RADIUS_MILES} mi of zip ${ZIP}...\n`,
  );

  try {
    const result = await exportOtaPropertyMonthlyByRadius({
      zip: ZIP,
      radiusMiles: RADIUS_MILES,
      years: [2025, 2026],
      sources: ['hipcamp', 'campspot'],
    });

    console.log(`Center: ${result.center.lat}, ${result.center.lon}\n`);
    for (const s of result.sources) {
      console.log(
        `${s.source}: ${s.properties_in_radius} in radius, ${s.properties_with_monthly_data} with monthly data, ${s.row_count} rows`,
      );
    }
    console.log('');

    mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const sheet of result.export_sheets) {
      if (sheet.name === 'combined') {
        writeCsv(
          `hipcamp-campspot-${ZIP}-${RADIUS_MILES}mi-2025-2026-property-monthly-combined.csv`,
          sheet.data,
        );
        continue;
      }
      writeCsv(
        `${sheet.name}-${ZIP}-${RADIUS_MILES}mi-2025-2026-property-monthly.csv`,
        sheet.data,
      );
    }
  } catch (err) {
    console.error('Export failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
