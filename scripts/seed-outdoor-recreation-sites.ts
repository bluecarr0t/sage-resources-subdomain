#!/usr/bin/env npx tsx
/**
 * Apply outdoor_recreation_sites seed via Supabase service role.
 * Prefer running scripts/migrations/seed-outdoor-recreation-sites-2026-08-06.sql in SQL Editor
 * when RPC execute_sql is unavailable.
 *
 * Usage: npx tsx scripts/seed-outdoor-recreation-sites.ts
 */

import { createClient } from '@supabase/supabase-js';

const SITES = [
  { name: 'Smith Rock State Park', site_type: 'state_park', state: 'OR', latitude: 44.3679, longitude: -121.1406, source_id: 'smith-rock-or' },
  { name: 'Silver Falls State Park', site_type: 'state_park', state: 'OR', latitude: 44.8773, longitude: -122.6556, source_id: 'silver-falls-or' },
  { name: 'Garden of the Gods', site_type: 'outdoor_hub', state: 'CO', latitude: 38.8739, longitude: -104.8917, source_id: 'garden-gods-co' },
  { name: "Devil's Lake State Park", site_type: 'state_park', state: 'WI', latitude: 43.4147, longitude: -89.7134, source_id: 'devils-lake-wi' },
  { name: 'Dead Horse Point State Park', site_type: 'state_park', state: 'UT', latitude: 38.4828, longitude: -109.7394, source_id: 'dead-horse-ut' },
  { name: 'Palo Duro Canyon State Park', site_type: 'state_park', state: 'TX', latitude: 34.9847, longitude: -101.6667, source_id: 'palo-duro-tx' },
  { name: 'Pfeiffer Big Sur State Park', site_type: 'state_park', state: 'CA', latitude: 36.2503, longitude: -121.7828, source_id: 'pfeiffer-big-sur-ca' },
  { name: 'Letchworth State Park', site_type: 'state_park', state: 'NY', latitude: 42.5706, longitude: -78.0497, source_id: 'letchworth-ny' },
  { name: 'Hocking Hills State Park', site_type: 'state_park', state: 'OH', latitude: 39.4306, longitude: -82.5417, source_id: 'hocking-hills-oh' },
  { name: 'Custer State Park', site_type: 'state_park', state: 'SD', latitude: 43.7667, longitude: -103.4333, source_id: 'custer-sd' },
] as const;

async function main() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let ok = 0;
  for (const s of SITES) {
    const { error } = await supabase.from('outdoor_recreation_sites').upsert(
      {
        name: s.name,
        site_type: s.site_type,
        state: s.state,
        latitude: s.latitude,
        longitude: s.longitude,
        source: 'manual_seed',
        source_id: s.source_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source,source_id' }
    );
    if (error) console.warn(s.source_id, error.message);
    else ok += 1;
  }
  console.log(`Seeded ${ok}/${SITES.length} outdoor_recreation_sites (see migration SQL for full set)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
