#!/usr/bin/env tsx
/**
 * Backfill property_geocode from all_sage_data.{lat, lon}.
 *
 * Run:
 *   npx tsx scripts/backfill-property-geocode.ts
 *   npx tsx scripts/backfill-property-geocode.ts --geocode-missing --limit 50
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY (with --geocode-missing)
 *
 * Idempotent: skips property_geocode rows with source != 'db'. Re-running picks up new rows.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_GLAMPING_US_COUNTRY_CANONICAL } from '@/lib/all-glamping-properties-country';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { geocodeAddress } from '@/lib/geocode';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 500;
const TTL_DAYS = 180;
const GEOCODE_DELAY_MS = 200;

type SageRow = {
  id: number;
  lat: unknown;
  lon: unknown;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
};

function parseArgs() {
  let geocodeMissing = false;
  let limit = Infinity;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--geocode-missing') geocodeMissing = true;
    else if (a === '--limit' && process.argv[i + 1]) {
      limit = Number(process.argv[i + 1]);
      i++;
    }
  }
  return { geocodeMissing, limit };
}

function isValidCoord(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function coordsFromRow(row: SageRow): { lat: number; lon: number } | null {
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!isValidCoord(lat, lon)) return null;
  return { lat, lon };
}

function isMissingCoordsRow(row: SageRow): boolean {
  return coordsFromRow(row) == null;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function geocodeMissingUsRows(
  supabase: ReturnType<typeof createClient>,
  hardLimit: number
): Promise<number> {
  let offset = 0;
  let updated = 0;
  let processed = 0;

  while (processed < hardLimit) {
    const pageSize = Math.min(BATCH_SIZE, hardLimit - processed);
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, lat, lon, address, city, state, zip_code, country')
      .eq('country', ALL_GLAMPING_US_COUNTRY_CANONICAL)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Fetch error at offset', offset, error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    for (const raw of data as SageRow[]) {
      if (processed >= hardLimit) break;
      processed += 1;
      if (!isMissingCoordsRow(raw)) continue;

      const city = (raw.city ?? '').trim();
      const state = (raw.state ?? '').trim();
      if (!city && !state && !(raw.address ?? '').trim()) continue;

      const result = await geocodeAddress(
        raw.address ?? '',
        city,
        state,
        raw.zip_code ?? '',
        raw.country ?? ALL_GLAMPING_US_COUNTRY_CANONICAL
      );
      await sleep(GEOCODE_DELAY_MS);

      if (!result) continue;

      const { error: updateErr } = await supabase
        .from(ALL_SAGE_DATA_TABLE)
        .update({ lat: result.lat, lon: result.lng })
        .eq('id', raw.id);

      if (updateErr) {
        console.warn(`Failed to update lat/lon for id=${raw.id}:`, updateErr.message);
        continue;
      }
      updated += 1;
      console.log(`Geocoded id=${raw.id} → ${result.lat}, ${result.lng}`);
    }

    offset += data.length;
    if (data.length < pageSize) break;
  }

  console.log(`\nGeocode-missing pass: updated ${updated} US rows on ${ALL_SAGE_DATA_TABLE}.`);
  return updated;
}

async function backfillGeocodeCache(supabase: ReturnType<typeof createClient>) {
  let offset = 0;
  let total = 0;
  let upserted = 0;
  let skippedManual = 0;
  let skippedNoCoords = 0;

  while (true) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, lat, lon')
      .order('id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Fetch error at offset', offset, error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    const staleAfter = new Date(
      Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const ids = (data as SageRow[]).map((r) => r.id);
    const { data: existing } = await supabase
      .from('property_geocode')
      .select('property_id, source')
      .in('property_id', ids);

    const manualIds = new Set(
      (existing ?? [])
        .filter((r) => {
          const src = (r as { source?: string }).source;
          return src != null && src !== 'db';
        })
        .map((r) => (r as { property_id: number }).property_id)
    );

    const rows = (data as SageRow[])
      .map((r) => {
        if (manualIds.has(r.id)) {
          skippedManual += 1;
          return null;
        }
        const coords = coordsFromRow(r);
        if (!coords) {
          skippedNoCoords += 1;
          return null;
        }
        return {
          property_id: r.id,
          latitude: coords.lat,
          longitude: coords.lon,
          source: 'db' as const,
          confidence: 100,
          stale_after: staleAfter,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('property_geocode')
        .upsert(rows, { onConflict: 'property_id', ignoreDuplicates: false });
      if (upsertErr) {
        console.warn(
          `Upsert batch at offset ${offset} failed:`,
          upsertErr.message
        );
      } else {
        upserted += rows.length;
      }
    }

    total += data.length;
    offset += BATCH_SIZE;
    console.log(
      `[offset=${offset}] fetched=${data.length} upserted_total=${upserted}/${total}`
    );

    if (data.length < BATCH_SIZE) break;
  }

  console.log(
    `\nDone. Upserted ${upserted} / ${total} rows into property_geocode (skipped manual=${skippedManual}, no_coords=${skippedNoCoords}).`
  );
}

async function main() {
  const { geocodeMissing, limit } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (geocodeMissing) {
    await geocodeMissingUsRows(supabase, limit);
  }

  await backfillGeocodeCache(supabase);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
