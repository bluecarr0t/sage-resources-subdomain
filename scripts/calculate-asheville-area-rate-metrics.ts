/**
 * Calculate rate metrics from all_glamping_properties, scoped to properties
 * within a configurable radius of downtown Asheville, NC.
 *
 *   1. Avg. retail daily rate
 *   2. Weekday rates per season (winter/spring/summer/fall)
 *   3. Weekend rates per season
 *   4. Avg. weekend premium (weekend - weekday) per season + overall
 *
 * Default radius: 110 miles from downtown Asheville (35.5951, -82.5515).
 *
 * Run with: npx tsx scripts/calculate-asheville-area-rate-metrics.ts
 *   or:    npx tsx scripts/calculate-asheville-area-rate-metrics.ts --radius=75
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
const RADIUS_MI = radiusArg ? Number(radiusArg.split('=')[1]) : 110;

const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
  quantity_of_units: number | string | null;
  rate_avg_retail_daily_rate: number | null;
  rate_winter_weekday: number | null;
  rate_winter_weekend: number | null;
  rate_spring_weekday: number | null;
  rate_spring_weekend: number | null;
  rate_summer_weekday: number | null;
  rate_summer_weekend: number | null;
  rate_fall_weekday: number | null;
  rate_fall_weekend: number | null;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtMoney(n: number | null): string {
  return n === null ? 'n/a' : `$${n.toFixed(2)}`;
}

function fmtMoneySigned(n: number | null): string {
  if (n === null) return 'n/a';
  const sign = n >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
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

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select(
        'id,property_name,city,state,lat,lon,quantity_of_units,rate_avg_retail_daily_rate,rate_winter_weekday,rate_winter_weekend,rate_spring_weekday,rate_spring_weekend,rate_summer_weekday,rate_summer_weekend,rate_fall_weekday,rate_fall_weekend',
        { count: 'exact' }
      )
      .range(offset, offset + batch - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    if (total === 0 && count !== null) total = count;

    all.push(
      ...data.map((r) => ({
        id: r.id,
        property_name: r.property_name,
        city: r.city,
        state: r.state,
        lat: r.lat,
        lon: r.lon,
        quantity_of_units: r.quantity_of_units,
        rate_avg_retail_daily_rate: toNum(r.rate_avg_retail_daily_rate),
        rate_winter_weekday: toNum(r.rate_winter_weekday),
        rate_winter_weekend: toNum(r.rate_winter_weekend),
        rate_spring_weekday: toNum(r.rate_spring_weekday),
        rate_spring_weekend: toNum(r.rate_spring_weekend),
        rate_summer_weekday: toNum(r.rate_summer_weekday),
        rate_summer_weekend: toNum(r.rate_summer_weekend),
        rate_fall_weekday: toNum(r.rate_fall_weekday),
        rate_fall_weekend: toNum(r.rate_fall_weekend),
      }))
    );

    process.stdout.write(`  Fetched ${all.length}${total ? ` / ${total}` : ''} rows\r`);
    if (data.length < batch) break;
    offset += batch;
  }
  process.stdout.write('\n');
  return all;
}

function summarize(label: string, values: number[]) {
  const m = avg(values);
  const med = median(values);
  console.log(
    `  ${label.padEnd(24)} avg=${fmtMoney(m).padStart(9)}  median=${fmtMoney(med).padStart(9)}  n=${values.length}`
  );
}

async function main() {
  console.log(
    `Fetching all_glamping_properties and filtering to <= ${RADIUS_MI} mi from Asheville (${ASHEVILLE_LAT}, ${ASHEVILLE_LON})...`
  );
  const allRows = await fetchAll();
  console.log(`Total rows fetched: ${allRows.length}`);

  const inArea = allRows.filter((r) => {
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat === null || lon === null) return false;
    return haversineMiles(ASHEVILLE_LAT, ASHEVILLE_LON, lat, lon) <= RADIUS_MI;
  });

  const uniqueProps = new Set<string>();
  let unitsSum = 0;
  for (const r of inArea) {
    if (r.property_name) uniqueProps.add(r.property_name.trim().toLowerCase());
    const u = toNum(r.quantity_of_units);
    if (u !== null) unitsSum += u;
  }

  console.log(
    `In-area rows: ${inArea.length}  |  unique properties: ${uniqueProps.size}  |  total units (Σ quantity_of_units): ${unitsSum}\n`
  );

  const weekday: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const weekend: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const premiums: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const avgRetail: number[] = [];

  for (const r of inArea) {
    if (r.rate_avg_retail_daily_rate !== null) avgRetail.push(r.rate_avg_retail_daily_rate);
    for (const s of SEASONS) {
      const wd = r[`rate_${s}_weekday` as keyof Row] as number | null;
      const we = r[`rate_${s}_weekend` as keyof Row] as number | null;
      if (wd !== null) weekday[s].push(wd);
      if (we !== null) weekend[s].push(we);
      if (wd !== null && we !== null) premiums[s].push(we - wd);
    }
  }

  console.log(`=== Asheville Area (≤ ${RADIUS_MI} mi) ===\n`);

  console.log('1. Avg. Retail Daily Rate');
  summarize('Avg retail daily rate', avgRetail);

  console.log('\n2. Weekday Rates per Season');
  for (const s of SEASONS) summarize(`${s} weekday`, weekday[s]);

  console.log('\n3. Weekend Rates per Season');
  for (const s of SEASONS) summarize(`${s} weekend`, weekend[s]);

  console.log('\n4. Avg. Weekend Premium per Season (weekend - weekday)');
  const allPremiums: number[] = [];
  for (const s of SEASONS) {
    const m = avg(premiums[s]);
    const med = median(premiums[s]);
    console.log(
      `  ${(s + ' premium').padEnd(24)} avg=${fmtMoneySigned(m).padStart(9)}  median=${fmtMoneySigned(med).padStart(9)}  n=${premiums[s].length}`
    );
    allPremiums.push(...premiums[s]);
  }
  const overallPremiumAvg = avg(allPremiums);
  const overallPremiumMed = median(allPremiums);
  console.log(
    `\n  ${'OVERALL premium'.padEnd(24)} avg=${fmtMoneySigned(overallPremiumAvg).padStart(9)}  median=${fmtMoneySigned(overallPremiumMed).padStart(9)}  n=${allPremiums.length}`
  );

  console.log('\n=== Summary (rounded, for graphics) ===');
  console.log(
    JSON.stringify(
      {
        area: {
          center: { city: 'Asheville, NC', lat: ASHEVILLE_LAT, lon: ASHEVILLE_LON },
          radius_miles: RADIUS_MI,
          rows_in_area: inArea.length,
          unique_properties: uniqueProps.size,
          total_units: unitsSum,
        },
        avg_retail_daily_rate: avgRetail.length ? Math.round(avg(avgRetail)!) : null,
        weekday_per_season: Object.fromEntries(
          SEASONS.map((s) => [s, weekday[s].length ? Math.round(avg(weekday[s])!) : null])
        ),
        weekend_per_season: Object.fromEntries(
          SEASONS.map((s) => [s, weekend[s].length ? Math.round(avg(weekend[s])!) : null])
        ),
        weekend_premium_per_season: Object.fromEntries(
          SEASONS.map((s) => [s, premiums[s].length ? Math.round(avg(premiums[s])!) : null])
        ),
        overall_weekend_premium: overallPremiumAvg !== null ? Math.round(overallPremiumAvg) : null,
        sample_sizes: {
          avg_retail_daily_rate: avgRetail.length,
          weekday_per_season: Object.fromEntries(SEASONS.map((s) => [s, weekday[s].length])),
          weekend_per_season: Object.fromEntries(SEASONS.map((s) => [s, weekend[s].length])),
          weekend_premium_per_season: Object.fromEntries(
            SEASONS.map((s) => [s, premiums[s].length])
          ),
        },
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
