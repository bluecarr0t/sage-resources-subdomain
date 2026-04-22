/**
 * Pull the full address context for the 9 mistagged-geo IDs so we can
 * determine the correct lat/lon for each.
 *
 * Run with: npx tsx scripts/inspect-mistagged-geo-rows.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const IDS = [10519, 10520, 10521, 10781, 10779, 10721, 9514, 9515, 9751];

async function main() {
  const { data, error } = await supabase
    .from('all_glamping_properties')
    .select('id,property_name,site_name,unit_type,address,city,state,zip_code,country,lat,lon,url,phone_number')
    .in('id', IDS);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!data) {
    console.error('No data');
    process.exit(1);
  }

  const sorted = [...data].sort((a, b) => a.id - b.id);
  console.log(JSON.stringify(sorted, null, 2));
}

main();
