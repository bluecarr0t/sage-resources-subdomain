#!/usr/bin/env npx tsx
/**
 * Batch-normalize `unit_type` on all_glamping_properties: one label per row,
 * singular, consistent casing (see `normalizeGlampingUnitTypeForStorage`).
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/normalize-all-glamping-unit-types.ts
 *   npx tsx scripts/normalize-all-glamping-unit-types.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(dryRun ? 'DRY RUN (no writes)\n' : 'APPLYING UPDATES\n');

  const pageSize = 1000;
  let offset = 0;
  let updated = 0;
  let examined = 0;

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
      examined++;
      const raw = row.unit_type?.trim();
      if (!raw) continue;

      const next = normalizeGlampingUnitTypeForStorage(raw);
      if (next == null || next === raw) continue;

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
          if (updated <= 50) {
            console.log(`  ✓ ${row.id}: "${raw}" → "${next}"`);
          }
        }
      }
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  console.log(`\nExamined ${examined} row(s) with non-null unit_type.`);
  if (!dryRun) console.log(`Updated ${updated} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
