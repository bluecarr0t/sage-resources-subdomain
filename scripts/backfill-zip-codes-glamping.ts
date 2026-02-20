#!/usr/bin/env npx tsx
/**
 * Backfill zip_code for all_glamping_properties records missing it.
 *
 * - For records with lat/lon: uses Nominatim reverse geocoding to get postal code
 * - For records without lat/lon: forward geocodes address+city+state+country, then reverse geocodes
 *
 * Usage: npx tsx scripts/backfill-zip-codes-glamping.ts
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
  zip_code: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Reverse geocode coordinates to get postal code using Google Maps API
 */
async function reverseGeocodeGoogle(lat: number, lon: number): Promise<string | null> {
  if (!googleApiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    const comps = data.results[0]?.address_components || [];
    const postal = comps.find((c: { types: string[] }) => c.types.includes('postal_code'));
    return postal?.long_name || postal?.short_name || null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates using BigDataCloud (free, no API key)
 */
async function reverseGeocodeBigDataCloud(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const response = await fetch(url);
    const data = await response.json();
    return data?.postcode ? String(data.postcode) : null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates to get postal code (Nominatim → BigDataCloud → Google)
 */
async function reverseGeocode(
  lat: number,
  lon: number,
  retries = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Sage-Glamping-Zip-Backfill/1.0' },
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await sleep(2000);
          continue;
        }
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const postcode = data?.address?.postcode;
      if (postcode) return String(postcode);

      // Fallback: BigDataCloud (free, good coverage for remote areas)
      const bdcPostcode = await reverseGeocodeBigDataCloud(lat, lon);
      if (bdcPostcode) return bdcPostcode;

      // Fallback: Google if API key available
      const googlePostcode = await reverseGeocodeGoogle(lat, lon);
      if (googlePostcode) return googlePostcode;

      return null;
    } catch (error) {
      if (attempt === retries) {
        const bdcPostcode = await reverseGeocodeBigDataCloud(lat, lon);
        if (bdcPostcode) return bdcPostcode;
        const googlePostcode = await reverseGeocodeGoogle(lat, lon);
        if (googlePostcode) return googlePostcode;
        console.error(`  ❌ Reverse geocode failed: ${error instanceof Error ? error.message : 'Unknown'}`);
        return null;
      }
      await sleep(1000);
    }
  }
  return null;
}

/**
 * Forward geocode address using Google Maps API
 */
async function forwardGeocodeGoogle(
  address: string | null,
  city: string | null,
  state: string | null,
  country: string | null
): Promise<{ lat: number; lon: number } | null> {
  if (!googleApiKey) return null;
  const parts = [address?.trim(), city?.trim(), state?.trim(), country?.trim() || 'USA'].filter(
    Boolean
  );
  const query = parts.join(', ');
  if (!query) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lon: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Forward geocode address to get lat/lon (Nominatim, with Google fallback)
 */
async function forwardGeocode(
  address: string | null,
  city: string | null,
  state: string | null,
  country: string | null
): Promise<{ lat: number; lon: number } | null> {
  const parts = [address?.trim(), city?.trim(), state?.trim(), country?.trim() || 'USA'].filter(
    Boolean
  );
  const query = parts.join(', ');
  if (!query) return null;

  // Try Google first if available
  const googleResult = await forwardGeocodeGoogle(address, city, state, country);
  if (googleResult) return googleResult;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Sage-Glamping-Zip-Backfill/1.0' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error(`  ⚠ Forward geocode failed for "${query}":`, error);
    return null;
  }
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📖 Fetching records missing zip_code...');
  if (googleApiKey) console.log('   (Google Maps API key found – will use as fallback)\n');
  else console.log('   (Using Nominatim only; set GOOGLE_MAPS_API_KEY for better coverage)\n');

  const PAGE_SIZE = 2000;
  const allRows: GlampingProperty[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: page, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id, property_name, address, city, state, country, lat, lon, zip_code')
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
      process.exit(1);
    }
    if (!page?.length) break;
    allRows.push(...(page as GlampingProperty[]));
    offset += PAGE_SIZE;
    hasMore = page.length === PAGE_SIZE;
  }

  const toProcess = allRows.filter(
    (r) => !r.zip_code || String(r.zip_code).trim() === ''
  );

  if (toProcess.length === 0) {
    console.log('✅ No records missing zip_code.');
    return;
  }

  console.log(`📍 ${toProcess.length} records need zip_code\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const name = row.property_name || 'Unnamed';
    console.log(`[${i + 1}/${toProcess.length}] ${name}`);

    let lat: number;
    let lon: number;

    if (row.lat != null && row.lon != null) {
      lat = parseFloat(String(row.lat));
      lon = parseFloat(String(row.lon));
      if (isNaN(lat) || isNaN(lon)) {
        console.log('  ⚠ Invalid lat/lon, trying forward geocode...');
        const coords = await forwardGeocode(row.address, row.city, row.state, row.country);
        if (!coords) {
          console.log('  ❌ Could not geocode\n');
          failed++;
          await sleep(1000);
          continue;
        }
        lat = coords.lat;
        lon = coords.lon;
      }
    } else {
      const coords = await forwardGeocode(row.address, row.city, row.state, row.country);
      if (!coords) {
        console.log('  ❌ No coords and forward geocode failed\n');
        failed++;
        await sleep(1000);
        continue;
      }
      lat = coords.lat;
      lon = coords.lon;
    }

    let zipCode = await reverseGeocode(lat, lon);

    // If reverse failed but we have address, try forward geocode then reverse (address-based point may have postal code)
    if (!zipCode && (row.address || row.city)) {
      const coords = await forwardGeocode(row.address, row.city, row.state, row.country);
      if (coords) {
        zipCode = await reverseGeocode(coords.lat, coords.lon);
      }
    }

    if (!zipCode) {
      failed++;
      await sleep(1000);
      continue;
    }

    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ zip_code: zipCode })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ❌ Update error: ${updateError.message}\n`);
      failed++;
    } else {
      console.log(`  ✅ zip_code: ${zipCode}\n`);
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
