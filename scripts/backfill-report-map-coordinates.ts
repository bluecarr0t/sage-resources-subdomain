#!/usr/bin/env npx tsx
/**
 * Fix client-map pins: replace state-centroid placeholders (from legacy CSV import)
 * and fill missing coordinates using City + State (and `location` when `city` is empty).
 *
 * Geocoding uses explicit "City, ST, USA" against Google when a key is set; otherwise
 * Nominatim structured search (city + state + US), with free-text fallback.
 *
 * Usage:
 *   npx tsx scripts/backfill-report-map-coordinates.ts [--dry-run] [--limit N] [--study-id ID ...]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 * Optional: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (preferred) or GOOGLE_MAPS_API_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { geocodeCityStateUsa } from '../lib/geocode';
import {
  bestCityStateForReportGeocode,
  parseLocationStringField,
} from '../lib/parse-csv-location';
import { isLikelyStateCenterPlaceholder } from '../lib/us-state-centers';

config({ path: resolve(process.cwd(), '.env.local') });

function stateHintForRow(row: {
  state: string | null;
  location: string | null;
}): string | null {
  const sr = (row.state || '').trim();
  if (sr) return sr;
  const p = parseLocationStringField((row.location || '').trim());
  return p?.stateRaw ?? null;
}

function resolveCityAndStateAbbr(row: {
  city: string | null;
  state: string | null;
  location: string | null;
}): { city: string; abbr: string } | null {
  return bestCityStateForReportGeocode(row);
}

const NOMINATIM_DELAY_MS = 1100;

async function geocodeNominatimStructured(
  city: string,
  stateAbbr: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'us',
    city: city.trim(),
    state: stateAbbr.trim(),
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SageOutdoorAdvisory-ReportMapBackfill/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`  [Nominatim] HTTP ${response.status} structured: ${city}, ${stateAbbr}`);
      return null;
    }
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch (e) {
    console.warn(`  [Nominatim] structured error: ${city}, ${stateAbbr}`, e);
    return null;
  }
}

async function geocodeNominatimFreeText(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SageOutdoorAdvisory-ReportMapBackfill/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`  [Nominatim] HTTP ${response.status} q=${query.slice(0, 60)}`);
      return null;
    }
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch (e) {
    console.warn(`  [Nominatim] free-text error: ${query.slice(0, 60)}`, e);
    return null;
  }
}

async function geocodeReport(city: string, stateAbbr: string) {
  const placeLine = `${city.trim()}, ${stateAbbr}, USA`;
  const google = await geocodeCityStateUsa(city, stateAbbr);
  if (google) return google;

  await sleep(NOMINATIM_DELAY_MS);
  let coords = await geocodeNominatimStructured(city, stateAbbr);
  if (coords) return coords;

  await sleep(NOMINATIM_DELAY_MS);
  coords = await geocodeNominatimFreeText(placeLine);
  if (coords) return coords;

  await sleep(NOMINATIM_DELAY_MS);
  return geocodeNominatimFreeText(`${city}, ${stateAbbr}, United States`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(): {
  dryRun: boolean;
  limit: number | null;
  studyIds: string[] | null;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : null;
  const studyIdx = args.indexOf('--study-id');
  const studyIds: string[] = [];
  if (studyIdx >= 0) {
    for (let i = studyIdx + 1; i < args.length && !args[i].startsWith('--'); i++) {
      studyIds.push(args[i].trim());
    }
  }
  return {
    dryRun,
    limit: limit != null && !Number.isNaN(limit) ? limit : null,
    studyIds: studyIds.length > 0 ? studyIds : null,
  };
}

async function main() {
  const { dryRun, limit, studyIds } = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const hasGoogleKey = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_API_KEY?.trim()
  );
  console.log(
    hasGoogleKey
      ? 'Geocoding: Google (City, ST, USA) then Nominatim if needed'
      : 'Geocoding: Nominatim only (~1 req/s); set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google'
  );

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: rows, error } = await supabase
    .from('reports')
    .select('id, study_id, city, state, location, latitude, longitude')
    .is('deleted_at', null);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  let scopedRows = rows || [];
  if (studyIds?.length) {
    const want = new Set(studyIds.map((s) => s.toUpperCase()));
    scopedRows = scopedRows.filter(
      (r) => r.study_id && want.has(String(r.study_id).toUpperCase())
    );
    console.log(`Filtering to study_id(s): ${studyIds.join(', ')} (${scopedRows.length} rows)`);
  }

  const forceStudyList = Boolean(studyIds?.length);

  const candidates = scopedRows.filter((r) => {
    const place = resolveCityAndStateAbbr(r);
    if (!place) return false;
    if (forceStudyList) return true;
    const lat = r.latitude != null ? Number(r.latitude) : null;
    const lng = r.longitude != null ? Number(r.longitude) : null;
    if (lat == null || lng == null) return true;
    return isLikelyStateCenterPlaceholder(lat, lng, stateHintForRow(r));
  });

  const toProcess = limit != null ? candidates.slice(0, limit) : candidates;
  console.log(
    `Reports to geocode: ${toProcess.length} of ${candidates.length} candidates (${scopedRows.length} rows in scope)`
  );
  if (dryRun) {
    toProcess.slice(0, 30).forEach((r) => {
      const p = resolveCityAndStateAbbr(r);
      console.log(`  ${r.study_id ?? r.id}: ${p?.city}, ${p?.abbr}  (row city/state: ${r.city || '—'}, ${r.state || '—'})`);
    });
    if (toProcess.length > 30) console.log(`  ... and ${toProcess.length - 30} more`);
    console.log('\n[DRY RUN] No updates.');
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const r of toProcess) {
    const place = resolveCityAndStateAbbr(r);
    if (!place) continue;

    await sleep(hasGoogleKey ? 150 : 0);

    const coords = await geocodeReport(place.city, place.abbr);
    if (!coords) {
      console.warn(
        `  skip (geocode failed): ${r.study_id ?? r.id} — "${place.city}, ${place.abbr}"`
      );
      failed++;
      continue;
    }

    const { error: upErr } = await supabase
      .from('reports')
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq('id', r.id);

    if (upErr) {
      console.warn(`  skip (db): ${r.study_id ?? r.id}`, upErr.message);
      failed++;
    } else {
      updated++;
      if (updated % 25 === 0) console.log(`  … ${updated} updated`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, failed/skipped: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
