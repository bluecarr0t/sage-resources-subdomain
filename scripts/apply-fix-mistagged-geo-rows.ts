/**
 * Apply lat/lon + state corrections for the 9 mistagged-geo rows in
 * all_glamping_properties identified by audit-geo-sanity-glamping-properties.ts.
 *
 * Mirrors scripts/migrations/fix-mistagged-geo-rows-2026-04.sql, but executes
 * via the Supabase JS client so it can run from a developer machine.
 *
 * By default this is a DRY RUN (prints what would change, makes no writes).
 * Pass --apply to actually perform the updates.
 *
 * Run with:
 *   npx tsx scripts/apply-fix-mistagged-geo-rows.ts             # dry run
 *   npx tsx scripts/apply-fix-mistagged-geo-rows.ts --apply     # commit changes
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APPLY = process.argv.includes('--apply');

type Patch = {
  ids: number[];
  expectedName: string;
  expectedState: string;
  set: { lat?: number; lon?: number; state?: string; city?: string };
  reason: string;
};

const PATCHES: Patch[] = [
  {
    ids: [10519, 10520, 10521],
    expectedName: 'Deerpath Cabins',
    expectedState: 'PA',
    set: { lat: 40.8587, lon: -76.2297 },
    reason: 'lat/lon was set to eastern Tennessee; correct to Ringtown, PA centroid',
  },
  {
    ids: [9515, 9751],
    expectedName: 'Under Canvas White Mountains',
    expectedState: 'NH',
    set: { lat: 44.3981, lon: -71.6622 },
    reason: 'lat/lon was set to eastern Tennessee; correct to Blakslee Rd, Dalton, NH',
  },
  {
    ids: [9514],
    expectedName: 'AutoCamp Hill Country',
    expectedState: 'TX',
    set: { lat: 30.3791, lon: -98.7826 },
    reason: 'lat/lon was set to southern California; correct to 7041 N State Hwy 16, Fredericksburg, TX',
  },
  {
    ids: [10721],
    expectedName: 'Moonlite Canopy',
    expectedState: 'BC',
    set: { state: 'MB' },
    reason: 'lat/lon is correct (Belmont, MB); state was wrong (BC -> MB)',
  },
  {
    ids: [10779, 10781],
    expectedName: 'Glamping Resorts - Castle Provincial Park',
    expectedState: 'SK',
    set: { state: 'AB', city: 'Beaver Mines' },
    reason: 'lat/lon is correct (Castle PP, Alberta); state was wrong (SK -> AB)',
  },
];

async function main() {
  console.log(APPLY ? '== APPLY mode ==' : '== DRY RUN mode (use --apply to commit) ==\n');

  const allIds = PATCHES.flatMap((p) => p.ids);
  const { data: before, error: beforeErr } = await supabase
    .from('all_glamping_properties')
    .select('id,property_name,city,state,country,lat,lon')
    .in('id', allIds);

  if (beforeErr || !before) {
    console.error('Failed to fetch current rows:', beforeErr);
    process.exit(1);
  }
  const beforeById = new Map(before.map((r) => [r.id, r]));

  for (const patch of PATCHES) {
    console.log(
      `\n--- ${patch.expectedName} (ids: ${patch.ids.join(', ')}) — ${patch.reason}`
    );

    for (const id of patch.ids) {
      const row = beforeById.get(id);
      if (!row) {
        console.log(`  id=${id}: NOT FOUND in DB; skipping`);
        continue;
      }
      if (row.property_name !== patch.expectedName) {
        console.log(
          `  id=${id}: property_name "${row.property_name}" != expected "${patch.expectedName}"; skipping`
        );
        continue;
      }
      if (row.state !== patch.expectedState) {
        console.log(
          `  id=${id}: state "${row.state}" != expected "${patch.expectedState}"; skipping (already changed?)`
        );
        continue;
      }

      const beforeStr = JSON.stringify({ lat: row.lat, lon: row.lon, state: row.state, city: row.city });
      const afterStr = JSON.stringify({ ...row, ...patch.set });
      console.log(`  id=${id}  before: ${beforeStr}`);
      console.log(`  id=${id}  after : ${afterStr}`);

      if (APPLY) {
        const { error: updErr, count } = await supabase
          .from('all_glamping_properties')
          .update(patch.set, { count: 'exact' })
          .eq('id', id)
          .eq('property_name', patch.expectedName)
          .eq('state', patch.expectedState);
        if (updErr) {
          console.error(`  id=${id}  UPDATE FAILED:`, updErr);
          process.exitCode = 1;
        } else {
          console.log(`  id=${id}  UPDATED (rows=${count ?? '?'})`);
        }
      }
    }
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to commit these changes.');
    return;
  }

  // Verify after
  const { data: after, error: afterErr } = await supabase
    .from('all_glamping_properties')
    .select('id,property_name,city,state,country,lat,lon')
    .in('id', allIds)
    .order('id', { ascending: true });
  if (afterErr || !after) {
    console.error('Failed to fetch post-update rows:', afterErr);
    process.exit(1);
  }
  console.log('\n=== Post-update state ===');
  for (const r of after) {
    console.log(
      `  id=${String(r.id).padStart(6)}  ${(r.property_name ?? '').slice(0, 42).padEnd(42)}  ${(r.city ?? '').slice(0, 18).padEnd(18)}  state=${(r.state ?? '').padEnd(4)}  country=${(r.country ?? '').padEnd(7)}  lat=${r.lat}, lon=${r.lon}`
    );
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
