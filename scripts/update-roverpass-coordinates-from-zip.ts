/**
 * Geocode zip codes in all_roverpass_data and populate lat/lon.
 * Fetches rows with zip_code but missing lat/lon, looks up coordinates per zip,
 * and updates the database.
 *
 * Usage: npx tsx scripts/update-roverpass-coordinates-from-zip.ts
 *
 * Uses Nominatim (free) by default. Set GOOGLE_MAPS_API_KEY for Google Geocoding.
 * Nominatim requires 1 second between requests.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const googleApiKey =
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const TABLE_NAME = 'all_roverpass_data';

/**
 * Geocode a zip code using Nominatim (free)
 */
async function geocodeZipNominatim(
  zipCode: string,
  state?: string | null,
  country?: string | null
): Promise<{ lat: number; lon: number } | null> {
  const parts = [zipCode?.trim(), state?.trim(), country?.trim() || 'USA'].filter(Boolean);
  const query = parts.join(', ');

  if (!query) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Sage-Resources-RoverPass-Geocoder/1.0' },
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
    console.error(`  ⚠ Nominatim error for "${query}":`, error);
    return null;
  }
}

/**
 * Geocode a zip code using Google Maps Geocoding API
 */
async function geocodeZipGoogle(
  zipCode: string,
  state?: string | null,
  country?: string | null
): Promise<{ lat: number; lon: number } | null> {
  const parts = [zipCode?.trim(), state?.trim(), country?.trim() || 'USA'].filter(Boolean);
  const query = parts.join(', ');

  if (!query || !googleApiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&key=${googleApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lon: loc.lng };
    }
    return null;
  } catch (error) {
    console.error(`  ⚠ Google Geocoding error for "${query}":`, error);
    return null;
  }
}

/**
 * Geocode zip (Google first if key available, else Nominatim)
 */
async function geocodeZip(
  zipCode: string,
  state?: string | null,
  country?: string | null
): Promise<{ lat: number; lon: number } | null> {
  if (googleApiKey) {
    const result = await geocodeZipGoogle(zipCode, state, country);
    if (result) return result;
  }
  return geocodeZipNominatim(zipCode, state, country);
}

async function main(): Promise<void> {
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('📖 Fetching rows with zip_code but missing lat/lon...');

  type Row = { id: number; zip_code: string | null; state: string | null; country: string | null; lat: number | null; lon: number | null };
  const rows: Row[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data: page, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('id, zip_code, state, country, lat, lon')
      .not('zip_code', 'is', null)
      .or('lat.is.null,lon.is.null')
      .range(offset, offset + pageSize - 1);

    if (fetchError) {
      console.error('❌', fetchError.message);
      process.exit(1);
    }
    if (!page?.length) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  if (!rows.length) {
    console.log('No rows need coordinates.');
    return;
  }

  console.log(`   Found ${rows.length} rows to geocode`);

  // Group by (zip_code, state, country) to minimize API calls
  const key = (r: { zip_code: string | null; state: string | null; country: string | null }) =>
    `${(r.zip_code || '').trim()}|${(r.state || '').trim()}|${(r.country || '').trim()}`;

  const byZip = new Map<
    string,
    { zip_code: string; state: string | null; country: string | null; ids: number[] }
  >();

  for (const row of rows) {
    const z = (row.zip_code || '').trim();
    if (!z) continue;

    const k = key(row);
    const existing = byZip.get(k);
    if (existing) {
      existing.ids.push(row.id);
    } else {
      byZip.set(k, {
        zip_code: z,
        state: row.state ?? null,
        country: row.country ?? null,
        ids: [row.id],
      });
    }
  }

  console.log(`   ${byZip.size} unique zip locations to look up\n`);

  if (googleApiKey) {
    console.log('Using Google Maps Geocoding API');
  } else {
    console.log('Using Nominatim (1s delay between requests)\n');
  }

  let updated = 0;
  let failed = 0;

  for (const [_, group] of byZip) {
    const { zip_code, state, country, ids } = group;
    const coords = await geocodeZip(zip_code, state, country);

    if (coords) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ lat: coords.lat, lon: coords.lon })
        .in('id', ids);

      if (error) {
        console.error(`  ❌ zip ${zip_code}:`, error.message);
        failed += ids.length;
      } else {
        updated += ids.length;
        console.log(`  ✓ ${zip_code} (${state || '?'}) → ${ids.length} rows`);
      }
    } else {
      failed += ids.length;
      console.log(`  ✗ ${zip_code} (${state || '?'}) → no result`);
    }

    // Nominatim requires 1 second between requests
    if (!googleApiKey) {
      await new Promise((r) => setTimeout(r, 1100));
    } else {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\n✅ Updated ${updated} rows`);
  if (failed > 0) {
    console.log(`⚠ ${failed} rows could not be geocoded`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
