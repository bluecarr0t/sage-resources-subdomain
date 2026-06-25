#!/usr/bin/env npx tsx
/**
 * Manual sync: all Job Numbers Google Sheet tabs → Supabase.
 * Run: npm run sync:project-pipeline
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { syncAllProjectPipelineSheetsToSupabase } from '../lib/project-pipeline/sync-to-supabase';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await syncAllProjectPipelineSheetsToSupabase(supabase);
  console.log('✓ Project pipeline sync complete');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
