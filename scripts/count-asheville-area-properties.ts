/**
 * Count properties and units in the Asheville, NC area from all_glamping_properties.
 *
 * Reports several "area" definitions side-by-side so we can pick the one that
 * matches the snapshot (44 properties / 423 units):
 *   1. City exactly "Asheville" (NC)
 *   2. Asheville MSA city list (NC)
 *   3. Radius around downtown Asheville (25 / 50 / 75 mi)
 *
 * "Properties" = unique property_name (case-insensitive, trimmed).
 * "Units"      = SUM(quantity_of_units) across all rows in the area
 *                (counting each row's unit count once per row).
 *
 * Run with: npx tsx scripts/count-asheville-area-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ASHEVILLE_LAT = 35.5951;
const ASHEVILLE_LON = -82.5515;

// Buncombe + adjacent WNC counties typically considered the "Asheville area"
// (Asheville MSA = Buncombe, Haywood, Henderson, Madison; we add a few common
// nearby tourism cities used in WNC marketing).
const ASHEVILLE_AREA_CITIES = new Set(
  [
    'Asheville',
    'Arden',
    'Black Mountain',
    'Candler',
    'Fairview',
    'Fletcher',
    'Hendersonville',
    'Flat Rock',
    'Mills River',
    'Weaverville',
    'Mars Hill',
    'Marshall',
    'Hot Springs',
    'Leicester',
    'Swannanoa',
    'Montreat',
    'Brevard',
    'Pisgah Forest',
    'Rosman',
    'Cedar Mountain',
    'Lake Toxaway',
    'Maggie Valley',
    'Waynesville',
    'Clyde',
    'Canton',
    'Burnsville',
    'Marion',
    'Old Fort',
    'Chimney Rock',
    'Lake Lure',
    'Bat Cave',
    'Saluda',
    'Tryon',
    'Columbus',
    'Mill Spring',
  ].map((c) => c.toLowerCase())
);

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: string | number | null;
  lon: string | number | null;
  quantity_of_units: number | string | null;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normName(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase();
}

function isNC(state: string | null): boolean {
  const s = (state ?? '').trim().toLowerCase();
  return s === 'nc' || s === 'north carolina';
}

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select('id,property_name,city,state,country,lat,lon,quantity_of_units', { count: 'exact' })
      .range(offset, offset + batch - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    if (total === 0 && count !== null) total = count;

    all.push(...(data as Row[]));
    process.stdout.write(`  Fetched ${all.length}${total ? ` / ${total}` : ''} rows\r`);
    if (data.length < batch) break;
    offset += batch;
  }
  process.stdout.write('\n');
  return all;
}

type Bucket = {
  rows: Row[];
};

function summarize(label: string, bucket: Bucket) {
  const uniqueNames = new Set<string>();
  let unitsSum = 0;
  let unitsRowsCount = 0;
  for (const r of bucket.rows) {
    const n = normName(r.property_name);
    if (n) uniqueNames.add(n);
    const u = toNum(r.quantity_of_units);
    if (u !== null) {
      unitsSum += u;
      unitsRowsCount += 1;
    }
  }
  console.log(
    `  ${label.padEnd(46)} rows=${String(bucket.rows.length).padStart(4)}  unique_properties=${String(uniqueNames.size).padStart(4)}  total_units=${String(unitsSum).padStart(5)}  (rows w/ unit count: ${unitsRowsCount})`
  );
}

async function main() {
  console.log('Fetching all_glamping_properties (id, name, city, state, country, lat, lon, quantity_of_units)...');
  const rows = await fetchAll();
  console.log(`Total rows fetched: ${rows.length}\n`);

  const cityExact: Row[] = [];
  const msaCities: Row[] = [];
  const radius25: Row[] = [];
  const radius50: Row[] = [];
  const radius75: Row[] = [];
  const radius100: Row[] = [];

  for (const r of rows) {
    const city = (r.city ?? '').trim().toLowerCase();
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);

    if (city === 'asheville' && isNC(r.state)) cityExact.push(r);
    if (ASHEVILLE_AREA_CITIES.has(city) && isNC(r.state)) msaCities.push(r);

    if (lat !== null && lon !== null) {
      const d = haversineMiles(ASHEVILLE_LAT, ASHEVILLE_LON, lat, lon);
      if (d <= 25) radius25.push(r);
      if (d <= 50) radius50.push(r);
      if (d <= 75) radius75.push(r);
      if (d <= 100) radius100.push(r);
    }
  }

  console.log('=== Asheville Area Counts ===\n');
  summarize('City = "Asheville", NC',                { rows: cityExact });
  summarize('WNC city list (Asheville + neighbors)', { rows: msaCities });
  summarize('Within 25 mi of downtown Asheville',    { rows: radius25 });
  summarize('Within 50 mi of downtown Asheville',    { rows: radius50 });
  summarize('Within 75 mi of downtown Asheville',    { rows: radius75 });
  summarize('Within 100 mi of downtown Asheville',   { rows: radius100 });

  console.log('\n=== Fine radius sweep (10 mi steps) ===');
  for (let r = 10; r <= 150; r += 10) {
    const bucket: Row[] = [];
    for (const row of rows) {
      const lat = toNum(row.lat);
      const lon = toNum(row.lon);
      if (lat === null || lon === null) continue;
      if (haversineMiles(ASHEVILLE_LAT, ASHEVILLE_LON, lat, lon) <= r) {
        bucket.push(row);
      }
    }
    summarize(`Within ${r} mi`, { rows: bucket });
  }

  console.log('\nNotes:');
  console.log(' - "rows" = matching rows in all_glamping_properties (each row is a unit type per property).');
  console.log(' - "unique_properties" = distinct property_name (trimmed, lowercased).');
  console.log(' - "total_units" = SUM(quantity_of_units) across matching rows.');
  console.log(' - Radius uses Haversine distance from downtown Asheville (35.5951, -82.5515) using lat/lon column values.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
