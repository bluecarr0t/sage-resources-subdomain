/**
 * Apply rename-property-ota-platforms-to-third-party migration.
 * Run: npx tsx scripts/apply-rename-third-party-platforms-migration.ts
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const SQL_PATH = resolve(
  process.cwd(),
  'scripts/migrations/rename-property-ota-platforms-to-third-party-2026-05-20.sql'
);

async function main() {
  const { createServerClient } = await import('@/lib/supabase');
  const supabase = createServerClient();
  const sql = readFileSync(SQL_PATH, 'utf8');

  const { error } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle();
  if (error) {
    const msg = String(error.message ?? error);
    if (msg.includes('exec_sql') || msg.includes('PGRST202')) {
      console.error(
        'exec_sql RPC not available. Run scripts/migrations/rename-property-ota-platforms-to-third-party-2026-05-20.sql in the Supabase SQL editor.'
      );
      process.exit(1);
    }
    if (msg.includes('does not exist') && msg.includes('property_ota_platforms')) {
      console.log('✓ Column already renamed (property_ota_platforms not found)');
      return;
    }
    console.error('Migration failed:', error);
    process.exit(1);
  }
  console.log('✓ Renamed property_ota_platforms → third_party_platforms');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
