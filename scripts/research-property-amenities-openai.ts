#!/usr/bin/env npx tsx
/**
 * Research property_* amenities, year_site_opened, operating_season_months, number_of_locations
 * for all in_progress records using OpenAI.
 *
 * Only updates: property_laundry, property_playground, property_pool, property_food_on_site,
 * property_sauna, property_hot_tub, property_restaurant, property_dog_park, property_clubhouse,
 * property_alcohol_available, property_golf_cart_rental, property_waterpark, property_general_store,
 * property_waterfront, property_pickball_courts, property_extended_stay, property_family_friendly,
 * property_remote_work_friendly, property_fitness_room, property_propane_refilling_station,
 * year_site_opened, operating_season_months, number_of_locations.
 *
 * Usage:
 *   npx tsx scripts/research-property-amenities-openai.ts
 *   npx tsx scripts/research-property-amenities-openai.ts --limit 10
 *   npx tsx scripts/research-property-amenities-openai.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const DELAY_MS = 2000;

const PROPERTY_YES_NO_COLUMNS = [
  'property_laundry',
  'property_playground',
  'property_pool',
  'property_food_on_site',
  'property_sauna',
  'property_hot_tub',
  'property_restaurant',
  'property_dog_park',
  'property_clubhouse',
  'property_alcohol_available',
  'property_golf_cart_rental',
  'property_waterpark',
  'property_general_store',
  'property_waterfront',
  'property_pickball_courts',
  'property_extended_stay',
  'property_family_friendly',
  'property_remote_work_friendly',
  'property_fitness_room',
  'property_propane_refilling_station',
] as const;

const ALLOWED_KEYS = new Set([
  ...PROPERTY_YES_NO_COLUMNS,
  'year_site_opened',
  'operating_season_months',
  'number_of_locations',
]);

interface PropertyRow {
  id: number;
  property_name: string | null;
  site_name: string | null;
  url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeYesNo(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  return null;
}

function buildContext(p: PropertyRow): string {
  const parts = [
    `Property: ${p.property_name ?? 'Unknown'}`,
    p.site_name ? `Site: ${p.site_name}` : null,
    `URL: ${p.url ?? 'Not provided'}`,
    `Address: ${p.address ?? 'Not provided'}`,
    `Location: ${[p.city, p.state, p.country].filter(Boolean).join(', ') || 'Not provided'}`,
  ];
  return parts.filter(Boolean).join('\n');
}

async function researchPropertyAmenities(
  property: PropertyRow
): Promise<Record<string, unknown>> {
  const context = buildContext(property);

  const prompt = `You are a research assistant for a glamping/camping directory. Research this property using your knowledge of the property name, location, and website.

${context}

Return a JSON object with ONLY these fields. Use null for unknown. For Yes/No fields use exactly "Yes" or "No".

1. year_site_opened - Year the property/site opened (number, e.g. 2018, 2020)
2. operating_season_months - Number of months operating (1-12), e.g. 12 for year-round, 7 for April-October
3. number_of_locations - Number of physical locations/sites if the brand has multiple (e.g. Getaway has many; single-site = 1). Use 1 if it's one property.

4. Property amenities (Yes/No for each):
property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub, property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental, property_waterpark, property_general_store, property_waterfront, property_pickball_courts, property_extended_stay, property_family_friendly, property_remote_work_friendly, property_fitness_room, property_propane_refilling_station.

Return ONLY valid JSON. No markdown or extra text.`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 800,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return {};
  }

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;

    if (PROPERTY_YES_NO_COLUMNS.includes(key as (typeof PROPERTY_YES_NO_COLUMNS)[number])) {
      const normalized = normalizeYesNo(value);
      if (normalized !== null) update[key] = normalized;
    } else if (key === 'year_site_opened') {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(n) && n > 1900 && n <= new Date().getFullYear()) {
        update[key] = n;
      }
    } else if (key === 'number_of_locations') {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(n) && n >= 1) {
        update[key] = n;
      }
    } else if (key === 'operating_season_months') {
      const s = String(value).trim();
      if (!s) continue;
      const num = parseInt(s, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) {
        update[key] = String(num);
      } else {
        const textToMonths: Record<string, string> = {
          'year-round': '12', 'year round': '12', 'yearround': '12',
          'april-october': '7', 'april-oct': '7', 'apr-oct': '7',
          'may-september': '5', 'may-sept': '5', 'may-sep': '5',
          'may-october': '6', 'may-oct': '6',
          'seasonal': '6', '4-10': '7', '5-10': '6', '5-11': '7', '4-6': '3',
        };
        const normalized = textToMonths[s.toLowerCase()];
        if (normalized) update[key] = normalized;
      }
    }
  }

  return update;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(args[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;
  const dryRun = args.includes('--dry-run');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, url, address, city, state, country')
    .eq('research_status', 'in_progress')
    .order('id', { ascending: true })
    .limit(limit ?? 5000);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No in_progress properties found.');
    return;
  }

  console.log(`Processing ${rows.length} in_progress properties...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as PropertyRow;
    const progress = `[${i + 1}/${rows.length}]`;

    try {
      const result = await researchPropertyAmenities(row);

      if (Object.keys(result).length === 0) {
        console.log(`${progress} ${row.property_name} - No data found, skipped`);
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`${progress} ${row.property_name} - Would update:`, Object.keys(result).join(', '));
        updated++;
        continue;
      }

      const { error: updateError } = await supabase
        .from(TABLE)
        .update(result)
        .eq('id', row.id);

      if (updateError) {
        console.error(`${progress} ${row.property_name} - Update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(`${progress} ${row.property_name} - Updated: ${Object.keys(result).join(', ')}`);
        updated++;
      }
    } catch (err) {
      console.error(`${progress} ${row.property_name} - Error: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
