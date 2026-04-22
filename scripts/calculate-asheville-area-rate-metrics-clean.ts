/**
 * Cleaned Asheville-area rate metrics from all_glamping_properties.
 *
 * Improvements over the basic version:
 *   1. Excludes rows flagged by scripts/audit-geo-sanity-glamping-properties.ts
 *      (rows whose lat/lon doesn't match their state/country bbox).
 *   2. Reports BOTH mean and median, with median as the headline number.
 *   3. Reports two cohorts side-by-side:
 *        - Full Asheville cohort (after geo-sanity filter)
 *        - Trimmed cohort (also excludes top outlier properties:
 *          The Glamping Collective, Asheville Glamping)
 *
 * Default radius: 60 miles from downtown Asheville.
 *
 * Run with: npx tsx scripts/calculate-asheville-area-rate-metrics-clean.ts
 *   or:    npx tsx scripts/calculate-asheville-area-rate-metrics-clean.ts --radius=75
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
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

// Properties identified as outlier-driving in the prior outlier audit.
// Excluded from the "Trimmed" cohort.
const OUTLIER_PROPERTY_NAMES = new Set(
  ['The Glamping Collective', 'Asheville Glamping'].map((n) => n.toLowerCase())
);

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

function loadBadGeoIds(): Set<number> {
  const path = resolve(process.cwd(), 'scripts/output/geo-sanity-bad-ids.json');
  if (!existsSync(path)) {
    console.warn(`WARNING: ${path} not found. Run audit-geo-sanity-glamping-properties.ts first.`);
    return new Set();
  }
  const ids = JSON.parse(readFileSync(path, 'utf-8')) as number[];
  return new Set(ids);
}

type CohortMetrics = {
  label: string;
  rows: Row[];
  uniqueProps: number;
  totalUnits: number;
  retail: number[];
  weekday: Record<Season, number[]>;
  weekend: Record<Season, number[]>;
  premiums: Record<Season, number[]>;
};

function buildCohort(label: string, rows: Row[]): CohortMetrics {
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
  return { label, rows, uniqueProps: uniqueProps.size, totalUnits, retail, weekday, weekend, premiums };
}

function printCohort(c: CohortMetrics) {
  console.log(`\n========== ${c.label} ==========`);
  console.log(`rows=${c.rows.length}  unique properties=${c.uniqueProps}  total units=${c.totalUnits}\n`);

  const printLine = (label: string, values: number[], signed = false) => {
    const m = avg(values);
    const med = median(values);
    const fmt = signed ? fmtMoneySigned : fmtMoney;
    console.log(
      `  ${label.padEnd(24)} median=${fmt(med).padStart(7)}  mean=${fmt(m).padStart(7)}  n=${values.length}`
    );
  };

  console.log('1. Avg. Retail Daily Rate');
  printLine('Avg retail daily rate', c.retail);

  console.log('\n2. Weekday Rates per Season');
  for (const s of SEASONS) printLine(`${s} weekday`, c.weekday[s]);

  console.log('\n3. Weekend Rates per Season');
  for (const s of SEASONS) printLine(`${s} weekend`, c.weekend[s]);

  console.log('\n4. Avg. Weekend Premium (weekend − weekday)');
  const all: number[] = [];
  for (const s of SEASONS) {
    printLine(`${s} premium`, c.premiums[s], true);
    all.push(...c.premiums[s]);
  }
  printLine('OVERALL premium', all, true);
}

function summaryJson(c: CohortMetrics) {
  return {
    label: c.label,
    rows: c.rows.length,
    unique_properties: c.uniqueProps,
    total_units: c.totalUnits,
    headline: 'medians',
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
    `Fetching all_glamping_properties; filtering to <= ${RADIUS_MI} mi from Asheville (${ASHEVILLE_LAT}, ${ASHEVILLE_LON})`
  );
  const badGeoIds = loadBadGeoIds();
  console.log(`Loaded ${badGeoIds.size} bad-geo IDs to exclude.`);

  const allRows = await fetchAll();

  const inAreaAll = allRows.filter((r) => {
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat === null || lon === null) return false;
    return haversineMiles(ASHEVILLE_LAT, ASHEVILLE_LON, lat, lon) <= RADIUS_MI;
  });

  const inAreaClean = inAreaAll.filter((r) => !badGeoIds.has(r.id));
  const removedByGeo = inAreaAll.length - inAreaClean.length;
  console.log(`Geo-sanity filter removed ${removedByGeo} row(s) from the in-area set.`);

  const trimmedCohort = inAreaClean.filter((r) => {
    const name = (r.property_name ?? '').trim().toLowerCase();
    return !OUTLIER_PROPERTY_NAMES.has(name);
  });
  const removedByOutlier = inAreaClean.length - trimmedCohort.length;
  console.log(`Outlier-property filter removed ${removedByOutlier} row(s) (${[...OUTLIER_PROPERTY_NAMES].join(', ')}).`);

  const full = buildCohort(`Full cohort (≤ ${RADIUS_MI} mi, geo-cleaned)`, inAreaClean);
  const trimmed = buildCohort(`Trimmed cohort (also excl. top outlier properties)`, trimmedCohort);

  printCohort(full);
  printCohort(trimmed);

  console.log('\n=== JSON Summaries ===');
  console.log(JSON.stringify({ full: summaryJson(full), trimmed: summaryJson(trimmed) }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
