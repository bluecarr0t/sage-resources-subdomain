#!/usr/bin/env npx tsx
/**
 * Backfill address, city, and state for all_glamping_properties records missing them.
 *
 * Uses reverse geocoding (lat/lon → address components). Requires lat/lon.
 * Nominatim → BigDataCloud → Google (if API key set).
 *
 * Usage: npx tsx scripts/backfill-address-city-state-glamping.ts
 *
 * Nominatim requires 1 second between requests.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const googleApiKey =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const TABLE_NAME = 'all_glamping_properties';

interface GlampingProperty {
  id: number;
  property_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: string | null;
  lon: string | null;
}

interface ReverseGeocodeResult {
  address: string | null;
  city: string | null;
  state: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const US_STATE_MAP: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

function normalizeState(state: string): string {
  const s = state.trim();
  if (/^[A-Z]{2}$/.test(s)) return s;
  const key = s.toLowerCase();
  return US_STATE_MAP[key] ?? s;
}

function buildAddress(addr: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const num = addr.house_number ?? addr.house_name;
  const road = addr.road ?? addr.street ?? addr.street_name ?? addr.footway;
  if (num) parts.push(String(num));
  if (road) parts.push(String(road));
  if (parts.length) return parts.join(' ');
  const suburb = addr.suburb ?? addr.neighbourhood ?? addr.hamlet;
  if (suburb) return String(suburb);
  return null;
}

/**
 * Reverse geocode using Nominatim (returns address, city, state)
 */
async function reverseGeocodeNominatim(
  lat: number,
  lon: number,
  retries = 3
): Promise<ReverseGeocodeResult | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Sage-Glamping-Address-Backfill/1.0' },
      });
      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await sleep(2000);
          continue;
        }
        return null;
      }
      const data = await response.json();
      const a = data?.address;
      if (!a) return null;

      const address = buildAddress(a);
      const city = (a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null)
        ? String(a.city ?? a.town ?? a.village ?? a.municipality ?? a.county)
        : null;
      let state: string | null = a.state ? String(a.state) : null;
      if (state) state = normalizeState(state);

      if (address || city || state) {
        return { address: address ?? null, city, state };
      }
      return null;
    } catch {
      if (attempt === retries) return null;
      await sleep(1000);
    }
  }
  return null;
}

/**
 * Reverse geocode using BigDataCloud
 */
async function reverseGeocodeBigDataCloud(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data) return null;
    const city = data.city ?? data.locality;
    let state = data.principalSubdivisionCode ?? data.principalSubdivision;
    if (state && String(state).includes('-')) {
      state = String(state).split('-').pop();
    }
    return {
      address: null,
      city: city ? String(city) : null,
      state: state ? String(state) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode using Google Maps API
 */
async function reverseGeocodeGoogle(
  lat: number,
  lon: number
): Promise<ReverseGeocodeResult | null> {
  if (!googleApiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const comps = data.results[0]?.address_components ?? [];
    let address: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    const streetNum = comps.find((c: { types: string[] }) => c.types.includes('street_number'));
    const route = comps.find((c: { types: string[] }) => c.types.includes('route'));
    if (streetNum || route) {
      address = [streetNum?.long_name, route?.long_name].filter(Boolean).join(' ') || null;
    }
    const locality = comps.find((c: { types: string[] }) => c.types.includes('locality'));
    const adminArea2 = comps.find((c: { types: string[] }) => c.types.includes('administrative_area_level_2'));
    city = locality?.long_name ?? adminArea2?.long_name ?? null;
    const adminArea1 = comps.find((c: { types: string[] }) => c.types.includes('administrative_area_level_1'));
    state = adminArea1?.short_name ?? adminArea1?.long_name ?? null;
    return { address, city, state };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult | null> {
  let r = await reverseGeocodeNominatim(lat, lon);
  if (r && (r.address || r.city || r.state)) return r;

  r = await reverseGeocodeBigDataCloud(lat, lon);
  if (r && (r.address || r.city || r.state)) return r;

  r = await reverseGeocodeGoogle(lat, lon);
  return r;
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📖 Fetching records missing address, city, or state...');
  if (googleApiKey) console.log('   (Google Maps API key found – will use as fallback)\n');
  else console.log('   (Using Nominatim + BigDataCloud; set GOOGLE_MAPS_API_KEY for fallback)\n');

  const PAGE_SIZE = 2000;
  const allRows: GlampingProperty[] = [];
  let offset = 0;

  while (true) {
    const { data: page, error } = await supabase
      .from(TABLE_NAME)
      .select('id, property_name, address, city, state, country, lat, lon')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Fetch error:', error.message);
      process.exit(1);
    }
    if (!page?.length) break;
    allRows.push(...(page as GlampingProperty[]));
    offset += PAGE_SIZE;
    if (page.length < PAGE_SIZE) break;
  }

  const toProcess = allRows.filter(
    (r) =>
      !r.address ||
      String(r.address).trim() === '' ||
      !r.city ||
      String(r.city).trim() === '' ||
      !r.state ||
      String(r.state).trim() === ''
  );

  if (toProcess.length === 0) {
    console.log('✅ No records missing address, city, or state.');
    return;
  }

  console.log(`📍 ${toProcess.length} records need address/city/state\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const name = row.property_name || 'Unnamed';
    const missing: string[] = [];
    if (!row.address || String(row.address).trim() === '') missing.push('address');
    if (!row.city || String(row.city).trim() === '') missing.push('city');
    if (!row.state || String(row.state).trim() === '') missing.push('state');

    console.log(`[${i + 1}/${toProcess.length}] ${name} (missing: ${missing.join(', ')})`);

    const lat = parseFloat(String(row.lat));
    const lon = parseFloat(String(row.lon));
    if (isNaN(lat) || isNaN(lon)) {
      console.log('  ❌ Invalid lat/lon\n');
      failed++;
      await sleep(1000);
      continue;
    }

    const result = await reverseGeocode(lat, lon);
    if (!result || (!result.address && !result.city && !result.state)) {
      console.log('  ❌ No address data from geocoding\n');
      failed++;
      await sleep(1000);
      continue;
    }

    const updateData: Partial<GlampingProperty> = {};
    if ((!row.address || String(row.address).trim() === '') && result.address) {
      updateData.address = result.address;
    }
    if ((!row.city || String(row.city).trim() === '') && result.city) {
      updateData.city = result.city;
    }
    if ((!row.state || String(row.state).trim() === '') && result.state) {
      updateData.state = result.state;
    }

    if (Object.keys(updateData).length === 0) {
      console.log('  ⏭️ No update needed\n');
      await sleep(1000);
      continue;
    }

    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ❌ Update error: ${updateError.message}\n`);
      failed++;
    } else {
      const parts: string[] = [];
      if (updateData.address) parts.push(`address: ${updateData.address}`);
      if (updateData.city) parts.push(`city: ${updateData.city}`);
      if (updateData.state) parts.push(`state: ${updateData.state}`);
      console.log(`  ✅ ${parts.join(', ')}\n`);
      updated++;
    }

    if (i < toProcess.length - 1) await sleep(1000);
  }

  console.log('='.repeat(50));
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  console.log('='.repeat(50));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
