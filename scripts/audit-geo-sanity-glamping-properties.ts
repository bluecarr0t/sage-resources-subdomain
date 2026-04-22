/**
 * Geo-sanity audit for all_glamping_properties.
 *
 * Flags rows where lat/lon doesn't agree with the row's state / country.
 * Uses approximate state bounding boxes for US states + Canadian provinces.
 *
 * Categories reported:
 *   - state_bbox_mismatch: lat/lon falls outside the state's bounding box
 *   - country_bbox_mismatch: lat/lon falls outside the country's bounding box
 *   - missing_coords: lat or lon is null / non-numeric
 *   - unknown_state: state value not in the bbox table (e.g. typo, foreign)
 *
 * Outputs:
 *   - Console summary with counts
 *   - CSV at scripts/output/geo-sanity-flagged.csv with one row per flagged property
 *
 * Run with: npx tsx scripts/audit-geo-sanity-glamping-properties.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
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

type Bbox = { minLat: number; maxLat: number; minLon: number; maxLon: number };

// Approximate state/province bounding boxes (padded ~0.25° to forgive
// border properties). Sources: US Census + GeoNames public-domain bboxes.
const STATE_BBOX: Record<string, Bbox> = {
  AL: { minLat: 30.13, maxLat: 35.25, minLon: -88.73, maxLon: -84.64 },
  AK: { minLat: 51.0, maxLat: 71.5, minLon: -179.5, maxLon: -129.0 },
  AZ: { minLat: 31.08, maxLat: 37.25, minLon: -114.97, maxLon: -108.95 },
  AR: { minLat: 32.85, maxLat: 36.75, minLon: -94.87, maxLon: -89.4 },
  CA: { minLat: 32.28, maxLat: 42.25, minLon: -124.7, maxLon: -114.0 },
  CO: { minLat: 36.75, maxLat: 41.25, minLon: -109.3, maxLon: -101.8 },
  CT: { minLat: 40.7, maxLat: 42.3, minLon: -73.9, maxLon: -71.5 },
  DE: { minLat: 38.4, maxLat: 39.95, minLon: -75.95, maxLon: -75.0 },
  FL: { minLat: 24.3, maxLat: 31.25, minLon: -87.85, maxLon: -79.8 },
  GA: { minLat: 30.1, maxLat: 35.25, minLon: -85.85, maxLon: -80.5 },
  HI: { minLat: 18.7, maxLat: 22.55, minLon: -160.55, maxLon: -154.5 },
  ID: { minLat: 41.8, maxLat: 49.25, minLon: -117.5, maxLon: -110.8 },
  IL: { minLat: 36.7, maxLat: 42.75, minLon: -91.7, maxLon: -87.2 },
  IN: { minLat: 37.5, maxLat: 41.95, minLon: -88.35, maxLon: -84.55 },
  IA: { minLat: 40.1, maxLat: 43.75, minLon: -96.9, maxLon: -89.9 },
  KS: { minLat: 36.7, maxLat: 40.25, minLon: -102.3, maxLon: -94.3 },
  KY: { minLat: 36.25, maxLat: 39.4, minLon: -89.9, maxLon: -81.7 },
  LA: { minLat: 28.7, maxLat: 33.25, minLon: -94.3, maxLon: -88.5 },
  ME: { minLat: 42.85, maxLat: 47.75, minLon: -71.35, maxLon: -66.7 },
  MD: { minLat: 37.6, maxLat: 39.95, minLon: -79.7, maxLon: -74.85 },
  MA: { minLat: 41.0, maxLat: 43.0, minLon: -73.7, maxLon: -69.7 },
  MI: { minLat: 41.45, maxLat: 48.55, minLon: -90.65, maxLon: -82.1 },
  MN: { minLat: 43.25, maxLat: 49.5, minLon: -97.5, maxLon: -89.25 },
  MS: { minLat: 30.0, maxLat: 35.25, minLon: -91.9, maxLon: -88.05 },
  MO: { minLat: 35.7, maxLat: 40.85, minLon: -95.95, maxLon: -88.85 },
  MT: { minLat: 44.1, maxLat: 49.25, minLon: -116.3, maxLon: -103.8 },
  NE: { minLat: 39.75, maxLat: 43.25, minLon: -104.3, maxLon: -95.0 },
  NV: { minLat: 34.75, maxLat: 42.25, minLon: -120.25, maxLon: -113.85 },
  NH: { minLat: 42.5, maxLat: 45.6, minLon: -72.85, maxLon: -70.35 },
  NJ: { minLat: 38.6, maxLat: 41.6, minLon: -75.85, maxLon: -73.65 },
  NM: { minLat: 31.05, maxLat: 37.25, minLon: -109.3, maxLon: -102.8 },
  NY: { minLat: 40.25, maxLat: 45.25, minLon: -79.95, maxLon: -71.6 },
  NC: { minLat: 33.6, maxLat: 36.85, minLon: -84.6, maxLon: -75.2 },
  ND: { minLat: 45.7, maxLat: 49.25, minLon: -104.3, maxLon: -96.3 },
  OH: { minLat: 38.15, maxLat: 42.25, minLon: -85.05, maxLon: -80.35 },
  OK: { minLat: 33.4, maxLat: 37.25, minLon: -103.25, maxLon: -94.2 },
  OR: { minLat: 41.75, maxLat: 46.5, minLon: -124.75, maxLon: -116.2 },
  PA: { minLat: 39.45, maxLat: 42.5, minLon: -80.75, maxLon: -74.45 },
  RI: { minLat: 41.0, maxLat: 42.2, minLon: -71.95, maxLon: -71.05 },
  SC: { minLat: 32.0, maxLat: 35.45, minLon: -83.55, maxLon: -78.3 },
  SD: { minLat: 42.25, maxLat: 46.25, minLon: -104.3, maxLon: -96.2 },
  TN: { minLat: 34.75, maxLat: 36.95, minLon: -90.55, maxLon: -81.4 },
  TX: { minLat: 25.6, maxLat: 36.75, minLon: -106.9, maxLon: -93.25 },
  UT: { minLat: 36.75, maxLat: 42.25, minLon: -114.3, maxLon: -108.8 },
  VT: { minLat: 42.5, maxLat: 45.25, minLon: -73.7, maxLon: -71.2 },
  VA: { minLat: 36.25, maxLat: 39.6, minLon: -83.95, maxLon: -75.05 },
  WA: { minLat: 45.3, maxLat: 49.25, minLon: -124.95, maxLon: -116.7 },
  WV: { minLat: 37.0, maxLat: 40.95, minLon: -82.85, maxLon: -77.45 },
  WI: { minLat: 42.25, maxLat: 47.25, minLon: -93.0, maxLon: -86.55 },
  WY: { minLat: 40.75, maxLat: 45.25, minLon: -111.3, maxLon: -103.8 },
  DC: { minLat: 38.7, maxLat: 39.1, minLon: -77.2, maxLon: -76.85 },
  AB: { minLat: 48.75, maxLat: 60.25, minLon: -120.25, maxLon: -109.75 },
  BC: { minLat: 47.95, maxLat: 60.25, minLon: -139.3, maxLon: -113.8 },
  MB: { minLat: 48.75, maxLat: 60.25, minLon: -102.3, maxLon: -88.7 },
  NB: { minLat: 44.35, maxLat: 48.25, minLon: -69.3, maxLon: -63.65 },
  NL: { minLat: 46.5, maxLat: 60.5, minLon: -67.95, maxLon: -52.35 },
  NS: { minLat: 43.2, maxLat: 47.25, minLon: -66.65, maxLon: -59.45 },
  NT: { minLat: 59.75, maxLat: 78.5, minLon: -136.45, maxLon: -101.85 },
  NU: { minLat: 60.0, maxLat: 84.0, minLon: -121.0, maxLon: -61.0 },
  ON: { minLat: 41.5, maxLat: 56.95, minLon: -95.4, maxLon: -74.1 },
  PE: { minLat: 45.7, maxLat: 47.25, minLon: -64.6, maxLon: -61.7 },
  QC: { minLat: 44.75, maxLat: 62.85, minLon: -79.95, maxLon: -56.85 },
  SK: { minLat: 48.75, maxLat: 60.25, minLon: -110.3, maxLon: -101.25 },
  YT: { minLat: 59.75, maxLat: 69.85, minLon: -141.3, maxLon: -123.65 },
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
  alberta: 'AB', 'british columbia': 'BC', manitoba: 'MB', 'new brunswick': 'NB',
  'newfoundland and labrador': 'NL', 'nova scotia': 'NS', 'northwest territories': 'NT',
  nunavut: 'NU', ontario: 'ON', 'prince edward island': 'PE', quebec: 'QC',
  saskatchewan: 'SK', yukon: 'YT',
};

const COUNTRY_BBOX: Record<string, Bbox> = {
  US: { minLat: 18.0, maxLat: 71.5, minLon: -179.5, maxLon: -66.5 },
  CA: { minLat: 41.5, maxLat: 84.0, minLon: -141.5, maxLon: -52.0 },
  MX: { minLat: 14.5, maxLat: 33.0, minLon: -118.5, maxLon: -86.5 },
};

const COUNTRY_ALIASES: Record<string, string> = {
  us: 'US', usa: 'US', 'united states': 'US', 'united states of america': 'US',
  ca: 'CA', can: 'CA', canada: 'CA',
  mx: 'MX', mex: 'MX', mexico: 'MX',
};

type Row = {
  id: number;
  property_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: string | number | null;
  lon: string | number | null;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStateCode(state: string | null): string | null {
  if (!state) return null;
  const s = state.trim();
  if (s.length === 2 && STATE_BBOX[s.toUpperCase()]) return s.toUpperCase();
  const lower = s.toLowerCase();
  if (STATE_NAME_TO_CODE[lower]) return STATE_NAME_TO_CODE[lower];
  return null;
}

function normalizeCountryCode(country: string | null): string | null {
  if (!country) return null;
  const lower = country.trim().toLowerCase();
  return COUNTRY_ALIASES[lower] ?? null;
}

function inBbox(lat: number, lon: number, bbox: Bbox): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  const batch = 1000;
  let offset = 0;
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select('id,property_name,city,state,country,lat,lon', { count: 'exact' })
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

type Flag =
  | 'state_bbox_mismatch'
  | 'country_bbox_mismatch'
  | 'missing_coords'
  | 'unknown_state'
  | 'invalid_coords';

type FlaggedRow = {
  row: Row;
  flag: Flag;
  resolvedState: string | null;
  resolvedCountry: string | null;
  detail: string;
};

async function main() {
  console.log('Fetching all_glamping_properties...');
  const rows = await fetchAll();
  console.log(`Total rows: ${rows.length}\n`);

  const flagged: FlaggedRow[] = [];
  const counts: Record<Flag, number> = {
    state_bbox_mismatch: 0,
    country_bbox_mismatch: 0,
    missing_coords: 0,
    unknown_state: 0,
    invalid_coords: 0,
  };

  for (const r of rows) {
    const lat = toNum(r.lat);
    const lon = toNum(r.lon);
    const stateCode = normalizeStateCode(r.state);
    const countryCode = normalizeCountryCode(r.country);

    if (lat === null || lon === null) {
      flagged.push({ row: r, flag: 'missing_coords', resolvedState: stateCode, resolvedCountry: countryCode, detail: 'lat or lon missing' });
      counts.missing_coords++;
      continue;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      flagged.push({ row: r, flag: 'invalid_coords', resolvedState: stateCode, resolvedCountry: countryCode, detail: `lat=${lat}, lon=${lon}` });
      counts.invalid_coords++;
      continue;
    }

    if (countryCode && COUNTRY_BBOX[countryCode] && !inBbox(lat, lon, COUNTRY_BBOX[countryCode])) {
      flagged.push({
        row: r,
        flag: 'country_bbox_mismatch',
        resolvedState: stateCode,
        resolvedCountry: countryCode,
        detail: `lat=${lat}, lon=${lon} not in ${countryCode} bbox`,
      });
      counts.country_bbox_mismatch++;
      continue;
    }

    if (stateCode) {
      const bbox = STATE_BBOX[stateCode];
      if (!bbox) {
        flagged.push({ row: r, flag: 'unknown_state', resolvedState: stateCode, resolvedCountry: countryCode, detail: `state code ${stateCode} not in bbox table` });
        counts.unknown_state++;
        continue;
      }
      if (!inBbox(lat, lon, bbox)) {
        flagged.push({
          row: r,
          flag: 'state_bbox_mismatch',
          resolvedState: stateCode,
          resolvedCountry: countryCode,
          detail: `lat=${lat}, lon=${lon} not in ${stateCode} bbox`,
        });
        counts.state_bbox_mismatch++;
      }
    } else if (r.state && r.state.trim()) {
      flagged.push({ row: r, flag: 'unknown_state', resolvedState: null, resolvedCountry: countryCode, detail: `unrecognized state value "${r.state}"` });
      counts.unknown_state++;
    }
  }

  console.log('=== Geo-sanity audit results ===');
  for (const k of Object.keys(counts) as Flag[]) {
    console.log(`  ${k.padEnd(24)} ${counts[k]}`);
  }
  console.log(`  total flagged           ${flagged.length}`);

  console.log('\n=== State/country bbox mismatches (most likely bad lat/lon) ===');
  const bboxMismatches = flagged.filter(
    (f) => f.flag === 'state_bbox_mismatch' || f.flag === 'country_bbox_mismatch'
  );
  console.log(`  ${bboxMismatches.length} rows\n`);
  for (const f of bboxMismatches.slice(0, 50)) {
    const r = f.row;
    console.log(
      `  id=${String(r.id).padStart(6)}  ${(r.property_name ?? '').slice(0, 38).padEnd(38)}  ${(r.city ?? '').slice(0, 18).padEnd(18)}  state=${(r.state ?? '').padEnd(20)}  country=${(r.country ?? '').padEnd(6)}  lat=${r.lat}, lon=${r.lon}`
    );
  }
  if (bboxMismatches.length > 50) console.log(`  ... and ${bboxMismatches.length - 50} more (see CSV)`);

  // Write CSV
  const outDir = resolve(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const csvPath = resolve(outDir, 'geo-sanity-flagged.csv');
  const header = 'flag,id,property_name,city,state,country,lat,lon,resolved_state,resolved_country,detail';
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header];
  for (const f of flagged) {
    lines.push(
      [
        f.flag,
        f.row.id,
        f.row.property_name,
        f.row.city,
        f.row.state,
        f.row.country,
        f.row.lat,
        f.row.lon,
        f.resolvedState,
        f.resolvedCountry,
        f.detail,
      ]
        .map(escape)
        .join(',')
    );
  }
  writeFileSync(csvPath, lines.join('\n'));
  console.log(`\nFull results written to: ${csvPath}`);

  // Write JSON list of bad-geo IDs for downstream filtering
  const badGeoIds = flagged
    .filter((f) => f.flag === 'state_bbox_mismatch' || f.flag === 'country_bbox_mismatch' || f.flag === 'invalid_coords')
    .map((f) => f.row.id);
  const idsPath = resolve(outDir, 'geo-sanity-bad-ids.json');
  writeFileSync(idsPath, JSON.stringify(badGeoIds, null, 2));
  console.log(`Bad-geo row ids written to: ${idsPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
