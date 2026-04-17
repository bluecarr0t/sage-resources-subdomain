#!/usr/bin/env npx tsx
/**
 * Analyze all_glamping_properties data for the Texas Hill Country area.
 * Produces average rates, seasonal rate breakdowns, unit type distribution,
 * amenity prevalence, property type mix, and other key metrics.
 *
 * Usage: npx tsx scripts/analyze-texas-hill-country-glamping.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Texas Hill Country cities — curated list covering the core region
 * roughly bounded by Austin/San Antonio to the east, Kerrville/Junction to the west,
 * Llano/Burnet to the north, and Uvalde/Concan to the south.
 */
const HILL_COUNTRY_CITIES = new Set([
  'fredericksburg', 'wimberley', 'dripping springs', 'new braunfels',
  'san marcos', 'johnson city', 'marble falls', 'bandera', 'boerne',
  'kerrville', 'blanco', 'canyon lake', 'comfort', 'medina',
  'luckenbach', 'stonewall', 'burnet', 'llano', 'mason',
  'hunt', 'leakey', 'utopia', 'vanderpool', 'camp verde',
  'ingram', 'center point', 'harper', 'tarpley', 'pipe creek',
  'helotes', 'spring branch', 'lago vista', 'spicewood',
  'round mountain', 'hye', 'driftwood', 'concan', 'rio frio',
  'gruene', 'bulverde', 'fischer', 'mountain home', 'junction',
  'lakehills', 'mico', 'bergheim', 'sisterdale', 'waring',
  'kendalia', 'fischer', 'bertram', 'kingsland', 'horseshoe bay',
  'buchanan dam', 'tow', 'sunrise beach village', 'granite shoals',
]);

/**
 * Lat/lon bounding box for the broader Hill Country region as a fallback
 * for properties whose city name isn't in the curated list.
 */
const HILL_COUNTRY_BOUNDS = {
  latMin: 29.4,
  latMax: 31.1,
  lonMin: -100.2,
  lonMax: -97.4,
};

function isInHillCountryBounds(lat: number, lon: number): boolean {
  return (
    lat >= HILL_COUNTRY_BOUNDS.latMin &&
    lat <= HILL_COUNTRY_BOUNDS.latMax &&
    lon >= HILL_COUNTRY_BOUNDS.lonMin &&
    lon <= HILL_COUNTRY_BOUNDS.lonMax
  );
}

function parseNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) || !isFinite(n) ? null : n;
}

function pct(count: number, total: number): string {
  if (total === 0) return '0.0%';
  return ((count / total) * 100).toFixed(1) + '%';
}

function pctFloat(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0.0%';
  return ((numerator / denominator) * 100).toFixed(1) + '%';
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatUSD(n: number): string {
  return '$' + n.toFixed(0);
}

function yesValues(v: string | null | undefined): boolean {
  if (!v) return false;
  const lower = v.toLowerCase().trim();
  return lower === 'yes' || lower === 'true' || lower === '1' || lower === 'y';
}

interface PropertyRow {
  id: number;
  property_name: string | null;
  site_name: string | null;
  property_type: string | null;
  is_glamping_property: string | null;
  is_closed: string | null;
  city: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
  unit_type: string | null;
  unit_capacity: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  year_site_opened: string | number | null;
  operating_season_months: string | null;
  rate_avg_retail_daily_rate: string | number | null;
  rate_winter_weekday: string | number | null;
  rate_winter_weekend: string | number | null;
  rate_spring_weekday: string | number | null;
  rate_spring_weekend: string | number | null;
  rate_summer_weekday: string | number | null;
  rate_summer_weekend: string | number | null;
  rate_fall_weekday: string | number | null;
  rate_fall_weekend: string | number | null;
  rate_category: string | null;
  minimum_nights: string | null;
  quality_score: number | null;
  url: string | null;
  unit_wifi: string | null;
  unit_air_conditioning: string | null;
  unit_private_bathroom: string | null;
  unit_full_kitchen: string | null;
  unit_kitchenette: string | null;
  unit_hot_tub: string | null;
  unit_hot_tub_or_sauna: string | null;
  unit_pets: string | null;
  unit_patio: string | null;
  unit_campfires: string | null;
  unit_shower: string | null;
  unit_electricity: string | null;
  unit_bed: string | null;
  property_pool: string | null;
  property_hot_tub: string | null;
  property_food_on_site: string | null;
  property_restaurant: string | null;
  property_waterfront: string | null;
  property_family_friendly: string | null;
  property_playground: string | null;
  property_dog_park: string | null;
  property_general_store: string | null;
  property_laundry: string | null;
  property_fitness_room: string | null;
  activities_hiking: string | null;
  activities_fishing: string | null;
  activities_swimming: string | null;
  activities_horseback_riding: string | null;
  activities_biking: string | null;
  activities_stargazing: string | null;
  activities_canoeing_kayaking: string | null;
  activities_wildlife_watching: string | null;
  setting_ranch: string | null;
  setting_lake: string | null;
  setting_forest: string | null;
  river_stream_or_creek: string | null;
}

const SELECT_COLUMNS = [
  'id', 'property_name', 'site_name', 'property_type',
  'is_glamping_property', 'is_closed',
  'city', 'state', 'lat', 'lon',
  'unit_type', 'unit_capacity', 'quantity_of_units', 'property_total_sites',
  'year_site_opened', 'operating_season_months',
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday', 'rate_winter_weekend',
  'rate_spring_weekday', 'rate_spring_weekend',
  'rate_summer_weekday', 'rate_summer_weekend',
  'rate_fall_weekday', 'rate_fall_weekend',
  'rate_category', 'minimum_nights', 'quality_score', 'url',
  'unit_wifi', 'unit_air_conditioning', 'unit_private_bathroom',
  'unit_full_kitchen', 'unit_kitchenette', 'unit_hot_tub', 'unit_hot_tub_or_sauna',
  'unit_pets', 'unit_patio', 'unit_campfires', 'unit_shower', 'unit_electricity', 'unit_bed',
  'property_pool', 'property_hot_tub', 'property_food_on_site', 'property_restaurant',
  'property_waterfront', 'property_family_friendly', 'property_playground',
  'property_dog_park', 'property_general_store', 'property_laundry', 'property_fitness_room',
  'activities_hiking', 'activities_fishing', 'activities_swimming',
  'activities_horseback_riding', 'activities_biking', 'activities_stargazing',
  'activities_canoeing_kayaking', 'activities_wildlife_watching',
  'setting_ranch', 'setting_lake', 'setting_forest', 'river_stream_or_creek',
].join(', ');

async function fetchTexasProperties(): Promise<PropertyRow[]> {
  const all: PropertyRow[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(SELECT_COLUMNS)
      .ilike('state', '%TX%')
      .range(offset, offset + pageSize - 1);

    if (error) {
      const { data: data2, error: error2 } = await supabase
        .from('all_glamping_properties')
        .select(SELECT_COLUMNS)
        .ilike('state', '%Texas%')
        .range(offset, offset + pageSize - 1);

      if (error2) throw new Error(`Supabase error: ${error2.message}`);
      if (!data2?.length) break;
      all.push(...(data2 as PropertyRow[]));
      if (data2.length < pageSize) break;
      offset += pageSize;
      continue;
    }

    if (!data?.length) break;
    all.push(...(data as PropertyRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // Also fetch state = 'Texas' in case some records use the full name
  offset = 0;
  const existingIds = new Set(all.map((r) => r.id));
  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(SELECT_COLUMNS)
      .ilike('state', '%Texas%')
      .range(offset, offset + pageSize - 1);

    if (error) break;
    if (!data?.length) break;
    for (const row of data as PropertyRow[]) {
      if (!existingIds.has(row.id)) {
        all.push(row);
        existingIds.add(row.id);
      }
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

function isHillCountryProperty(row: PropertyRow): boolean {
  const city = (row.city ?? '').toLowerCase().trim();
  if (city && HILL_COUNTRY_CITIES.has(city)) return true;

  const lat = parseNum(row.lat);
  const lon = parseNum(row.lon);
  if (lat !== null && lon !== null) {
    return isInHillCountryBounds(lat, lon);
  }

  return false;
}

function computeAvgRate(row: PropertyRow): number | null {
  const avg = parseNum(row.rate_avg_retail_daily_rate);
  if (avg !== null && avg > 0) return avg;

  const seasonalFields: (keyof PropertyRow)[] = [
    'rate_winter_weekday', 'rate_winter_weekend',
    'rate_spring_weekday', 'rate_spring_weekend',
    'rate_summer_weekday', 'rate_summer_weekend',
    'rate_fall_weekday', 'rate_fall_weekend',
  ];

  const rates: number[] = [];
  for (const f of seasonalFields) {
    const v = parseNum(row[f] as string | number | null);
    if (v !== null && v > 0) rates.push(v);
  }
  return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
}

function countMap<T extends string | null | undefined>(
  values: T[],
  normalizer?: (v: string) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    const items = v.includes(',') ? v.split(',').map((s) => s.trim()) : [v.trim()];
    for (const item of items) {
      if (!item) continue;
      const key = normalizer ? normalizer(item) : item;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return map;
}

function printSortedMap(map: Map<string, number>, total: number, indent = '  ', limit?: number): void {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const items = limit ? sorted.slice(0, limit) : sorted;
  for (const [key, count] of items) {
    console.log(`${indent}${key.padEnd(35)} ${String(count).padStart(4)}  (${pct(count, total)})`);
  }
  if (limit && sorted.length > limit) {
    console.log(`${indent}... and ${sorted.length - limit} more`);
  }
}

/** Sum of quantity_of_units for rows where each unit_type token gets an equal share (handles comma-separated types). */
function addQuantityToUnitTypeMap(map: Map<string, number>, row: PropertyRow): void {
  const q = parseNum(row.quantity_of_units);
  if (q === null || q <= 0) return;
  const rawTypes = (row.unit_type ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const types = rawTypes.length > 0 ? rawTypes : ['Unknown'];
  const share = q / types.length;
  for (const t of types) {
    const key = t.charAt(0).toUpperCase() + t.slice(1);
    map.set(key, (map.get(key) ?? 0) + share);
  }
}

function printUnitTotalsMap(map: Map<string, number>, grandTotal: number, indent = '  ', limit?: number): void {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const items = limit ? sorted.slice(0, limit) : sorted;
  for (const [key, units] of items) {
    const u = Number.isInteger(units) ? String(units) : units.toFixed(1);
    console.log(`${indent}${key.padEnd(35)} ${u.padStart(6)}  (${pctFloat(units, grandTotal)})`);
  }
  if (limit && sorted.length > limit) {
    console.log(`${indent}... and ${sorted.length - limit} more`);
  }
}

function printAmenityTable(
  label: string,
  fields: { name: string; key: keyof PropertyRow }[],
  data: PropertyRow[]
): void {
  console.log(`\n${label}`);
  console.log('-'.repeat(60));
  const total = data.length;
  const results: { name: string; count: number }[] = [];
  for (const { name, key } of fields) {
    const count = data.filter((r) => yesValues(r[key] as string)).length;
    results.push({ name, count });
  }
  results.sort((a, b) => b.count - a.count);
  for (const { name, count } of results) {
    if (count > 0) {
      console.log(`  ${name.padEnd(35)} ${String(count).padStart(4)}  (${pct(count, total)})`);
    }
  }
}

async function main(): Promise<void> {
  console.log('Fetching Texas properties from all_glamping_properties...\n');

  const texasAll = await fetchTexasProperties();
  console.log(`Total Texas records: ${texasAll.length}`);

  const hillCountry = texasAll.filter(isHillCountryProperty);
  console.log(`Texas Hill Country records (city match + geo bounds): ${hillCountry.length}\n`);

  if (hillCountry.length === 0) {
    console.log('No Hill Country properties found. Check data.');
    return;
  }

  // Exclude closed properties for most metrics
  const open = hillCountry.filter(
    (r) => !r.is_closed || r.is_closed.toLowerCase() !== 'yes'
  );
  console.log(`Open (not closed) Hill Country records: ${open.length}`);
  const closed = hillCountry.length - open.length;
  if (closed > 0) console.log(`Closed Hill Country records: ${closed}`);

  // Unique properties (by property_name)
  const uniqueNames = new Set(
    open.map((r) => (r.property_name ?? '').toLowerCase().trim()).filter(Boolean)
  );
  console.log(`Unique property names (open): ${uniqueNames.size}`);

  // ===== SECTION: Unit inventory (quantity_of_units) =====
  const totalUnitsOpen = open.reduce((sum, r) => {
    const q = parseNum(r.quantity_of_units);
    return sum + (q !== null && q > 0 ? q : 0);
  }, 0);
  const rowsWithQty = open.filter((r) => {
    const q = parseNum(r.quantity_of_units);
    return q !== null && q > 0;
  }).length;
  const rowsMissingQty = open.length - rowsWithQty;

  console.log('\n' + '='.repeat(70));
  console.log('UNIT INVENTORY (sum of quantity_of_units per row)');
  console.log('='.repeat(70));
  console.log(`\n  Total units (open Hill Country):     ${totalUnitsOpen}`);
  console.log(`  Database rows with quantity > 0:     ${rowsWithQty} / ${open.length}`);
  if (rowsMissingQty > 0) {
    console.log(`  Rows missing/zero quantity_of_units: ${rowsMissingQty}`);
  }
  console.log(
    '\n  Note: Total is the sum of quantity_of_units across all open rows in the filter.\n' +
      '        Properties with multiple rows (one per unit SKU) contribute each row’s quantity.'
  );

  const unitsByCity = new Map<string, number>();
  for (const r of open) {
    const q = parseNum(r.quantity_of_units);
    if (q === null || q <= 0) continue;
    const cityRaw = (r.city ?? '').trim();
    const cityKey =
      cityRaw.length > 0
        ? cityRaw.charAt(0).toUpperCase() + cityRaw.slice(1).toLowerCase()
        : '(no city)';
    unitsByCity.set(cityKey, (unitsByCity.get(cityKey) ?? 0) + q);
  }
  console.log('\n  Units by city (quantity_of_units):');
  console.log('-'.repeat(60));
  printUnitTotalsMap(unitsByCity, Math.max(1, totalUnitsOpen), '    ');

  const unitsByUnitType = new Map<string, number>();
  for (const r of open) {
    addQuantityToUnitTypeMap(unitsByUnitType, r);
  }
  console.log('\n  Units by unit type (quantity_of_units; split across comma-separated types):');
  console.log('-'.repeat(60));
  printUnitTotalsMap(unitsByUnitType, Math.max(1, totalUnitsOpen), '    ');

  // ===== SECTION: City Distribution =====
  console.log('\n' + '='.repeat(70));
  console.log('CITY DISTRIBUTION');
  console.log('='.repeat(70));
  const cityMap = countMap(
    open.map((r) => r.city),
    (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  );
  printSortedMap(cityMap, open.length);

  // ===== SECTION: Property Type =====
  console.log('\n' + '='.repeat(70));
  console.log('PROPERTY TYPE DISTRIBUTION');
  console.log('='.repeat(70));
  const propTypeMap = countMap(open.map((r) => r.property_type));
  printSortedMap(propTypeMap, open.length);

  // ===== SECTION: Unit Type =====
  console.log('\n' + '='.repeat(70));
  console.log('UNIT TYPE DISTRIBUTION');
  console.log('='.repeat(70));
  const unitTypeMap = countMap(
    open.map((r) => r.unit_type),
    (s) => s.charAt(0).toUpperCase() + s.slice(1)
  );
  printSortedMap(unitTypeMap, open.length);
  console.log('\n  (Above: row counts by unit_type. See UNIT INVENTORY for quantity_of_units totals.)');

  // ===== SECTION: Rate Analysis =====
  console.log('\n' + '='.repeat(70));
  console.log('RATE ANALYSIS');
  console.log('='.repeat(70));

  const avgRates = open.map(computeAvgRate).filter((r): r is number => r !== null && r > 0);
  avgRates.sort((a, b) => a - b);

  console.log(`\nRecords with rate data: ${avgRates.length} / ${open.length} (${pct(avgRates.length, open.length)})`);

  if (avgRates.length > 0) {
    const sum = avgRates.reduce((a, b) => a + b, 0);
    const mean = sum / avgRates.length;
    const med = median(avgRates);
    const min = avgRates[0];
    const max = avgRates[avgRates.length - 1];
    const p25 = avgRates[Math.floor(avgRates.length * 0.25)];
    const p75 = avgRates[Math.floor(avgRates.length * 0.75)];

    console.log(`\nAverage Daily Rate (overall):`);
    console.log(`  Mean:       ${formatUSD(mean)}`);
    console.log(`  Median:     ${formatUSD(med)}`);
    console.log(`  Min:        ${formatUSD(min)}`);
    console.log(`  Max:        ${formatUSD(max)}`);
    console.log(`  25th %ile:  ${formatUSD(p25)}`);
    console.log(`  75th %ile:  ${formatUSD(p75)}`);
  }

  // Seasonal rate breakdown
  const seasonFields: { label: string; weekday: keyof PropertyRow; weekend: keyof PropertyRow }[] = [
    { label: 'Winter', weekday: 'rate_winter_weekday', weekend: 'rate_winter_weekend' },
    { label: 'Spring', weekday: 'rate_spring_weekday', weekend: 'rate_spring_weekend' },
    { label: 'Summer', weekday: 'rate_summer_weekday', weekend: 'rate_summer_weekend' },
    { label: 'Fall',   weekday: 'rate_fall_weekday',   weekend: 'rate_fall_weekend' },
  ];

  console.log(`\nSeasonal Rate Averages (weekday / weekend):`);
  console.log('-'.repeat(60));
  for (const { label, weekday, weekend } of seasonFields) {
    const wdRates = open.map((r) => parseNum(r[weekday] as string | number | null)).filter((v): v is number => v !== null && v > 0);
    const weRates = open.map((r) => parseNum(r[weekend] as string | number | null)).filter((v): v is number => v !== null && v > 0);
    const wdAvg = wdRates.length > 0 ? wdRates.reduce((a, b) => a + b, 0) / wdRates.length : null;
    const weAvg = weRates.length > 0 ? weRates.reduce((a, b) => a + b, 0) / weRates.length : null;
    console.log(
      `  ${label.padEnd(10)} Weekday: ${wdAvg !== null ? formatUSD(wdAvg).padStart(6) : '   N/A'} (n=${wdRates.length})` +
      `    Weekend: ${weAvg !== null ? formatUSD(weAvg).padStart(6) : '   N/A'} (n=${weRates.length})`
    );
  }

  // Rate category distribution
  console.log(`\nRate Category Distribution:`);
  console.log('-'.repeat(60));
  const rateCatMap = countMap(open.map((r) => r.rate_category));
  printSortedMap(rateCatMap, open.length);

  // Average rate by unit type
  console.log(`\nAverage Daily Rate by Unit Type (top 15):`);
  console.log('-'.repeat(60));
  const rateByUnit = new Map<string, number[]>();
  for (const row of open) {
    const rate = computeAvgRate(row);
    if (rate === null || rate <= 0) continue;
    const types = (row.unit_type ?? 'Unknown').split(',').map((s) => s.trim()).filter(Boolean);
    for (const t of types) {
      const key = t.charAt(0).toUpperCase() + t.slice(1);
      if (!rateByUnit.has(key)) rateByUnit.set(key, []);
      rateByUnit.get(key)!.push(rate);
    }
  }
  const unitRateSummaries = [...rateByUnit.entries()]
    .map(([type, rates]) => ({
      type,
      count: rates.length,
      avg: rates.reduce((a, b) => a + b, 0) / rates.length,
      med: median(rates.sort((a, b) => a - b)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  for (const { type, count, avg, med } of unitRateSummaries) {
    console.log(
      `  ${type.padEnd(30)} n=${String(count).padStart(3)}  avg=${formatUSD(avg).padStart(6)}  med=${formatUSD(med).padStart(6)}`
    );
  }

  // ===== SECTION: Capacity & Scale =====
  console.log('\n' + '='.repeat(70));
  console.log('CAPACITY & SCALE METRICS');
  console.log('='.repeat(70));

  const totalSites = open.map((r) => parseNum(r.property_total_sites)).filter((v): v is number => v !== null && v > 0);
  const unitCounts = open.map((r) => parseNum(r.quantity_of_units)).filter((v): v is number => v !== null && v > 0);

  if (totalSites.length > 0) {
    totalSites.sort((a, b) => a - b);
    console.log(`\nProperty Total Sites:`);
    console.log(`  Mean:   ${(totalSites.reduce((a, b) => a + b, 0) / totalSites.length).toFixed(1)}`);
    console.log(`  Median: ${median(totalSites)}`);
    console.log(`  Min:    ${totalSites[0]}`);
    console.log(`  Max:    ${totalSites[totalSites.length - 1]}`);
    console.log(`  (n=${totalSites.length})`);
  }

  if (unitCounts.length > 0) {
    unitCounts.sort((a, b) => a - b);
    console.log(`\nQuantity of Units (per row — distribution):`);
    console.log(`  Sum across rows: ${totalUnitsOpen} (same as UNIT INVENTORY total)`);
    console.log(`  Mean per row:    ${(unitCounts.reduce((a, b) => a + b, 0) / unitCounts.length).toFixed(1)}`);
    console.log(`  Median per row:  ${median(unitCounts)}`);
    console.log(`  Min:             ${unitCounts[0]}`);
    console.log(`  Max:             ${unitCounts[unitCounts.length - 1]}`);
    console.log(`  (n=${unitCounts.length} rows with quantity > 0)`);
  }

  // Minimum nights
  const minNights = open.map((r) => parseNum(r.minimum_nights)).filter((v): v is number => v !== null && v > 0);
  if (minNights.length > 0) {
    minNights.sort((a, b) => a - b);
    console.log(`\nMinimum Nights:`);
    console.log(`  Mean:   ${(minNights.reduce((a, b) => a + b, 0) / minNights.length).toFixed(1)}`);
    console.log(`  Median: ${median(minNights)}`);
    console.log(`  (n=${minNights.length})`);
  }

  // ===== SECTION: Unit Amenities =====
  printAmenityTable(
    '='.repeat(70) + '\nUNIT-LEVEL AMENITIES\n' + '='.repeat(70),
    [
      { name: 'WiFi', key: 'unit_wifi' },
      { name: 'Air Conditioning', key: 'unit_air_conditioning' },
      { name: 'Private Bathroom', key: 'unit_private_bathroom' },
      { name: 'Full Kitchen', key: 'unit_full_kitchen' },
      { name: 'Kitchenette', key: 'unit_kitchenette' },
      { name: 'Hot Tub (unit)', key: 'unit_hot_tub' },
      { name: 'Hot Tub or Sauna (unit)', key: 'unit_hot_tub_or_sauna' },
      { name: 'Pets Allowed', key: 'unit_pets' },
      { name: 'Patio/Deck', key: 'unit_patio' },
      { name: 'Campfires', key: 'unit_campfires' },
      { name: 'Shower', key: 'unit_shower' },
      { name: 'Electricity', key: 'unit_electricity' },
      { name: 'Bed', key: 'unit_bed' },
    ],
    open
  );

  // ===== SECTION: Property Amenities =====
  printAmenityTable(
    '\n' + '='.repeat(70) + '\nPROPERTY-LEVEL AMENITIES\n' + '='.repeat(70),
    [
      { name: 'Pool', key: 'property_pool' },
      { name: 'Hot Tub (property)', key: 'property_hot_tub' },
      { name: 'Food On-Site', key: 'property_food_on_site' },
      { name: 'Restaurant', key: 'property_restaurant' },
      { name: 'Waterfront', key: 'property_waterfront' },
      { name: 'Family Friendly', key: 'property_family_friendly' },
      { name: 'Playground', key: 'property_playground' },
      { name: 'Dog Park', key: 'property_dog_park' },
      { name: 'General Store', key: 'property_general_store' },
      { name: 'Laundry', key: 'property_laundry' },
      { name: 'Fitness Room', key: 'property_fitness_room' },
    ],
    open
  );

  // ===== SECTION: Activities =====
  printAmenityTable(
    '\n' + '='.repeat(70) + '\nACTIVITIES\n' + '='.repeat(70),
    [
      { name: 'Hiking', key: 'activities_hiking' },
      { name: 'Fishing', key: 'activities_fishing' },
      { name: 'Swimming', key: 'activities_swimming' },
      { name: 'Horseback Riding', key: 'activities_horseback_riding' },
      { name: 'Biking', key: 'activities_biking' },
      { name: 'Stargazing', key: 'activities_stargazing' },
      { name: 'Canoeing/Kayaking', key: 'activities_canoeing_kayaking' },
      { name: 'Wildlife Watching', key: 'activities_wildlife_watching' },
    ],
    open
  );

  // ===== SECTION: Setting =====
  printAmenityTable(
    '\n' + '='.repeat(70) + '\nSETTING / LANDSCAPE\n' + '='.repeat(70),
    [
      { name: 'Ranch', key: 'setting_ranch' },
      { name: 'Lake', key: 'setting_lake' },
      { name: 'Forest', key: 'setting_forest' },
      { name: 'River/Stream/Creek', key: 'river_stream_or_creek' },
    ],
    open
  );

  // ===== SECTION: Quality Scores =====
  console.log('\n' + '='.repeat(70));
  console.log('QUALITY SCORES');
  console.log('='.repeat(70));
  const qScores = open.map((r) => r.quality_score).filter((v): v is number => v !== null);
  if (qScores.length > 0) {
    qScores.sort((a, b) => a - b);
    console.log(`  Mean:       ${(qScores.reduce((a, b) => a + b, 0) / qScores.length).toFixed(1)}`);
    console.log(`  Median:     ${median(qScores).toFixed(1)}`);
    console.log(`  Min:        ${qScores[0]}`);
    console.log(`  Max:        ${qScores[qScores.length - 1]}`);
    console.log(`  (n=${qScores.length})`);
  } else {
    console.log('  No quality scores available');
  }

  // ===== SECTION: Website Coverage =====
  console.log('\n' + '='.repeat(70));
  console.log('DATA COMPLETENESS');
  console.log('='.repeat(70));
  const hasUrl = open.filter((r) => r.url && r.url.trim().length > 0).length;
  const hasRate = avgRates.length;
  const hasUnitType = open.filter((r) => r.unit_type && r.unit_type.trim().length > 0).length;
  const hasCoords = open.filter((r) => parseNum(r.lat) !== null && parseNum(r.lon) !== null).length;
  const hasPropertyType = open.filter((r) => r.property_type && r.property_type.trim().length > 0).length;
  const hasQty = rowsWithQty;

  console.log(`  Website URL:      ${hasUrl} / ${open.length}  (${pct(hasUrl, open.length)})`);
  console.log(`  Rate Data:        ${hasRate} / ${open.length}  (${pct(hasRate, open.length)})`);
  console.log(`  Unit Type:        ${hasUnitType} / ${open.length}  (${pct(hasUnitType, open.length)})`);
  console.log(`  quantity_of_units:${hasQty} / ${open.length}  (${pct(hasQty, open.length)})`);
  console.log(`  Coordinates:      ${hasCoords} / ${open.length}  (${pct(hasCoords, open.length)})`);
  console.log(`  Property Type:    ${hasPropertyType} / ${open.length}  (${pct(hasPropertyType, open.length)})`);

  // ===== SECTION: Year Opened =====
  console.log('\n' + '='.repeat(70));
  console.log('YEAR OPENED DISTRIBUTION');
  console.log('='.repeat(70));
  const years = open.map((r) => parseNum(r.year_site_opened)).filter((v): v is number => v !== null && v >= 1990 && v <= 2030);
  if (years.length > 0) {
    const yearMap = new Map<number, number>();
    for (const y of years) {
      yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
    }
    const sortedYears = [...yearMap.entries()].sort((a, b) => a[0] - b[0]);
    for (const [year, count] of sortedYears) {
      const bar = '#'.repeat(Math.min(count, 40));
      console.log(`  ${year}: ${String(count).padStart(3)} ${bar}`);
    }
    console.log(`  (n=${years.length})`);
  }

  // ===== SECTION: Top Properties by Rate =====
  console.log('\n' + '='.repeat(70));
  console.log('TOP 15 PROPERTIES BY AVERAGE DAILY RATE');
  console.log('='.repeat(70));
  const withRates = open
    .map((r) => ({ name: r.property_name, city: r.city, unitType: r.unit_type, rate: computeAvgRate(r) }))
    .filter((r): r is { name: string | null; city: string | null; unitType: string | null; rate: number } => r.rate !== null && r.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 15);

  for (let i = 0; i < withRates.length; i++) {
    const r = withRates[i];
    console.log(
      `  ${String(i + 1).padStart(2)}. ${(r.name ?? 'Unknown').padEnd(40)} ${formatUSD(r.rate).padStart(6)}  ${r.city ?? ''}  (${r.unitType ?? 'N/A'})`
    );
  }

  // ===== Export summary CSV =====
  const csvRows = [
    ['Metric', 'Value'],
    ['Total TX Hill Country records', String(hillCountry.length)],
    ['Open records', String(open.length)],
    ['Closed records', String(closed)],
    ['Unique property names', String(uniqueNames.size)],
    ['Total units (sum quantity_of_units, open)', String(totalUnitsOpen)],
    ['Rows with quantity_of_units > 0', String(rowsWithQty)],
    ['Rows missing/zero quantity_of_units', String(rowsMissingQty)],
    ['Records with rate data', String(avgRates.length)],
    ['Avg daily rate (mean)', avgRates.length > 0 ? formatUSD(avgRates.reduce((a, b) => a + b, 0) / avgRates.length) : 'N/A'],
    ['Avg daily rate (median)', avgRates.length > 0 ? formatUSD(median(avgRates)) : 'N/A'],
    ['Min daily rate', avgRates.length > 0 ? formatUSD(avgRates[0]) : 'N/A'],
    ['Max daily rate', avgRates.length > 0 ? formatUSD(avgRates[avgRates.length - 1]) : 'N/A'],
  ];
  const csvContent = csvRows.map((r) => r.join(',')).join('\n') + '\n';
  fs.writeFileSync('reports-tx-hill-country-analysis.csv', csvContent);
  console.log('\n' + '='.repeat(70));
  console.log('Summary CSV exported to: reports-tx-hill-country-analysis.csv');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
