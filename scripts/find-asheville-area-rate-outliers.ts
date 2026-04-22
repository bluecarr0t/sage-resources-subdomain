/**
 * Find low/high rate outliers in the Asheville area (default 60 mi radius)
 * from all_glamping_properties.
 *
 * Reports for avg retail daily rate and each season weekday/weekend rate:
 *   - Mean, median, stdev
 *   - 5 lowest values with property name + city + unit_type
 *   - 5 highest values with property name + city + unit_type
 *   - Statistical outliers (|z-score| > 2 OR outside 1.5 * IQR fences)
 *
 * Run with: npx tsx scripts/find-asheville-area-rate-outliers.ts
 *   or:    npx tsx scripts/find-asheville-area-rate-outliers.ts --radius=75
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
const radiusArg = process.argv.find((a) => a.startsWith('--radius='));
const RADIUS_MI = radiusArg ? Number(radiusArg.split('=')[1]) : 60;

const RATE_COLS = [
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;
type RateCol = (typeof RATE_COLS)[number];

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  lat: string | number | null;
  lon: string | number | null;
} & Record<RateCol, number | null>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function fmt(n: number): string {
  return `$${n.toFixed(0)}`;
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select(
        `id,property_name,city,state,unit_type,lat,lon,${RATE_COLS.join(',')}`,
        { count: 'exact' }
      )
      .range(offset, offset + batch - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    if (total === 0 && count !== null) total = count;

    for (const r of data as Record<string, unknown>[]) {
      const row: Row = {
        id: Number(r.id),
        property_name: (r.property_name as string | null) ?? null,
        city: (r.city as string | null) ?? null,
        state: (r.state as string | null) ?? null,
        unit_type: (r.unit_type as string | null) ?? null,
        lat: r.lat as string | number | null,
        lon: r.lon as string | number | null,
      } as Row;
      for (const c of RATE_COLS) row[c] = toNum(r[c]);
      all.push(row);
    }

    process.stdout.write(`  Fetched ${all.length}${total ? ` / ${total}` : ''} rows\r`);
    if (data.length < batch) break;
    offset += batch;
  }
  process.stdout.write('\n');
  return all;
}

function describeRow(r: Row, val: number): string {
  const name = (r.property_name ?? 'Unknown').slice(0, 40).padEnd(40);
  const city = `${r.city ?? '?'}, ${r.state ?? '?'}`.slice(0, 22).padEnd(22);
  const unit = (r.unit_type ?? '-').slice(0, 18).padEnd(18);
  return `    ${fmt(val).padStart(7)}   ${name}  ${city}  ${unit}  id=${r.id}`;
}

function analyzeColumn(label: string, col: RateCol, inArea: Row[]) {
  const valued = inArea
    .map((r) => ({ r, v: r[col] }))
    .filter((x): x is { r: Row; v: number } => x.v !== null && x.v > 0);

  if (valued.length === 0) {
    console.log(`\n--- ${label} --- (no data)`);
    return;
  }

  const values = valued.map((x) => x.v);
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;

  console.log(`\n--- ${label} (n=${n}) ---`);
  console.log(
    `  mean=${fmt(mean)}  median=${fmt(median)}  stdev=${fmt(stdev)}  min=${fmt(sorted[0])}  max=${fmt(sorted[n - 1])}  Q1=${fmt(q1)}  Q3=${fmt(q3)}  IQR fences=[${fmt(lowFence)}, ${fmt(highFence)}]`
  );

  const sortedAsc = [...valued].sort((a, b) => a.v - b.v);
  console.log('  5 lowest:');
  for (const x of sortedAsc.slice(0, 5)) console.log(describeRow(x.r, x.v));
  console.log('  5 highest:');
  for (const x of sortedAsc.slice(-5).reverse()) console.log(describeRow(x.r, x.v));

  const lowOutliers = valued.filter((x) => x.v < lowFence || (stdev > 0 && (x.v - mean) / stdev < -2));
  const highOutliers = valued.filter((x) => x.v > highFence || (stdev > 0 && (x.v - mean) / stdev > 2));

  if (lowOutliers.length > 0) {
    console.log(`  LOW OUTLIERS (< ${fmt(lowFence)} or z<-2): ${lowOutliers.length}`);
    for (const x of [...lowOutliers].sort((a, b) => a.v - b.v)) {
      const z = stdev > 0 ? ((x.v - mean) / stdev).toFixed(2) : 'n/a';
      console.log(describeRow(x.r, x.v) + `   z=${z}`);
    }
  }
  if (highOutliers.length > 0) {
    console.log(`  HIGH OUTLIERS (> ${fmt(highFence)} or z>2): ${highOutliers.length}`);
    for (const x of [...highOutliers].sort((a, b) => b.v - a.v)) {
      const z = stdev > 0 ? ((x.v - mean) / stdev).toFixed(2) : 'n/a';
      console.log(describeRow(x.r, x.v) + `   z=${z}`);
    }
  }
}

async function main() {
  console.log(
    `Fetching all_glamping_properties and filtering to <= ${RADIUS_MI} mi from Asheville (${ASHEVILLE_LAT}, ${ASHEVILLE_LON})...`
  );
  const allRows = await fetchAll();

  const inArea = allRows.filter((r) => {
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat === null || lon === null) return false;
    return haversineMiles(ASHEVILLE_LAT, ASHEVILLE_LON, lat, lon) <= RADIUS_MI;
  });

  console.log(`In-area rows: ${inArea.length}\n`);
  console.log(`Outlier rules: outside 1.5*IQR fences OR |z-score| > 2`);

  analyzeColumn('Avg Retail Daily Rate', 'rate_avg_retail_daily_rate', inArea);
  analyzeColumn('Winter Weekday', 'rate_winter_weekday', inArea);
  analyzeColumn('Winter Weekend', 'rate_winter_weekend', inArea);
  analyzeColumn('Spring Weekday', 'rate_spring_weekday', inArea);
  analyzeColumn('Spring Weekend', 'rate_spring_weekend', inArea);
  analyzeColumn('Summer Weekday', 'rate_summer_weekday', inArea);
  analyzeColumn('Summer Weekend', 'rate_summer_weekend', inArea);
  analyzeColumn('Fall Weekday', 'rate_fall_weekday', inArea);
  analyzeColumn('Fall Weekend', 'rate_fall_weekend', inArea);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
