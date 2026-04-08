#!/usr/bin/env npx tsx
/**
 * Clear mis-extracted `city` values (e.g. "term. In particular") and re-geocode from
 * `property_name` + `state` only when the result verifies (reverse-geocoded state matches
 * and we have a real locality — not a generic state centroid).
 *
 * If geocoding is uncertain, sets city/lat/lng to null and `location` to the state name
 * so `reports.location` stays NOT NULL and the client map uses the state fallback pin.
 *
 *   npx tsx scripts/fix-garbage-report-city-and-geocode.ts [--dry-run]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 * Optional: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Places + Geocoding improve hit rate).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  isGarbageReportCity,
  isLikelyUsablePropertyForGeocoding,
} from '../lib/report-location-quality';
import {
  googlePlacesFindPlaceLatLng,
  resolveGeocodeForCompsSearch,
  reverseGeocodeLocalityAndStateUsa,
} from '../lib/geocode';
import { isLikelyStateCenterPlaceholder, resolveUsStateAbbr } from '../lib/us-state-centers';

config({ path: resolve(process.cwd(), '.env.local') });

const NOMINATIM_GAP_MS = 1100;

/** Study IDs damaged by an earlier bad import or a previous run of this script — always re-evaluate. */
const FORCE_REPAIR_STUDY_IDS = new Set([
  '25-107A-01',
  '25-138A-03',
  '25-169A-04',
  '25-177A-04',
  '25-181A-04',
  '23-303A-12',
  '23-293A-11',
  '23-278A-11',
]);

const US_STATE_DISPLAY: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stateFallbackLocation(abbr: string): string {
  return US_STATE_DISPLAY[abbr] ?? abbr;
}

function locationLooksLikeGarbageFragment(loc: string | null | undefined): boolean {
  const s = String(loc ?? '').trim();
  return /\bterm\.\s*in\s+particular\b/i.test(s);
}

function shouldRepairRow(r: {
  study_id: string | null;
  city: string | null;
  location: string | null;
}): boolean {
  const sid = r.study_id?.trim() ?? '';
  if (sid && FORCE_REPAIR_STUDY_IDS.has(sid)) return true;
  if (isGarbageReportCity(r.city)) return true;
  if (locationLooksLikeGarbageFragment(r.location)) return true;
  return false;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rows: Array<{
    id: string;
    study_id: string | null;
    property_name: string | null;
    city: string | null;
    state: string | null;
    location: string | null;
    address_1: string | null;
    zip_code: string | null;
  }> = [];

  for (let from = 0; ; from += 800) {
    const { data, error } = await supabase
      .from('reports')
      .select('id, study_id, property_name, city, state, location, address_1, zip_code')
      .is('deleted_at', null)
      .range(from, from + 799);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 800) break;
  }

  const targets = rows.filter(shouldRepairRow);
  console.log(`Reports scanned: ${rows.length}. Rows to repair: ${targets.length}.`);
  if (targets.length === 0) return;

  let updated = 0;
  let confidentGeo = 0;
  let fallbackStateOnly = 0;

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const label = r.study_id ?? r.id;
    const stateAbbr =
      resolveUsStateAbbr(r.state ?? '') ?? r.state?.trim().toUpperCase().slice(0, 2) ?? '';
    const prop = String(r.property_name ?? '')
      .replace(/\s*\n\s*/g, ' ')
      .trim();

    if (i > 0) await sleep(NOMINATIM_GAP_MS);

    const stateOk = stateAbbr.length === 2;
    const propOk = isLikelyUsablePropertyForGeocoding(prop, r.study_id);
    const fallbackLoc = stateOk ? stateFallbackLocation(stateAbbr) : 'United States';

    let nextCity: string | null = null;
    let nextLocation = fallbackLoc;
    let nextLat: number | null = null;
    let nextLng: number | null = null;

    if (stateOk && propOk) {
      let coords =
        (await googlePlacesFindPlaceLatLng(`${prop}, ${stateAbbr}, United States`)) ??
        (await resolveGeocodeForCompsSearch({
          locationLine: `${prop}, ${stateAbbr}, USA`,
          state: stateAbbr,
        }));

      if (coords && !isLikelyStateCenterPlaceholder(coords.lat, coords.lng, stateAbbr)) {
        await sleep(NOMINATIM_GAP_MS);
        const rev = await reverseGeocodeLocalityAndStateUsa(coords.lat, coords.lng);
        const locality = rev.locality?.trim() || null;
        const revState = rev.stateAbbr?.toUpperCase() ?? '';
        if (locality && revState === stateAbbr.toUpperCase()) {
          nextCity = locality;
          nextLocation = `${locality}, ${stateAbbr}`;
          nextLat = coords.lat;
          nextLng = coords.lng;
          confidentGeo++;
          console.log(`  ${label}: verified geocode → ${nextLocation}`);
        } else {
          fallbackStateOnly++;
          console.warn(
            `  ${label}: geocode not verified (rev=${JSON.stringify(rev)}) — state-only fallback`
          );
        }
      } else if (coords) {
        fallbackStateOnly++;
        console.warn(`  ${label}: coords look like state centroid — state-only fallback`);
      } else {
        fallbackStateOnly++;
        console.warn(`  ${label}: no geocode hit for "${prop}, ${stateAbbr}" — state-only fallback`);
      }
    } else {
      fallbackStateOnly++;
      const reason = !stateOk ? 'bad/missing state' : 'property not usable for geocode';
      console.warn(`  ${label}: ${reason} — state-only fallback`);
    }

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('reports')
        .update({
          city: nextCity,
          location: nextLocation,
          latitude: nextLat,
          longitude: nextLng,
        })
        .eq('id', r.id);

      if (upErr) {
        console.error(`  ${label}: DB error`, upErr.message);
      } else {
        updated++;
      }
    } else {
      console.log(
        `  [dry-run] ${label} → city=${JSON.stringify(nextCity)} location=${JSON.stringify(nextLocation)} lat=${nextLat} lng=${nextLng}`
      );
      updated++;
    }
  }

  console.log(
    `\nDone.${dryRun ? ' (dry-run)' : ''} Updated: ${updated}, confident pins: ${confidentGeo}, state-only: ${fallbackStateOnly}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
