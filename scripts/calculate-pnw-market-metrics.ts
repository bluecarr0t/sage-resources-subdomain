/**
 * Pacific Northwest (Oregon + Washington) glamping market metrics for Field Intelligence posts.
 *
 * Aligns with scripts/calculate-asheville-area-rate-metrics-clean.ts methodology:
 * - Published, open glamping rows only
 * - Median as headline; mean alongside
 * - Retail columns from all_glamping_properties
 * - Optional geo-sanity exclusion (scripts/output/geo-sanity-bad-ids.json)
 *
 * Clusters: no DB column — assigned via city keywords + bounding boxes (approximate).
 *
 * Run: npx tsx scripts/calculate-pnw-market-metrics.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { normalizeStateName } from '../lib/location-helpers';

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

const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];

const SEASON_LABEL: Record<Season, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
};

/** Flag cells with n < this */
const SAMPLE_WARN_THRESHOLD = 15;

type PnwCluster =
  | 'Columbia River Gorge'
  | 'Mount Hood / Willamette corridor'
  | 'Central Oregon'
  | 'Oregon Coast'
  | 'Olympic Peninsula'
  | 'Methow Valley / North Cascades'
  | 'Long Beach / SW Washington Coast'
  | 'Mount Rainier gateway'
  | 'San Juan Islands'
  | 'Other / unassigned';

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
  quantity_of_units: number | string | null;
  unit_type: string | null;
  date_added: string | null;
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

function normCity(c: string | null): string {
  return (c ?? '').trim().toLowerCase();
}

function isPnwState(state: string | null): boolean {
  const n = normalizeStateName(state ?? '');
  return n === 'Oregon' || n === 'Washington';
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

/** Linear interpolation percentile (0–100), inclusive method */
function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function weightedMedian(values: number[], weights: number[]): number | null {
  if (values.length !== weights.length || values.length === 0) return null;
  const pairs = values
    .map((v, i) => ({ v, w: Math.max(0, weights[i]) }))
    .filter((x) => x.w > 0 && Number.isFinite(x.v));
  if (pairs.length === 0) return null;
  pairs.sort((a, b) => a.v - b.v);
  const totalW = pairs.reduce((s, x) => s + x.w, 0);
  let cum = 0;
  const half = totalW / 2;
  for (const x of pairs) {
    cum += x.w;
    if (cum >= half) return x.v;
  }
  return pairs[pairs.length - 1].v;
}

/** Expand each observation by unit count (min 1) for unit-weighted stats */
function expandByUnits(values: number[], qtys: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const q = Math.max(1, Math.round(qtys[i] || 1));
    for (let j = 0; j < q; j++) out.push(values[i]);
  }
  return out;
}

function assignCluster(r: Row): PnwCluster {
  const state = normalizeStateName(r.state ?? '');
  const city = normCity(r.city);
  const lat = toNum(r.lat);
  const lon = toNum(r.lon);

  const inBbox = (la: number, lo: number, n: number, s: number, w: number, e: number) =>
    la >= s && la <= n && lo >= w && lo <= e;

  // --- City keyword sets (checked before coarse bboxes) ---
  const gorgeCities = new Set(
    'hood river,white salmon,stevenson,carson,the dalles,mosier,cascade locks,dallesport'.split(',')
  );
  if (gorgeCities.has(city)) return 'Columbia River Gorge';

  const centralOr = new Set(
    'bend,sisters,sunriver,la pine,redmond,terrebonne,powell butte,culver,prineville'.split(',')
  );
  if (state === 'Oregon' && centralOr.has(city)) return 'Central Oregon';

  const methow = new Set('winthrop,twisp,mazama,carlton'.split(','));
  if (methow.has(city)) return 'Methow Valley / North Cascades';

  const rainier = new Set('ashford,enumclaw,packwood,greenwater,elbe,eatonville,wilkeson'.split(','));
  if (state === 'Washington' && rainier.has(city)) return 'Mount Rainier gateway';

  const sanJuan = new Set(
    'friday harbor,eastsound,lopez island,orcas island,deer harbor,roche harbor,lopez,village of eastsound'.split(',')
  );
  if (sanJuan.has(city)) return 'San Juan Islands';

  const olympic = new Set(
    'port angeles,sequim,forks,neah bay,quinault,amanda park,forks'.split(',')
  );
  if (state === 'Washington' && olympic.has(city)) return 'Olympic Peninsula';

  const longBeachWa = new Set('long beach,ilwaco,ocean park,seaview,chinook'.split(','));
  if (state === 'Washington' && longBeachWa.has(city)) return 'Long Beach / SW Washington Coast';

  // --- Bboxes (more specific first) ---
  if (
    lat !== null &&
    lon !== null &&
    inBbox(lat, lon, 48.85, 48.3, -123.35, -122.75) &&
    state === 'Washington'
  ) {
    return 'San Juan Islands';
  }

  if (lat !== null && lon !== null && inBbox(lat, lon, 45.95, 45.45, -122.1, -120.95)) {
    if (state === 'Oregon' || state === 'Washington') return 'Columbia River Gorge';
  }

  if (state === 'Oregon' && lat !== null && lon !== null && lon < -123.55 && lat > 42.3 && lat < 46.35) {
    return 'Oregon Coast';
  }

  if (
    state === 'Washington' &&
    lat !== null &&
    lon !== null &&
    lat >= 46.15 &&
    lat <= 46.65 &&
    lon >= -124.15 &&
    lon <= -123.75
  ) {
    return 'Long Beach / SW Washington Coast';
  }

  if (
    state === 'Washington' &&
    lat !== null &&
    lon !== null &&
    inBbox(lat, lon, 48.35, 47.15, -124.85, -122.85)
  ) {
    return 'Olympic Peninsula';
  }

  if (
    state === 'Washington' &&
    lat !== null &&
    lon !== null &&
    inBbox(lat, lon, 48.75, 48.15, -121.15, -119.35)
  ) {
    return 'Methow Valley / North Cascades';
  }

  if (
    state === 'Oregon' &&
    lat !== null &&
    lon !== null &&
    lat >= 43.55 &&
    lat <= 44.45 &&
    lon >= -122.15 &&
    lon <= -120.35
  ) {
    return 'Central Oregon';
  }

  if (
    state === 'Washington' &&
    lat !== null &&
    lon !== null &&
    inBbox(lat, lon, 47.35, 46.55, -122.45, -121.25)
  ) {
    return 'Mount Rainier gateway';
  }

  // Willamette + Mt Hood corridor: western OR not coast / not central
  if (
    state === 'Oregon' &&
    lat !== null &&
    lon !== null &&
    lat >= 44.15 &&
    lat <= 45.95 &&
    lon >= -123.45 &&
    lon <= -121.25
  ) {
    return 'Mount Hood / Willamette corridor';
  }

  return 'Other / unassigned';
}

function loadBadGeoIds(): Set<number> {
  const path = resolve(process.cwd(), 'scripts/output/geo-sanity-bad-ids.json');
  if (!existsSync(path)) {
    console.warn(`WARNING: ${path} not found — skipping geo-sanity exclusion.`);
    return new Set();
  }
  const ids = JSON.parse(readFileSync(path, 'utf-8')) as number[];
  return new Set(ids);
}

async function fetchPnwRows(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select(
        [
          'id',
          'property_name',
          'city',
          'state',
          'lat',
          'lon',
          'quantity_of_units',
          'unit_type',
          'date_added',
          'rate_avg_retail_daily_rate',
          'rate_winter_weekday',
          'rate_winter_weekend',
          'rate_spring_weekday',
          'rate_spring_weekend',
          'rate_summer_weekday',
          'rate_summer_weekend',
          'rate_fall_weekday',
          'rate_fall_weekend',
        ].join(','),
        { count: 'exact' }
      )
      .eq('is_glamping_property', 'Yes')
      .eq('is_open', 'Yes')
      .eq('research_status', 'published')
      .range(offset, offset + batch - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    if (total === 0 && count !== null) total = count;

    for (const r of data) {
      if (!isPnwState(r.state as string | null)) continue;
      all.push({
        id: r.id as number,
        property_name: r.property_name as string | null,
        city: r.city as string | null,
        state: r.state as string | null,
        lat: r.lat,
        lon: r.lon,
        quantity_of_units: r.quantity_of_units,
        unit_type: r.unit_type as string | null,
        date_added: r.date_added as string | null,
        rate_avg_retail_daily_rate: toNum(r.rate_avg_retail_daily_rate),
        rate_winter_weekday: toNum(r.rate_winter_weekday),
        rate_winter_weekend: toNum(r.rate_winter_weekend),
        rate_spring_weekday: toNum(r.rate_spring_weekday),
        rate_spring_weekend: toNum(r.rate_spring_weekend),
        rate_summer_weekday: toNum(r.rate_summer_weekday),
        rate_summer_weekend: toNum(r.rate_summer_weekend),
        rate_fall_weekday: toNum(r.rate_fall_weekday),
        rate_fall_weekend: toNum(r.rate_fall_weekend),
      });
    }

    process.stdout.write(`  Scanned ${offset + data.length}${total ? ` / ${total}` : ''}\r`);
    if (data.length < batch) break;
    offset += batch;
  }
  process.stdout.write('\n');
  return all;
}

function propertyKey(name: string | null, id: number): string {
  const n = (name ?? '').trim().toLowerCase();
  return n || `__row_${id}__`;
}

function earliestDateForProperty(rows: Row[]): Map<string, Date | null> {
  const m = new Map<string, Date | null>();
  for (const r of rows) {
    const k = propertyKey(r.property_name, r.id);
    const d = r.date_added ? new Date(r.date_added) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const prev = m.get(k);
    if (!prev || d < prev) m.set(k, d);
  }
  return m;
}

function yoyInventoryProxy(earliestByProp: Map<string, Date | null>): {
  propsBefore2024: number;
  propsBefore2025: number;
  propsBefore2026: number;
  newProps2025: number;
  newProps2026: number;
} {
  const cut2024 = new Date('2024-01-01T00:00:00Z');
  const cut2025 = new Date('2025-01-01T00:00:00Z');
  const cut2026 = new Date('2026-01-01T00:00:00Z');

  let propsBefore2024 = 0;
  let propsBefore2025 = 0;
  let propsBefore2026 = 0;
  let newProps2025 = 0;
  let newProps2026 = 0;

  for (const d of earliestByProp.values()) {
    if (!d) continue;
    if (d < cut2024) propsBefore2024++;
    if (d < cut2025) propsBefore2025++;
    if (d < cut2026) propsBefore2026++;
    if (d >= cut2025 && d < cut2026) newProps2025++;
    if (d >= cut2026) newProps2026++;
  }

  return { propsBefore2024, propsBefore2025, propsBefore2026, newProps2025, newProps2026 };
}

function topQuartileMeanRetail(retail: number[]): { threshold: number | null; meanTopQuartile: number | null; n: number } {
  const vals = retail.filter((x) => x > 0).sort((a, b) => a - b);
  if (vals.length === 0) return { threshold: null, meanTopQuartile: null, n: 0 };
  const thresh = percentile(vals, 75);
  if (thresh === null) return { threshold: null, meanTopQuartile: null, n: 0 };
  const top = vals.filter((x) => x >= thresh);
  return { threshold: thresh, meanTopQuartile: avg(top), n: top.length };
}

function meanMedianFlag(mean: number | null, med: number | null, label: string): string | null {
  if (mean === null || med === null || med === 0) return null;
  const ratio = mean / med;
  if (ratio >= 1.25 || ratio <= 0.8) {
    return `${label}: mean (${mean.toFixed(0)}) vs median (${med.toFixed(0)}) — possible luxury skew`;
  }
  return null;
}

function growthLabel(
  yoyPropPct: number | null,
  yoyUnitPct: number | null,
  hasRateHistory: boolean
): string {
  if (yoyPropPct === null) return 'Insufficient data — manual judgment required';
  const parts: string[] = [];
  if (yoyPropPct > 8) parts.push('strong property growth');
  else if (yoyPropPct > 2) parts.push('moderate property growth');
  else if (yoyPropPct < -2) parts.push('contracting property count in DB');
  if (yoyUnitPct !== null) {
    if (yoyUnitPct > 10) parts.push('strong unit growth');
    else if (yoyUnitPct < -5) parts.push('unit count down YOY in DB');
  }
  if (parts.length === 0 && !hasRateHistory) return 'Insufficient data — manual judgment required';
  if (parts.some((p) => p.includes('strong'))) return 'High (proxy: DB inventory)';
  if (parts.some((p) => p.includes('moderate'))) return 'Steady / Growing (proxy: DB inventory)';
  if (parts.some((p) => p.includes('contracting') || p.includes('down'))) return 'Recovering or recalibrating (proxy: DB inventory) — verify manually';
  return 'Steady (weak signal from DB dates — manual judgment recommended)';
}

function fmtUsd(n: number | null, digits = 0): string {
  if (n === null) return 'n/a';
  return `$${n.toFixed(digits)}`;
}

function fmtPrem(n: number | null): string {
  if (n === null) return 'n/a';
  const sign = n >= 0 ? '+' : '−';
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

async function main() {
  const badGeo = loadBadGeoIds();
  console.log(`Geo-sanity exclusion: ${badGeo.size} id(s)\n`);

  const raw = await fetchPnwRows();
  const rows = raw.filter((r) => !badGeo.has(r.id));
  console.log(`PNW published open glamping rows: ${rows.length} (excl. bad geo)\n`);

  const uniqueProps = new Set(rows.map((r) => propertyKey(r.property_name, r.id)));
  let totalUnits = 0;
  for (const r of rows) {
    const u = toNum(r.quantity_of_units);
    totalUnits += u !== null ? Math.max(0, u) : 1;
  }

  const retailVals: number[] = [];
  const retailQty: number[] = [];
  for (const r of rows) {
    if (r.rate_avg_retail_daily_rate === null) continue;
    const q = toNum(r.quantity_of_units);
    const w = q !== null && q > 0 ? q : 1;
    retailVals.push(r.rate_avg_retail_daily_rate);
    retailQty.push(w);
  }

  const medRetailRowWeighted = weightedMedian(retailVals, retailQty);
  const meanRetail = avg(retailVals);
  const medRetailUnweighted = median(retailVals);

  const expandedRetail = expandByUnits(
    retailVals,
    retailQty.map((q) => q)
  );
  const medRetailUnitWeighted = median(expandedRetail);

  const tq = topQuartileMeanRetail(retailVals);

  // Annual premium: median weekend pool minus median weekday pool (all seasons, row-level observations)
  const allWd: number[] = [];
  const allWe: number[] = [];
  const allPremPairs: number[] = [];
  for (const r of rows) {
    for (const s of SEASONS) {
      const wd = r[`rate_${s}_weekday` as keyof Row] as number | null;
      const we = r[`rate_${s}_weekend` as keyof Row] as number | null;
      if (wd !== null) allWd.push(wd);
      if (we !== null) allWe.push(we);
      if (wd !== null && we !== null) allPremPairs.push(we - wd);
    }
  }
  const annualPremMedianPool =
    allWd.length && allWe.length ? (median(allWe) ?? 0) - (median(allWd) ?? 0) : null;
  const annualPremMedianPairs = median(allPremPairs);

  const weekday: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const weekend: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  for (const r of rows) {
    for (const s of SEASONS) {
      const wd = r[`rate_${s}_weekday` as keyof Row] as number | null;
      const we = r[`rate_${s}_weekend` as keyof Row] as number | null;
      if (wd !== null) weekday[s].push(wd);
      if (we !== null) weekend[s].push(we);
    }
  }

  // Cluster × units
  const clusterUnits = new Map<PnwCluster, number>();
  const clusterRetailExpanded = new Map<PnwCluster, number[]>();
  for (const r of rows) {
    const cl = assignCluster(r);
    const q = toNum(r.quantity_of_units);
    const w = q !== null && q > 0 ? q : 1;
    clusterUnits.set(cl, (clusterUnits.get(cl) ?? 0) + w);
    if (r.rate_avg_retail_daily_rate !== null) {
      if (!clusterRetailExpanded.has(cl)) clusterRetailExpanded.set(cl, []);
      for (let i = 0; i < w; i++) clusterRetailExpanded.get(cl)!.push(r.rate_avg_retail_daily_rate);
    }
  }

  const clusterRows: { cluster: PnwCluster; units: number; medianAdr: number | null }[] = [];
  for (const cl of clusterUnits.keys()) {
    const units = clusterUnits.get(cl) ?? 0;
    const rv = clusterRetailExpanded.get(cl) ?? [];
    clusterRows.push({ cluster: cl, units, medianAdr: median(rv) });
  }
  clusterRows.sort((a, b) => b.units - a.units);
  const top5Clusters = clusterRows.slice(0, 5);

  // Unit type mix (unit-weighted)
  const typeUnits = new Map<string, number>();
  const typeRetail = new Map<string, number[]>();
  for (const r of rows) {
    const t = (r.unit_type ?? 'Unknown').trim() || 'Unknown';
    const q = toNum(r.quantity_of_units);
    const w = q !== null && q > 0 ? q : 1;
    typeUnits.set(t, (typeUnits.get(t) ?? 0) + w);
    if (r.rate_avg_retail_daily_rate !== null) {
      if (!typeRetail.has(t)) typeRetail.set(t, []);
      for (let i = 0; i < w; i++) typeRetail.get(t)!.push(r.rate_avg_retail_daily_rate);
    }
  }
  const typeTotal = [...typeUnits.values()].reduce((a, b) => a + b, 0);
  const typeTable = [...typeUnits.entries()]
    .map(([unitType, units]) => ({
      unit_type: unitType,
      units,
      pct: typeTotal ? (100 * units) / typeTotal : 0,
      median_adr: median(typeRetail.get(unitType) ?? []),
    }))
    .sort((a, b) => b.units - a.units);

  const earliestByProp = earliestDateForProperty(rows);
  const yoy = yoyInventoryProxy(earliestByProp);
  const yoyPropPct =
    yoy.propsBefore2024 > 0
      ? ((yoy.propsBefore2025 - yoy.propsBefore2024) / yoy.propsBefore2024) * 100
      : null;

  let unitsBefore2024 = 0;
  let unitsBefore2025 = 0;
  const propToFirst = earliestByProp;
  const unitsByProp = new Map<string, number>();
  for (const r of rows) {
    const k = propertyKey(r.property_name, r.id);
    const q = toNum(r.quantity_of_units);
    const w = q !== null && q > 0 ? q : 1;
    unitsByProp.set(k, (unitsByProp.get(k) ?? 0) + w);
  }
  const cut2024 = new Date('2024-01-01T00:00:00Z');
  const cut2025 = new Date('2025-01-01T00:00:00Z');
  for (const [k, u] of unitsByProp) {
    const d = propToFirst.get(k);
    if (!d) continue;
    if (d < cut2024) unitsBefore2024 += u;
    if (d < cut2025) unitsBefore2025 += u;
  }
  const yoyUnitPct =
    unitsBefore2024 > 0 ? ((unitsBefore2025 - unitsBefore2024) / unitsBefore2024) * 100 : null;

  const flags: string[] = [];
  const retailFlag = meanMedianFlag(meanRetail, medRetailUnweighted, 'Annual retail ADR (row obs.)');
  if (retailFlag) flags.push(retailFlag);
  const headlineFlag = meanMedianFlag(meanRetail, medRetailRowWeighted, 'Annual retail ADR vs unit-weighted median');
  if (headlineFlag) flags.push(headlineFlag);

  for (const { cluster, medianAdr, units } of clusterRows) {
    if (units < 5 || medianAdr === null) continue;
    const expanded = clusterRetailExpanded.get(cluster) ?? [];
    const mu = avg(expanded);
    const fl = meanMedianFlag(mu, medianAdr, `Cluster ${cluster} (unit-weighted)`);
    if (fl) flags.push(fl);
  }

  const seasonalWarnings: string[] = [];
  const seasonalTable: string[] = [];
  seasonalTable.push('| Season | Weekday Rate | Weekend Rate | Premium | n (wd/we) |');
  seasonalTable.push('|--------|--------------|--------------|---------|-----------|');
  for (const s of SEASONS) {
    const mWd = median(weekday[s]);
    const mWe = median(weekend[s]);
    const prem = mWd !== null && mWe !== null ? mWe - mWd : null;
    const nWd = weekday[s].length;
    const nWe = weekend[s].length;
    if (nWd < SAMPLE_WARN_THRESHOLD || nWe < SAMPLE_WARN_THRESHOLD) {
      seasonalWarnings.push(
        `${SEASON_LABEL[s]}: low sample (weekday n=${nWd}, weekend n=${nWe}) — interpret cautiously`
      );
    }
    seasonalTable.push(
      `| ${SEASON_LABEL[s]} | ${fmtUsd(mWd)} | ${fmtUsd(mWe)} | ${fmtPrem(prem)} | ${nWd} / ${nWe} |`
    );
  }

  const mktGrowth = growthLabel(yoyPropPct, yoyUnitPct, false);

  console.log('══════════════════════════════════════════════════════════════');
  console.log('1. CANVA / SNAPSHOT — headline (copy-paste)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Total properties (unique names): ${uniqueProps.size}`);
  console.log(`Total units (Σ quantity, default 1 if null): ${totalUnits}`);
  console.log(
    `Median nightly rate (headline): ${fmtUsd(medRetailRowWeighted)} per night — unit-weighted median across rows`
  );
  console.log(`  (unweighted median across rows: ${fmtUsd(medRetailUnweighted)}; unit-expanded median: ${fmtUsd(medRetailUnitWeighted)})`);
  console.log(`Mean nightly rate (reference): ${fmtUsd(meanRetail)}`);
  console.log(`Market growth label (see notes): ${mktGrowth}`);
  console.log(
    `Weekend premium — median(weekend pool) − median(weekday pool): ${fmtPrem(annualPremMedianPool)} per night`
  );
  console.log(`  (median of paired seasonal premiums row×season: ${fmtPrem(annualPremMedianPairs)})`);

  console.log(
    `Premium operators — top-quartile mean retail: ${fmtUsd(tq.meanTopQuartile)} (n=${tq.n} rows, 75p ≥ ${fmtUsd(tq.threshold)})`
  );
  console.log('Footnote: Median used instead of mean to control for ultra-luxury outliers');
  console.log('');

  console.log('══════════════════════════════════════════════════════════════');
  console.log('2. SEASONAL TABLE (medians; premium = med weekend − med weekday)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(seasonalTable.join('\n'));
  console.log('');

  console.log('══════════════════════════════════════════════════════════════');
  console.log('3. CLUSTER BREAKDOWN (assignment = geo heuristic, not Sage tags)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('| Cluster | Units (weighted) | Median retail ADR |');
  console.log('|---------|------------------|-------------------|');
  for (const r of clusterRows) {
    console.log(`| ${r.cluster} | ${r.units} | ${fmtUsd(r.medianAdr)} |`);
  }
  console.log('');
  console.log('Top 5 clusters by unit count:');
  for (const r of top5Clusters) {
    console.log(`  • ${r.cluster}: ${r.units} units, median ADR ${fmtUsd(r.medianAdr)}`);
  }
  console.log('');

  console.log('══════════════════════════════════════════════════════════════');
  console.log('4. UNIT TYPE MIX (unit-weighted)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('| Unit type | Units | % of PNW units | Median ADR |');
  console.log('|-----------|-------|------------------|------------|');
  for (const t of typeTable) {
    console.log(
      `| ${t.unit_type} | ${t.units} | ${t.pct.toFixed(1)}% | ${fmtUsd(t.median_adr)} |`
    );
  }
  console.log('');

  console.log('══════════════════════════════════════════════════════════════');
  console.log('5. NOTES — data quality & YoY proxy (date_added earliest per property)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(
    `YoY proxy: unique properties first seen in DB before 2024-01-01: ${yoy.propsBefore2024}; before 2025-01-01: ${yoy.propsBefore2025}; before 2026-01-01: ${yoy.propsBefore2026}`
  );
  console.log(`New property names (first date_added in 2025): ${yoy.newProps2025}`);
  console.log(
    `Implied YoY % change properties (before 2025 vs before 2024 cohort): ${yoyPropPct !== null ? yoyPropPct.toFixed(1) + '%' : 'n/a'}`
  );
  console.log(
    `Implied YoY % change units for those cohorts: ${yoyUnitPct !== null ? yoyUnitPct.toFixed(1) + '%' : 'n/a'}`
  );
  console.log(
    'Caution: growth from `date_added` tracks Sage database coverage, not verified openings/closings.'
  );
  if (seasonalWarnings.length) {
    console.log('\nSeasonal sample warnings:');
    for (const w of seasonalWarnings) console.log(`  • ${w}`);
  }
  if (flags.length) {
    console.log('\nMean vs median flags:');
    for (const f of flags) console.log(`  • ${f}`);
  }
  console.log('');

  const summaryJson = {
    scope: 'Oregon + Washington; published; open; glamping; geo-sanity excluded',
    snapshot: {
      total_properties: uniqueProps.size,
      total_units: totalUnits,
      median_nightly_rate_usd: medRetailRowWeighted,
      mean_nightly_rate_usd: meanRetail,
      weekend_premium_median_pool_usd: annualPremMedianPool,
      weekend_premium_median_paired_obs_usd: annualPremMedianPairs,
      premium_operators_top_quartile_mean_usd: tq.meanTopQuartile,
      market_growth_label: mktGrowth,
    },
    seasonal_medians: Object.fromEntries(
      SEASONS.map((s) => {
        const mWd = median(weekday[s]);
        const mWe = median(weekend[s]);
        return [
          s,
          {
            weekday: mWd,
            weekend: mWe,
            premium: mWd !== null && mWe !== null ? mWe - mWd : null,
            n_weekday: weekday[s].length,
            n_weekend: weekend[s].length,
          },
        ];
      })
    ),
    clusters: clusterRows,
    unit_types: typeTable,
    yoy_proxy: { ...yoy, yoy_prop_pct: yoyPropPct, yoy_unit_pct: yoyUnitPct },
  };
  console.log('=== JSON (machine-readable) ===');
  console.log(JSON.stringify(summaryJson, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
