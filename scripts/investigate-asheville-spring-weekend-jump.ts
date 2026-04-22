/**
 * Investigate why the Asheville Spring weekend MEAN jumps from 60 mi to 90 mi.
 *
 * Approach:
 *   1. Pull all rows in the 90 mi radius from Asheville (excluding bad-geo IDs).
 *   2. Tag each row as "in 60 mi" or "in 60-90 mi annulus".
 *   3. Print distribution, top contributors, and the delta breakdown for spring_weekend.
 *
 * Run:
 *   npx tsx scripts/investigate-asheville-spring-weekend-jump.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const ASH_LAT = 35.5951;
const ASH_LON = -82.5515;
const INNER = 60;
const OUTER = 90;

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  lat: string | number | null;
  lon: string | number | null;
  rate_spring_weekday: number | null;
  rate_spring_weekend: number | null;
  rate_avg_retail_daily_rate: number | null;
};

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

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  let offset = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'id,property_name,city,state,unit_type,lat,lon,rate_spring_weekday,rate_spring_weekend,rate_avg_retail_daily_rate'
      )
      .range(offset, offset + batch - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as Row[]));
    if (data.length < batch) break;
    offset += batch;
  }
  return all;
}

function loadBadGeoIds(): Set<number> {
  const path = resolve(process.cwd(), 'scripts/output/geo-sanity-bad-ids.json');
  if (!existsSync(path)) return new Set();
  return new Set(JSON.parse(readFileSync(path, 'utf-8')) as number[]);
}

async function main() {
  const badGeoIds = loadBadGeoIds();
  const all = await fetchAll();
  console.log(`Fetched ${all.length} rows; ${badGeoIds.size} bad-geo excluded.`);

  type Tagged = Row & { miles: number; band: 'inner' | 'annulus' };
  const tagged: Tagged[] = [];
  for (const r of all) {
    if (badGeoIds.has(r.id)) continue;
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    if (lat === null || lon === null) continue;
    const miles = haversineMiles(ASH_LAT, ASH_LON, lat, lon);
    if (miles > OUTER) continue;
    tagged.push({
      ...r,
      miles,
      band: miles <= INNER ? 'inner' : 'annulus',
    });
  }

  const inner = tagged.filter((r) => r.band === 'inner');
  const annulus = tagged.filter((r) => r.band === 'annulus');
  console.log(`In 0-${INNER}mi:   ${inner.length} rows`);
  console.log(`In ${INNER}-${OUTER}mi:  ${annulus.length} rows`);
  console.log(`In 0-${OUTER}mi:   ${tagged.length} rows`);

  // Spring weekend
  const innerSpring = inner.filter((r) => r.rate_spring_weekend !== null);
  const annulusSpring = annulus.filter((r) => r.rate_spring_weekend !== null);
  const outerSpring = tagged.filter((r) => r.rate_spring_weekend !== null);

  const innerVals = innerSpring.map((r) => r.rate_spring_weekend as number);
  const annulusVals = annulusSpring.map((r) => r.rate_spring_weekend as number);
  const outerVals = outerSpring.map((r) => r.rate_spring_weekend as number);

  console.log(`\n=== Spring weekend rate, by band ===`);
  const fmtRow = (label: string, vals: number[]) =>
    console.log(
      `  ${label.padEnd(18)} n=${String(vals.length).padStart(3)}  median=$${(median(vals) ?? 0).toFixed(0).padStart(4)}  mean=$${(mean(vals) ?? 0).toFixed(0).padStart(4)}  sd=$${(stddev(vals) ?? 0).toFixed(0).padStart(4)}  min=$${Math.min(...vals)}  max=$${Math.max(...vals)}`
    );
  fmtRow(`0-${INNER}mi (inner)`, innerVals);
  fmtRow(`${INNER}-${OUTER}mi (annulus)`, annulusVals);
  fmtRow(`0-${OUTER}mi (full 90)`, outerVals);

  const meanDelta = (mean(outerVals) ?? 0) - (mean(innerVals) ?? 0);
  console.log(`\nMean shift from 60→90mi: ${meanDelta >= 0 ? '+' : ''}$${meanDelta.toFixed(0)}`);

  // Annulus contributors sorted by spring_weekend rate descending
  console.log(`\n=== All ${INNER}-${OUTER}mi spring-weekend rows (newly added by 90mi cut) ===`);
  const sorted = [...annulusSpring].sort(
    (a, b) => (b.rate_spring_weekend as number) - (a.rate_spring_weekend as number)
  );
  console.log('  rate     mi   property | city, state | unit_type');
  for (const r of sorted) {
    console.log(
      `  $${String(Math.round(r.rate_spring_weekend as number)).padStart(5)}  ${r.miles.toFixed(0).padStart(3)}   ${(r.property_name ?? 'Unknown').padEnd(45)} | ${r.city ?? '?'}, ${r.state ?? '?'} | ${r.unit_type ?? ''}`
    );
  }

  // Aggregate by property in annulus (mean rate per property)
  console.log(`\n=== Annulus aggregated by property (avg of unit-type rows) ===`);
  const byProp = new Map<string, { rates: number[]; miles: number; city: string; state: string }>();
  for (const r of annulusSpring) {
    const key = (r.property_name ?? 'Unknown').trim();
    const e = byProp.get(key) ?? { rates: [], miles: r.miles, city: r.city ?? '?', state: r.state ?? '?' };
    e.rates.push(r.rate_spring_weekend as number);
    byProp.set(key, e);
  }
  const propRows = [...byProp.entries()]
    .map(([name, e]) => ({ name, mean: mean(e.rates)!, n: e.rates.length, miles: e.miles, city: e.city, state: e.state }))
    .sort((a, b) => b.mean - a.mean);
  console.log('  prop_mean  n   mi   property | city, state');
  for (const p of propRows) {
    console.log(
      `  $${String(Math.round(p.mean)).padStart(6)}    ${String(p.n).padStart(2)}  ${p.miles.toFixed(0).padStart(3)}   ${p.name.padEnd(45)} | ${p.city}, ${p.state}`
    );
  }

  // Top 10 highest spring-weekend rows in inner cohort vs annulus cohort
  console.log(`\n=== Top 10 highest spring-weekend rows in inner 60mi cohort ===`);
  const innerSorted = [...innerSpring].sort(
    (a, b) => (b.rate_spring_weekend as number) - (a.rate_spring_weekend as number)
  );
  for (const r of innerSorted.slice(0, 10)) {
    console.log(
      `  $${String(Math.round(r.rate_spring_weekend as number)).padStart(5)}  ${r.miles.toFixed(0).padStart(3)}   ${(r.property_name ?? 'Unknown').padEnd(45)} | ${r.city ?? '?'}, ${r.state ?? '?'} | ${r.unit_type ?? ''}`
    );
  }

  // Sensitivity: what does the 90mi mean look like if we trim the top property in annulus?
  console.log(`\n=== Sensitivity: what drives the +$${meanDelta.toFixed(0)} shift? ===`);
  const above500 = annulusVals.filter((v) => v >= 500);
  const below500 = annulusVals.filter((v) => v < 500);
  console.log(
    `  Annulus rows ≥$500: n=${above500.length}, mean=$${mean(above500)?.toFixed(0) ?? 'n/a'}`
  );
  console.log(
    `  Annulus rows <$500: n=${below500.length}, mean=$${mean(below500)?.toFixed(0) ?? 'n/a'}`
  );
  // What if annulus's >$500 rows were excluded from the 90mi cohort?
  const trimmedOuter = outerVals.filter((v, i) => {
    // build trimmed by removing annulus values >=500
    return true;
  });
  const cleanedOuter = innerVals.concat(below500);
  console.log(
    `  90mi mean if we exclude annulus ≥$500: $${mean(cleanedOuter)?.toFixed(0) ?? 'n/a'} (n=${cleanedOuter.length})`
  );

  // Top property contribution: drop the top-N properties from annulus and re-mean
  for (const dropN of [1, 2, 3, 5]) {
    const dropSet = new Set(propRows.slice(0, dropN).map((p) => p.name));
    const cleanedAnnulusVals = annulusSpring
      .filter((r) => !dropSet.has((r.property_name ?? '').trim()))
      .map((r) => r.rate_spring_weekend as number);
    const cleanedFull = innerVals.concat(cleanedAnnulusVals);
    console.log(
      `  Drop top ${dropN} annulus properties → 90mi mean=$${mean(cleanedFull)?.toFixed(0) ?? 'n/a'} (n=${cleanedFull.length})`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
