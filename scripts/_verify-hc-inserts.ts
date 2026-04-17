#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const ids = [11435, 11436, 11437, 11438, 11439];
  const { data, error } = await supabase.from('all_glamping_properties')
    .select('id, property_name, city, state, url, unit_type, quantity_of_units, rate_avg_retail_daily_rate, rate_category, operating_season_months, minimum_nights, unit_wifi, unit_hot_tub, unit_air_conditioning, unit_private_bathroom, property_waterfront, property_pool, activities_hiking, activities_swimming, river_stream_or_creek, setting_mountainous, research_status')
    .in('id', ids);
  if (error) { console.error(error); return; }
  for (const r of (data ?? [])) {
    console.log(`\n--- ${r.property_name} (${r.city}, ${r.state}) ---`);
    console.log(`  ID: ${r.id} | URL: ${r.url}`);
    console.log(`  Unit: ${r.unit_type} x${r.quantity_of_units} | Rate: $${r.rate_avg_retail_daily_rate ?? 'N/A'} | Category: ${r.rate_category}`);
    console.log(`  Season: ${r.operating_season_months}mo | Min nights: ${r.minimum_nights}`);
    console.log(`  WiFi: ${r.unit_wifi} | Hot tub: ${r.unit_hot_tub} | AC: ${r.unit_air_conditioning} | Private bath: ${r.unit_private_bathroom}`);
    console.log(`  Waterfront: ${r.property_waterfront} | Pool: ${r.property_pool}`);
    console.log(`  Hiking: ${r.activities_hiking} | Swimming: ${r.activities_swimming} | Creek: ${r.river_stream_or_creek} | Mountainous: ${r.setting_mountainous}`);
    console.log(`  Status: ${r.research_status}`);
  }
}
main().catch(console.error);
