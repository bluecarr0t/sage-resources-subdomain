#!/usr/bin/env tsx
/**
 * Backfill property_geocode from all_glamping_properties.{lat, lon}.
 *
 * Run:
 *   npx tsx scripts/backfill-property-geocode.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *
 * Idempotent: uses UPSERT, so re-running picks up new properties without
 * clobbering manually-edited rows (source='manual' is preserved).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 500;
const TTL_DAYS = 180;

async function main() {
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

  let offset = 0;
  let total = 0;
  let upserted = 0;

  while (true) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('id, lat, lon')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Fetch error at offset', offset, error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    const staleAfter = new Date(
      Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const rows = data
      .map((r) => {
        const lat = Number((r as { lat: unknown }).lat);
        const lon = Number((r as { lon: unknown }).lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        return {
          property_id: (r as { id: number }).id,
          latitude: lat,
          longitude: lon,
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
    `\nDone. Upserted ${upserted} / ${total} rows into property_geocode.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
