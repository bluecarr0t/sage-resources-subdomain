#!/usr/bin/env npx tsx
/**
 * Normalize known unit_type aliases in all_glamping_properties to match canonical
 * labels used elsewhere (e.g. "Safari Tent", "Treehouse") and title-case combined types.
 *
 * Background: EU OpenAI research imports used lowercase plurals ("safari tents",
 * "treehouses"); US/legacy rows use Title Case. Comma-separated values are valid
 * multi-inventory labels but need consistent casing for aggregation.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/normalize-unit-type-aliases.ts   # log only
 *   npx tsx scripts/normalize-unit-type-aliases.ts              # apply updates
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

/**
 * Exact full-string replacements (trimmed match).
 * Order: multi-type strings before simpler aliases if overlapping (not here).
 */
const EXACT_ALIASES: Record<string, string> = {
  // Align with dominant bucket "Safari Tent" (singular product type label)
  'safari tents': 'Safari Tent',
  'treehouses': 'Treehouse',
  // Title-case each segment; keep multi-inventory explicit
  'safari tents, bungalows': 'Safari Tent, Bungalow',
  'Airstreams, beach cabins': 'Airstream, Beach Cabin',
};

async function main() {
  console.log(dryRun ? 'DRY RUN (no writes)\n' : 'APPLYING UPDATES\n');

  const pageSize = 1000;
  let offset = 0;
  let updated = 0;

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
      const raw = row.unit_type?.trim();
      if (!raw) continue;

      if (!Object.prototype.hasOwnProperty.call(EXACT_ALIASES, raw)) continue;

      const next = EXACT_ALIASES[raw];
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

  if (!dryRun) console.log(`\nUpdated ${updated} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
