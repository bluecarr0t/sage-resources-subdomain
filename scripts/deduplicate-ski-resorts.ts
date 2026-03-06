#!/usr/bin/env npx tsx
/**
 * Analyze ski_resorts table for duplicates and remove them.
 *
 * Duplicates are identified by:
 * - Exact name + country match
 * - Fuzzy name similarity (>= 0.85) + same state_province + country
 * - One name contains the other (e.g. "Vail" vs "Vail Ski Resort") + same location
 *
 * When duplicates exist, keeps the record with more non-null fields (richest data).
 *
 * Usage:
 *   npx tsx scripts/deduplicate-ski-resorts.ts           # Dry run - report only
 *   npx tsx scripts/deduplicate-ski-resorts.ts --delete   # Actually remove duplicates
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'ski_resorts';
const NAME_SIMILARITY_THRESHOLD = 0.85;

interface SkiResortRow {
  id: number;
  name: string | null;
  state_province: string | null;
  country: string | null;
  city: string | null;
  [key: string]: unknown;
}

function normalize(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.95;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  let matches = 0;
  const minLen = Math.min(na.length, nb.length);
  for (let i = 0; i < minLen; i++) {
    if (na[i] === nb[i]) matches++;
  }
  return matches / maxLen;
}

function countNonNullFields(row: SkiResortRow): number {
  let count = 0;
  for (const v of Object.values(row)) {
    if (v !== null && v !== undefined && String(v).trim() !== '') count++;
  }
  return count;
}

function isDuplicate(a: SkiResortRow, b: SkiResortRow): boolean {
  const nameA = (a.name || '').trim();
  const nameB = (b.name || '').trim();
  const stateA = normalize(a.state_province);
  const stateB = normalize(b.state_province);
  const countryA = (a.country || 'USA').trim();
  const countryB = (b.country || 'USA').trim();

  if (countryA !== countryB) return false;

  const nameSim = similarity(nameA, nameB);
  if (nameSim < NAME_SIMILARITY_THRESHOLD) return false;

  if (stateA && stateB && stateA !== stateB) return false;
  return true;
}

async function main() {
  const doDelete = process.argv.includes('--delete');

  console.log('🏔️  Ski Resorts Duplicate Analysis\n');
  console.log(`   Mode: ${doDelete ? 'DELETE duplicates' : 'DRY RUN (use --delete to remove)'}\n`);

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, name, state_province, country, city')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Error fetching ski_resorts:', error.message);
    process.exit(1);
  }

  const all = (rows || []) as SkiResortRow[];
  console.log(`📊 Total rows: ${all.length}\n`);

  const seen = new Set<number>();
  const duplicateGroups: SkiResortRow[][] = [];
  const idsToDelete: number[] = [];

  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (seen.has(a.id)) continue;

    const group: SkiResortRow[] = [a];
    seen.add(a.id);

    for (let j = i + 1; j < all.length; j++) {
      const b = all[j];
      if (seen.has(b.id)) continue;
      if (isDuplicate(a, b)) {
        group.push(b);
        seen.add(b.id);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
      group.sort((x, y) => countNonNullFields(y) - countNonNullFields(x));
      for (let k = 1; k < group.length; k++) {
        idsToDelete.push(group[k].id);
      }
    }
  }

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates found.');
    return;
  }

  console.log(`⚠️  Found ${duplicateGroups.length} duplicate group(s), ${idsToDelete.length} row(s) to remove:\n`);

  for (const group of duplicateGroups) {
    const keep = group[0];
    const remove = group.slice(1);
    console.log(`  KEEP: "${keep.name}" (id=${keep.id}, ${keep.city}, ${keep.state_province}, ${keep.country}) [${countNonNullFields(keep)} fields]`);
    for (const r of remove) {
      console.log(`  REMOVE: "${r.name}" (id=${r.id}, ${r.city}, ${r.state_province}, ${r.country}) [${countNonNullFields(r)} fields]`);
    }
    console.log('');
  }

  if (idsToDelete.length === 0) return;

  if (!doDelete) {
    console.log(`\nRun with --delete to remove ${idsToDelete.length} duplicate row(s).`);
    return;
  }

  console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate row(s)...`);

  const BATCH = 50;
  for (let i = 0; i < idsToDelete.length; i += BATCH) {
    const batch = idsToDelete.slice(i, i + BATCH);
    const { error: delError } = await supabase.from(TABLE).delete().in('id', batch);
    if (delError) {
      console.error('❌ Delete error:', delError.message);
      process.exit(1);
    }
    console.log(`   Deleted batch ${Math.floor(i / BATCH) + 1}: ${batch.length} rows`);
  }

  console.log(`\n✅ Done. Removed ${idsToDelete.length} duplicates. ${all.length - idsToDelete.length} rows remain.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
