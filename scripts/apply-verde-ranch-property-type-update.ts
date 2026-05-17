/**
 * Applies the same updates as
 * scripts/migrations/verde-ranch-rv-resort-property-type-glamping-2026-05-17.sql
 * via Supabase JS (no generic SQL RPC required).
 *
 * Run: npx tsx scripts/apply-verde-ranch-property-type-update.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const day = new Date().toISOString().slice(0, 10);

  const { data: v1, error: e1 } = await supabase
    .from('all_glamping_properties')
    .update({
      property_type: 'RV Resort',
      is_glamping_property: 'No',
      date_updated: day,
    })
    .in('property_name', ['Verde Ranch Resort', 'Verde Ranch RV Resort'])
    .select('id');

  if (e1) {
    console.error('Verde Ranch update failed:', e1.message);
    process.exit(1);
  }
  console.log(`Verde Ranch rows updated: ${v1?.length ?? 0}`);

  const { data: v2, error: e2 } = await supabase
    .from('all_glamping_properties')
    .update({ property_type: 'Glamping', date_updated: day })
    .eq('is_glamping_property', 'Yes')
    .ilike('property_type', '%Glamping Resort%')
    .neq('property_type', 'Glamping')
    .select('id');

  if (e2) {
    console.error('Glamping Resort* → Glamping failed:', e2.message);
    process.exit(1);
  }
  console.log(`Glamping Resort* → Glamping rows: ${v2?.length ?? 0}`);

  const { data: v3a, error: e3a } = await supabase
    .from('all_glamping_properties')
    .update({ property_type: 'Glamping', date_updated: day })
    .eq('is_glamping_property', 'Yes')
    .is('property_type', null)
    .select('id');

  if (e3a) {
    console.error('NULL property_type → Glamping failed:', e3a.message);
    process.exit(1);
  }

  const { data: v3b, error: e3b } = await supabase
    .from('all_glamping_properties')
    .update({ property_type: 'Glamping', date_updated: day })
    .eq('is_glamping_property', 'Yes')
    .eq('property_type', '')
    .select('id');

  if (e3b) {
    console.error('Empty property_type → Glamping failed:', e3b.message);
    process.exit(1);
  }

  console.log(
    `NULL / empty type (Yes) → Glamping rows: ${(v3a?.length ?? 0) + (v3b?.length ?? 0)}`
  );

  const { data: v4, error: e4 } = await supabase
    .from('all_glamping_properties')
    .update({ property_type: 'Unknown', date_updated: day })
    .eq('is_glamping_property', 'No')
    .eq('property_type', 'Glamping')
    .select('id');

  if (e4) {
    console.error('No + Glamping → Unknown failed:', e4.message);
    process.exit(1);
  }
  console.log(`No + Glamping → Unknown rows: ${v4?.length ?? 0}`);

  console.log('Done.');
}

main();
