/**
 * One-off smoke test: public (anon) vs service-role access after RLS hardening.
 * Run: npx tsx scripts/smoke-public-supabase-access.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function check(
  label: string,
  p: PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>
) {
  const { data, error, count } = await p;
  const rows = Array.isArray(data) ? data.length : data ? 1 : 0;
  const countPart = typeof count === 'number' ? ` count=${count}` : '';
  console.log(
    `${label}:`,
    error ? `FAIL ${error.message}` : `OK rows=${rows}${countPart}`
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !service) {
    throw new Error('Missing Supabase env vars in .env.local');
  }

  const anonClient = createClient(url, anon);
  const serviceClient = createClient(url, service);

  console.log('--- Public / anon (should succeed for map inventory) ---');
  await check(
    'anon all_sage_data',
    anonClient
      .from('all_sage_data')
      .select('id')
      .eq('research_status', 'published')
      .limit(3)
  );
  await check(
    'anon national-parks',
    anonClient.from('national-parks').select('id').limit(3)
  );
  await check('anon airports', anonClient.from('airports').select('id').limit(3));
  await check(
    'anon glamping_brands',
    anonClient.from('glamping_brands').select('id').limit(3)
  );
  {
    const { data, error } = await anonClient.rpc('brand_ids_for_slug_rollup', {
      p_brand_slug: 'postcard-cabins',
      p_include_sub_brands: true,
    });
    console.log(
      'anon brand_ids_for_slug_rollup:',
      error ? `FAIL ${error.message}` : `OK ${JSON.stringify(data)?.slice(0, 120)}`
    );
  }

  console.log('\n--- Sensitive (anon should fail) ---');
  await check(
    'anon reports',
    anonClient.from('reports').select('id').limit(1)
  );
  await check(
    'anon managed_users',
    anonClient.from('managed_users').select('id').limit(1)
  );
  {
    const { error } = await anonClient.rpc('get_glamping_metrics');
    console.log(
      'anon get_glamping_metrics:',
      error ? `BLOCKED ${error.message}` : 'UNEXPECTED OK'
    );
  }

  console.log('\n--- Service role (public pages / APIs use this) ---');
  await check(
    'service all_sage_data',
    serviceClient
      .from('all_sage_data')
      .select('id')
      .eq('research_status', 'published')
      .limit(3)
  );
  await check(
    'service published count',
    serviceClient
      .from('all_sage_data')
      .select('id', { count: 'exact', head: true })
      .eq('research_status', 'published')
  );
  await check(
    'service reports',
    serviceClient.from('reports').select('id').limit(3)
  );
  await check(
    'service client-work style reports',
    serviceClient.from('reports').select('id, city, state').is('deleted_at', null).limit(5)
  );
  {
    const { data, error } = await serviceClient.rpc('get_glamping_metrics');
    console.log(
      'service get_glamping_metrics:',
      error ? `FAIL ${error.message}` : `OK keys=${Object.keys(data || {}).join(',')}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
