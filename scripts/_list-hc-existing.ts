#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const HILL_COUNTRY_CITIES = new Set([
  'fredericksburg', 'wimberley', 'wimberly', 'dripping springs', 'new braunfels',
  'san marcos', 'johnson city', 'marble falls', 'bandera', 'boerne',
  'kerrville', 'blanco', 'canyon lake', 'comfort', 'medina',
  'luckenbach', 'stonewall', 'burnet', 'llano', 'mason',
  'hunt', 'leakey', 'utopia', 'vanderpool', 'camp verde',
  'ingram', 'center point', 'harper', 'tarpley', 'pipe creek',
  'helotes', 'spring branch', 'lago vista', 'spicewood',
  'round mountain', 'hye', 'driftwood', 'concan', 'rio frio',
  'gruene', 'bulverde', 'fischer', 'mountain home', 'junction',
  'lakehills', 'mico', 'bergheim', 'sisterdale', 'waring',
  'kendalia', 'bertram', 'kingsland', 'horseshoe bay',
  'buchanan dam', 'tow', 'sunrise beach village', 'granite shoals',
  'seguin', 'kingsbury', 'willow city', 'cottonwood shores', 'elgin', 'kempner',
]);

const BOUNDS = { latMin: 29.4, latMax: 31.1, lonMin: -100.2, lonMax: -97.4 };

async function main() {
  let all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('all_glamping_properties')
      .select('property_name, city, state, url, unit_type, lat, lon')
      .ilike('state', '%TX%')
      .range(offset, offset + 999);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  const hillCountry = all.filter(r => {
    const city = (r.city || '').toLowerCase().trim();
    if (city && HILL_COUNTRY_CITIES.has(city)) return true;
    const lat = parseFloat(r.lat); const lon = parseFloat(r.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lon >= BOUNDS.lonMin && lon <= BOUNDS.lonMax;
    }
    return false;
  });

  const names = new Set<string>();
  const urls = new Set<string>();
  const unique: any[] = [];
  for (const r of hillCountry) {
    const key = (r.property_name || '').toLowerCase().trim();
    if (!names.has(key)) { names.add(key); unique.push(r); }
    if (r.url) urls.add(r.url.toLowerCase().trim());
  }
  unique.sort((a,b) => (a.city||'').localeCompare(b.city||'') || (a.property_name||'').localeCompare(b.property_name||''));
  unique.forEach((r,i) => console.log(`${i+1}. ${r.property_name} | ${r.city || '?'} | ${r.url || 'no url'}`));
  console.log(`\nTotal unique properties in DB: ${unique.length}`);
  
  // Output just names for dedup
  console.log('\n--- NAMES FOR DEDUP ---');
  names.forEach(n => console.log(n));
}

main().catch(console.error);
