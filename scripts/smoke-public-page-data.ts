/**
 * Smoke-test SSR-style service-role fetches used by non-admin pages.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, service);

  const published = await supabase
    .from('all_sage_data')
    .select('id', { count: 'exact', head: true })
    .eq('research_status', 'published');
  console.log('published count', published.count, published.error?.message);

  const ca = await supabase
    .from('all_sage_data')
    .select('id', { count: 'exact', head: true })
    .eq('research_status', 'published')
    .ilike('state', 'CA');
  console.log('CA published', ca.count, ca.error?.message);

  const parks = await supabase.from('national-parks').select('id', { count: 'exact', head: true });
  console.log('national-parks', parks.count, parks.error?.message);

  const brands = await supabase.from('glamping_brands').select('id, brand_name').limit(3);
  console.log(
    'glamping_brands',
    brands.error?.message || brands.data?.map((b) => b.brand_name || b.id).join(', ')
  );

  const airports = await supabase.from('airports').select('id', { count: 'exact', head: true });
  console.log('airports', airports.count, airports.error?.message);

  const clientWork = await supabase
    .from('reports')
    .select('id')
    .is('deleted_at', null)
    .limit(5);
  console.log(
    'reports for client-work',
    clientWork.error?.message || `rows=${clientWork.data?.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
