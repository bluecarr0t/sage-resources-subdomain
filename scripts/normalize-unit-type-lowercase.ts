#!/usr/bin/env npx tsx
/**
 * Normalize all-lowercase unit_type values in all_glamping_properties to Title Case
 * and singular canonical labels (e.g. "yurts" -> "Yurt", "safari tents, yurts" ->
 * "Safari Tent, Yurt").
 *
 * Only updates rows where trim(unit_type) is entirely lowercase (ASCII-safe check).
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/normalize-unit-type-lowercase.ts
 *   npx tsx scripts/normalize-unit-type-lowercase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Exact match on trim(unit_type) when the stored value is all-lowercase. */
const LOWERCASE_TO_CANONICAL: Record<string, string> = {
  yurts: 'Yurt',
  'safari tents, lodges': 'Safari Tent, Lodge',
  'safari tents, yurts': 'Safari Tent, Yurt',
  'safari tents, treehouses': 'Safari Tent, Treehouse',
  cabins: 'Cabin',
  'luxury tents': 'Luxury Tent',
  'safari tents, cabins': 'Safari Tent, Cabin',
  tents: 'Tent',
  'yurts, safari tents': 'Yurt, Safari Tent',
  'safari tents, pods': 'Safari Tent, Pod',
  pods: 'Pod',
  'yurts, cabins': 'Yurt, Cabin',
  'yurts, treehouses': 'Yurt, Treehouse',
  domes: 'Dome',
  lodges: 'Lodge',
  'lodges, safari tents': 'Lodge, Safari Tent',
  'tents, cabins': 'Tent, Cabin',
  'treehouses, cabins': 'Treehouse, Cabin',
  'treehouses, safari tents': 'Treehouse, Safari Tent',
  'cabins, yurts': 'Cabin, Yurt',
  'canvas cottages': 'Canvas Cottage',
  'floating tents': 'Floating Tent',
  'luxury tents, cabins': 'Luxury Tent, Cabin',
  'safari tents, beach lodges': 'Safari Tent, Beach Lodge',
  'safari tents, chalets': 'Safari Tent, Chalet',
  'tents, lodges': 'Tent, Lodge',
  'tents, yurts': 'Tent, Yurt',
  treehouse: 'Treehouse',
  'yurts, bell tents': 'Yurt, Bell Tent',
  'yurts, eco-cottages': 'Yurt, Eco Cottage',
  'yurts, tipis': 'Yurt, Tipi',
  bothies: 'Bothy',
  'bubble tents': 'Bubble Tent',
  'bungalows, safari tents': 'Bungalow, Safari Tent',
  'cabins, safari tents': 'Cabin, Safari Tent',
  'cabins, tents, treehouses': 'Cabin, Tent, Treehouse',
  'cabins, treehouses': 'Cabin, Treehouse',
  'cave rooms': 'Cave Room',
  'chalets, treehouses': 'Chalet, Treehouse',
  'cottages, glamping pods': 'Cottage, Glamping Pod',
  'cube cabins': 'Cube Cabin',
  'domes, bell tents, cabins': 'Dome, Bell Tent, Cabin',
  'domes, pods': 'Dome, Pod',
  'domes, tents, cabins': 'Dome, Tent, Cabin',
  'eco cabins, tiny houses': 'Eco Cabin, Tiny Home',
  'eco-friendly tents': 'Eco-friendly Tent',
  'eco-houses, treehouses': 'Eco-house, Treehouse',
  'eco-lodges': 'Eco-lodge',
  'eco-lodges, bungalows': 'Eco-lodge, Bungalow',
  'eco-pods': 'Eco-pod',
  'geodesic domes': 'Geodesic Dome',
  'geodesic domes, treehouses': 'Geodesic Dome, Treehouse',
  'glamping tents': 'Glamping Tent',
  igloos: 'Igloo',
  'luxury rooms': 'Luxury Room',
  'luxury tents, bungalows': 'Luxury Tent, Bungalow',
  'luxury tents, pods': 'Luxury Tent, Pod',
  'luxury tents, villas': 'Luxury Tent, Villa',
  'open-air rooms': 'Open-air Room',
  'pods, cabins': 'Pod, Cabin',
  'pods, safari tents': 'Pod, Safari Tent',
  roulottes: 'Roulotte',
  'safari tents, beach houses': 'Safari Tent, Beach House',
  'safari tents, cabanas': 'Safari Tent, Cabana',
  'safari tents, cave houses': 'Safari Tent, Cave House',
  'safari tents, geodomes, pods': 'Safari Tent, Geodome, Pod',
  'safari tents, lodge tents': 'Safari Tent, Lodge Tent',
  'safari tents, mobile homes': 'Safari Tent, Mobile Home',
  'safari tents, treehouses, yurts': 'Safari Tent, Treehouse, Yurt',
  'safari tents, yurts, eco-suites': 'Safari Tent, Yurt, Eco-suite',
  'shepherd huts': 'Shepherd Hut',
  "shepherd's huts, treehouses": "Shepherd's Hut, Treehouse",
  'tents, mobile homes': 'Tent, Mobile Home',
  'tents, pods': 'Tent, Pod',
  'tents, safari tents': 'Tent, Safari Tent',
  tipis: 'Tipi',
  'treehouses, beach lodges': 'Treehouse, Beach Lodge',
  'treehouses, bell tents': 'Treehouse, Bell Tent',
  'treehouses, cottages': 'Treehouse, Cottage',
  'treehouses, huts': 'Treehouse, Hut',
  'treehouses, lodges': 'Treehouse, Lodge',
  'treehouses, pods': 'Treehouse, Pod',
  'treehouses, yurts': 'Treehouse, Yurt',
  'tree tents, bell tents': 'Tree Tent, Bell Tent',
  'tree tents, cabins': 'Tree Tent, Cabin',
  'trekkers huts, luxury tents': 'Trekkers Hut, Luxury Tent',
  'villas, tents': 'Villa, Tent',
  'wagonettes, safari tents': 'Wagonette, Safari Tent',
  'yurts, lodges': 'Yurt, Lodge',
  "yurts, pods, shepherd's huts": "Yurt, Pod, Shepherd's Hut",
  'yurts, treehouse': 'Yurt, Treehouse',
};

function isAllLowercase(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return t === t.toLowerCase();
}

async function main() {
  console.log(dryRun ? 'DRY RUN (no writes)\n' : 'APPLYING UPDATES\n');

  const pageSize = 1000;
  let offset = 0;
  let updated = 0;
  let scanned = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, unit_type')
      .not('unit_type', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!rows?.length) break;

    for (const row of rows) {
      scanned++;
      const raw = row.unit_type?.trim();
      if (!raw || !isAllLowercase(raw)) continue;

      if (!Object.prototype.hasOwnProperty.call(LOWERCASE_TO_CANONICAL, raw)) continue;

      const next = LOWERCASE_TO_CANONICAL[raw];
      if (next === raw) continue;

      if (dryRun) {
        console.log(`[${row.id}] ${row.property_name ?? '(no name)'}: "${raw}" → "${next}"`);
      } else {
        const { error: upErr } = await supabase
          .from('all_glamping_properties')
          .update({ unit_type: next, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (upErr) {
          console.error(`Failed id ${row.id}:`, upErr.message);
        } else {
          updated++;
          console.log(`  ✓ ${row.id}: "${raw}" → "${next}"`);
        }
      }
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  console.log(`\nScanned ${scanned} rows with unit_type.`);
  if (!dryRun) console.log(`Updated ${updated} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
