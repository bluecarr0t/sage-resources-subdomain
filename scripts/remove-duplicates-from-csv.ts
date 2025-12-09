#!/usr/bin/env ts-node
/**
 * Remove confirmed duplicates from new-glamping-properties.csv
 */

import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Confirmed duplicates to remove (based on duplicate check report)
const duplicatesToRemove = new Set([
  'Under Canvas Yosemite',
  'AutoCamp Sequoia',
  'Firefall Ranch',
  'AutoCamp Yosemite',
  'Treebones Resort',
  'Ventana Big Sur',
  'Outdoorsy Hill Country',
  'Basecamp Terlingua',
  'The Yurtopian Wimberley',
  'The Yurtopian Dripping Springs',
  'Sinya on Lone Man Creek',
  'The Retreat on the Hill',
  'Loving Heart Retreats',
  'Two Capes Lookout',
  'Umpqua\'s Last Resort',
  'Bay Point Landing',
  'The Vintages Trailer Resort',
  'Skamania Lodge',
  'Under Canvas Columbia River Gorge',
  'Lakedale Resort at Three Lakes',
  'Backland Luxury Camping',
  'Camp Sarika at Amangiri',
]);

async function main() {
  const csvFile = 'csv/new-properties/new-glamping-properties.csv';

  console.log('='.repeat(70));
  console.log('Removing Duplicates from new-glamping-properties.csv');
  console.log('='.repeat(70));
  console.log();

  // Read CSV file
  console.log(`📖 Reading CSV file: ${csvFile}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const csvRows = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  console.log(`✅ Found ${csvRows.length} properties in CSV\n`);

  // Filter out duplicates
  const unique: any[] = [];
  const removed: any[] = [];

  for (const row of csvRows) {
    const propertyName = row['Property Name']?.trim() || '';
    
    if (duplicatesToRemove.has(propertyName)) {
      removed.push(row);
      console.log(`  ✗ Removing: ${propertyName}`);
    } else {
      unique.push(row);
    }
  }

  console.log();
  console.log(`📊 Summary:`);
  console.log(`   Total in CSV: ${csvRows.length}`);
  console.log(`   Removed: ${removed.length}`);
  console.log(`   Remaining: ${unique.length}`);
  console.log();

  // Write updated CSV
  if (removed.length > 0) {
    console.log('💾 Writing updated CSV file...');
    
    // Get fieldnames from first row
    const fieldnames = Object.keys(csvRows[0]);

    // Write updated CSV
    const updatedCsv = stringify(unique, {
      header: true,
      columns: fieldnames,
    });

    fs.writeFileSync(csvFile, updatedCsv, 'utf-8');

    console.log(`✅ Updated CSV file: ${csvFile}`);
    console.log(`   Removed ${removed.length} duplicate properties`);
    console.log(`   Remaining properties: ${unique.length}`);
  } else {
    console.log('✅ No duplicates to remove - CSV is clean!');
  }

  console.log();
  console.log('='.repeat(70));
  console.log('Removal complete!');
  console.log('='.repeat(70));
}

// Run the script
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
