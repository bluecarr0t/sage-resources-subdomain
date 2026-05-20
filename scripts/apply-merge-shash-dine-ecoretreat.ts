#!/usr/bin/env npx tsx
/**
 * Apply merge-shash-dine-ecoretreat-2026-05-20.sql
 *
 * Usage:
 *   npx tsx scripts/apply-merge-shash-dine-ecoretreat.ts --dry-run
 *   npx tsx scripts/apply-merge-shash-dine-ecoretreat.ts
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL_PID = '3f8fb0d0-a949-401e-8b08-096e6f1a1a17';
const MERGE_IDS = [9936, 10308, 10378, 10557];
const ALL_IDS = [9645, 9646, 9647, 9936, 10308, 10309, 10378, 10379, 10415, 10557, 10558];

async function main() {
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: before } = await supabase
    .from('all_glamping_properties')
    .select('id, property_name, site_name, slug, property_id, city')
    .or('property_name.ilike.%Shash Dine%');

  console.log('Before:', before?.length, 'rows');
  const pids = new Set(before?.map((r) => r.property_id));
  console.log('Distinct property_id:', [...pids]);

  if (DRY_RUN) {
    console.log('\n[dry-run] Would merge', MERGE_IDS, 'into', CANONICAL_PID);
    return;
  }

  const sql = readFileSync(
    resolve(process.cwd(), 'scripts/migrations/merge-shash-dine-ecoretreat-2026-05-20.sql'),
    'utf8'
  );

  const { error } = await supabase.rpc('exec_sql', { query: sql });
  if (error?.message?.includes('exec_sql')) {
    const updates = {
      property_name: "Shash Dine' EcoRetreat",
      slug: 'shash-dine-ecoretreat',
      property_id: CANONICAL_PID,
      city: 'Page',
      state: 'AZ',
      country: 'United States',
      url: 'https://www.shashdine.com/',
      address: 'Hwy 89 Navajo Route 6211',
      is_glamping_property: 'Yes',
      is_open: 'Yes',
      research_status: 'published',
      property_type: 'Glamping',
      land_operator_category: 'private_commercial',
      date_updated: '2026-05-20',
    };

    const { error: e1 } = await supabase
      .from('all_glamping_properties')
      .update({
        ...updates,
        notes:
          'Merge (May 2026): Combined duplicate list entry "Shash Dine" into Shash Dine\' EcoRetreat.',
      })
      .in('id', MERGE_IDS);
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from('all_glamping_properties')
      .update(updates)
      .in('id', ALL_IDS);
    if (e2) throw e2;

    console.log('Applied via Supabase client updates (no exec_sql RPC).');
  } else if (error) {
    throw error;
  } else {
    console.log('Applied SQL migration.');
  }

  const { data: after } = await supabase
    .from('all_glamping_properties')
    .select('id, property_name, site_name, slug, property_id, city')
    .or('property_name.ilike.%Shash Dine%')
    .order('id');

  console.log('\nAfter:', after?.length, 'rows');
  for (const r of after ?? []) {
    console.log(`  ${r.id} | ${r.site_name} | ${r.property_id} | ${r.slug}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
