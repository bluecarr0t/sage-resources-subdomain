#!/usr/bin/env npx tsx
/**
 * Set service = 'feasibility_study' for all Past Reports (non-deleted).
 *
 * Usage: npx tsx scripts/set-all-reports-service-feasibility-study.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('reports')
    .update({ service: 'feasibility_study' })
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error('Error updating reports:', error.message);
    process.exit(1);
  }

  const count = data?.length ?? 0;
  console.log(`Updated ${count} report(s) to service = "Feasibility Study"`);
}

main();
