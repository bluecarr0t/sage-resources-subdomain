/**
 * Generic area rate-metrics calculator. Computes the same metrics as the
 * Asheville-area script for any geographic center, so two markets can be
 * compared head-to-head.
 *
 * Metrics (median-led, mean alongside):
 *   1. Avg. retail daily rate
 *   2. Weekday rates per season
 *   3. Weekend rates per season
 *   4. Avg. weekend premium (weekend - weekday) per season + overall
 *
 * Excludes rows flagged by audit-geo-sanity-glamping-properties.ts.
 *
 * Built-in markets (preset by --market=NAME):
 *   asheville         (Asheville, NC: 35.5951, -82.5515)
 *   texas-hill-country (Fredericksburg, TX: 30.2752, -98.8719)
 *
 * Or provide --lat / --lon / --label / --radius directly.
 *
 * Run with:
 *   npx tsx scripts/calculate-area-rate-metrics.ts --market=texas-hill-country --radius=60
 *   npx tsx scripts/calculate-area-rate-metrics.ts --market=asheville --radius=60
 *   npx tsx scripts/calculate-area-rate-metrics.ts --lat=44.6 --lon=-71.6 --label='White Mtns NH' --radius=50
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Market = { label: string; lat: number; lon: number };
const MARKETS: Record<string, Market> = {
  asheville: { label: 'Asheville, NC', lat: 35.5951, lon: -82.5515 },
  'texas-hill-country': { label: 'Texas Hill Country (Fredericksburg, TX)', lat: 30.2752, lon: -98.8719 },
};

function getArg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}

const marketArg = getArg('market');
const latArg = getArg('lat');
const lonArg = getArg('lon');
const labelArg = getArg('label');
const radiusArg = getArg('radius');

let CENTER: Market;
if (marketArg) {
  if (!MARKETS[marketArg]) {
    console.error(`Unknown market "${marketArg}". Known: ${Object.keys(MARKETS).join(', ')}`);
    process.exit(1);
  }
  CENTER = MARKETS[marketArg];
} else if (latArg && lonArg) {
  CENTER = {
    label: labelArg ?? `(${latArg}, ${lonArg})`,
    lat: Number(latArg),
    lon: Number(lonArg),
  };
} else {
  console.error('Provide --market=NAME or --lat=NN --lon=NN [--label="..."]');
  process.exit(1);
}

const RADIUS_MI = radiusArg ? Number(radiusArg) : 60;

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
  return n === null ? 'n/a' : `$${n.toFixed(0)}`;
}

function fmtMoneySigned(n: number | null): string {
  if (n === null) return 'n/a';
  const sign = n >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(n).toFixed(0)}`;
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
      console.error(error);
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

function loadBadGeoIds(): Set<number> {
  const path = resolve(process.cwd(), 'scripts/output/geo-sanity-bad-ids.json');
  if (!existsSync(path)) return new Set();
  return new Set(JSON.parse(readFileSync(path, 'utf-8')) as number[]);
}

type Cohort = {
  rows: Row[];
  uniqueProps: number;
  totalUnits: number;
  retail: number[];
  weekday: Record<Season, number[]>;
  weekend: Record<Season, number[]>;
  premiums: Record<Season, number[]>;
};

function buildCohort(rows: Row[]): Cohort {
  const uniqueProps = new Set<string>();
  let totalUnits = 0;
  const retail: number[] = [];
  const weekday: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const weekend: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const premiums: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  for (const r of rows) {
    if (r.property_name) uniqueProps.add(r.property_name.trim().toLowerCase());
    const u = toNum(r.quantity_of_units);
    if (u !== null) totalUnits += u;
    if (r.rate_avg_retail_daily_rate !== null) retail.push(r.rate_avg_retail_daily_rate);
    for (const s of SEASONS) {
      const wd = r[`rate_${s}_weekday` as keyof Row] as number | null;
      const we = r[`rate_${s}_weekend` as keyof Row] as number | null;
      if (wd !== null) weekday[s].push(wd);
      if (we !== null) weekend[s].push(we);
      if (wd !== null && we !== null) premiums[s].push(we - wd);
    }
  }
  return { rows, uniqueProps: uniqueProps.size, totalUnits, retail, weekday, weekend, premiums };
}

function printCohort(label: string, c: Cohort) {
  console.log(`\n========== ${label} ==========`);
  console.log(`rows=${c.rows.length}  unique properties=${c.uniqueProps}  total units=${c.totalUnits}\n`);
  const printLine = (label: string, values: number[], signed = false) => {
    const fmt = signed ? fmtMoneySigned : fmtMoney;
    console.log(
      `  ${label.padEnd(24)} median=${fmt(median(values)).padStart(7)}  mean=${fmt(avg(values)).padStart(7)}  n=${values.length}`
    );
  };
  console.log('1. Avg. Retail Daily Rate');
  printLine('Avg retail daily rate', c.retail);
  console.log('\n2. Weekday Rates per Season');
  for (const s of SEASONS) printLine(`${s} weekday`, c.weekday[s]);
  console.log('\n3. Weekend Rates per Season');
  for (const s of SEASONS) printLine(`${s} weekend`, c.weekend[s]);
  console.log('\n4. Avg. Weekend Premium (weekend - weekday)');
  const all: number[] = [];
  for (const s of SEASONS) {
    printLine(`${s} premium`, c.premiums[s], true);
    all.push(...c.premiums[s]);
  }
  printLine('OVERALL premium', all, true);
}

function summary(c: Cohort) {
  return {
    rows: c.rows.length,
    unique_properties: c.uniqueProps,
    total_units: c.totalUnits,
    avg_retail_daily_rate: { median: round(median(c.retail)), mean: round(avg(c.retail)), n: c.retail.length },
    weekday_per_season: Object.fromEntries(
      SEASONS.map((s) => [s, { median: round(median(c.weekday[s])), mean: round(avg(c.weekday[s])), n: c.weekday[s].length }])
    ),
    weekend_per_season: Object.fromEntries(
      SEASONS.map((s) => [s, { median: round(median(c.weekend[s])), mean: round(avg(c.weekend[s])), n: c.weekend[s].length }])
    ),
    weekend_premium_per_season: Object.fromEntries(
      SEASONS.map((s) => [s, { median: round(median(c.premiums[s])), mean: round(avg(c.premiums[s])), n: c.premiums[s].length }])
    ),
  };
}

function round(n: number | null): number | null {
  return n === null ? null : Math.round(n);
}

async function main() {
  console.log(
    `Market: ${CENTER.label}  |  center=(${CENTER.lat}, ${CENTER.lon})  |  radius=${RADIUS_MI} mi`
  );
  const badGeoIds = loadBadGeoIds();
  console.log(`Loaded ${badGeoIds.size} bad-geo IDs to exclude.`);

  const allRows = await fetchAll();
  const inArea = allRows.filter((r) => {
    if (badGeoIds.has(r.id)) return false;
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat === null || lon === null) return false;
    return haversineMiles(CENTER.lat, CENTER.lon, lat, lon) <= RADIUS_MI;
  });
  console.log(`In-area rows: ${inArea.length}`);

  // Top property names (helpful for spotting outliers)
  const propRowCounts = new Map<string, number>();
  for (const r of inArea) {
    const k = (r.property_name ?? 'Unknown').trim();
    propRowCounts.set(k, (propRowCounts.get(k) ?? 0) + 1);
  }
  const topProps = [...propRowCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`\nTop properties by row count (in-area):`);
  for (const [name, n] of topProps) console.log(`  ${String(n).padStart(3)}  ${name}`);

  const cohort = buildCohort(inArea);
  printCohort(`${CENTER.label} (≤ ${RADIUS_MI} mi)`, cohort);

  console.log('\n=== JSON Summary ===');
  console.log(
    JSON.stringify(
      {
        market: CENTER.label,
        center: { lat: CENTER.lat, lon: CENTER.lon },
        radius_miles: RADIUS_MI,
        ...summary(cohort),
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
