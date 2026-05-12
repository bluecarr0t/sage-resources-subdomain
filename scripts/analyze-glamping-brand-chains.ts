#!/usr/bin/env npx tsx
/**
 * Print top multi-location glamping brand rollups using
 * `public.top_multi_location_chains` (apply
 * `scripts/migrations/sage-ai-top-multi-location-chains-rpc.sql` in Supabase first).
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type ChainRow = {
  chain_label: string;
  reported_brand_locations: number | null;
  earliest_site_year: number | null;
  properties_in_sage: number;
  total_glamping_units_in_sage: number;
  sample_property_name: string | null;
  sample_city: string | null;
  sample_state: string | null;
  sample_country: string | null;
};

async function main() {
  const established = await supabase.rpc('top_multi_location_chains', {
    p_limit: 25,
    p_min_reported_locations: 2,
    p_min_chain_age_years: 5,
    p_country: null,
    p_is_open: 'Yes',
    p_is_glamping_property: 'Yes',
  });

  if (established.error) {
    console.error('RPC top_multi_location_chains failed:', established.error.message);
    process.exit(1);
  }

  const anyAge = await supabase.rpc('top_multi_location_chains', {
    p_limit: 25,
    p_min_reported_locations: 2,
    p_min_chain_age_years: null,
    p_country: null,
    p_is_open: 'Yes',
    p_is_glamping_property: 'Yes',
  });

  if (anyAge.error) {
    console.error('RPC (no age filter) failed:', anyAge.error.message);
    process.exit(1);
  }

  const fmt = (rows: ChainRow[]) =>
    rows.map((r, i) => ({
      rank: i + 1,
      chain: r.chain_label,
      reported_locations: r.reported_brand_locations,
      first_year: r.earliest_site_year,
      properties_in_sage: r.properties_in_sage,
      units_in_sage: r.total_glamping_units_in_sage,
      sample: r.sample_property_name?.slice(0, 52) ?? '',
    }));

  console.log(
    'Top multi-location chains (open, glamping, number_of_locations≥2, established 5+ yrs)\n'
  );
  console.table(fmt((established.data ?? []) as ChainRow[]));

  console.log('\nSame filters but NO establishment-year filter (min_chain_age_years = null)\n');
  console.table(fmt((anyAge.data ?? []) as ChainRow[]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
