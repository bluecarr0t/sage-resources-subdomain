#!/usr/bin/env npx tsx
/**
 * Enrich glamping properties with research_status = 'new' using OpenAI.
 *
 * Fetches the 341 European (and any other) 'new' properties, uses OpenAI as a
 * research assistant to fill and improve description, url, phone, operating
 * season, minimum_nights, and amenity/activity/setting fields, then updates
 * the DB and sets research_status to 'in_progress'.
 *
 * Usage:
 *   npx tsx scripts/enrich-new-glamping-properties.ts
 *   npx tsx scripts/enrich-new-glamping-properties.ts --limit 5
 *   npx tsx scripts/enrich-new-glamping-properties.ts --dry-run
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
const MAX_RETRIES = 2;

// DB columns we allow from OpenAI response (must match all_glamping_properties)
const ALLOWED_UPDATE_COLUMNS = new Set([
  'description',
  'url',
  'phone_number',
  'operating_season_months',
  'minimum_nights',
  'unit_type',
  'unit_capacity',
  'unit_shower',
  'unit_water',
  'unit_electricity',
  'unit_picnic_table',
  'unit_wifi',
  'unit_pets',
  'unit_private_bathroom',
  'unit_full_kitchen',
  'unit_kitchenette',
  'unit_patio',
  'unit_hot_tub_or_sauna',
  'unit_hot_tub',
  'unit_sauna',
  'unit_cable',
  'unit_campfires',
  'unit_charcoal_grill',
  'unit_mini_fridge',
  'unit_bathtub',
  'unit_wood_burning_stove',
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
  'activities_fishing',
  'activities_surfing',
  'activities_horseback_riding',
  'activities_paddling',
  'activities_climbing',
  'activities_off_roading_ohv',
  'activities_boating',
  'activities_swimming',
  'activities_wind_sports',
  'activities_snow_sports',
  'activities_whitewater_paddling',
  'activities_fall_fun',
  'activities_hiking',
  'activities_wildlife_watching',
  'activities_biking',
  'activities_canoeing_kayaking',
  'setting_ranch',
  'setting_beach',
  'setting_coastal',
  'setting_suburban',
  'setting_forest',
  'setting_field',
  'setting_wetlands',
  'setting_hot_spring',
  'setting_desert',
  'setting_canyon',
  'setting_waterfall',
  'setting_swimming_hole',
  'setting_lake',
  'setting_cave',
  'setting_redwoods',
  'setting_farm',
  'river_stream_or_creek',
  'setting_mountainous',
  'rv_vehicle_length',
  'rv_parking',
  'rv_accommodates_slideout',
  'rv_surface_type',
  'rv_surface_level',
  'rv_vehicles_fifth_wheels',
  'rv_vehicles_class_a_rvs',
  'rv_vehicles_class_b_rvs',
  'rv_vehicles_class_c_rvs',
  'rv_vehicles_toy_hauler',
  'rv_sewer_hook_up',
  'rv_electrical_hook_up',
  'rv_generators_allowed',
  'rv_water_hookup',
]);

const YES_NO_KEYS = new Set([
  'unit_shower', 'unit_water', 'unit_electricity', 'unit_picnic_table', 'unit_wifi', 'unit_pets',
  'unit_private_bathroom', 'unit_full_kitchen', 'unit_kitchenette', 'unit_patio', 'unit_hot_tub_or_sauna',
  'unit_hot_tub', 'unit_sauna', 'unit_cable', 'unit_campfires', 'unit_charcoal_grill',
  'unit_mini_fridge', 'unit_bathtub', 'unit_wood_burning_stove',
  'property_laundry', 'property_playground', 'property_pool', 'property_food_on_site', 'property_sauna',
  'property_hot_tub', 'property_restaurant', 'property_dog_park', 'property_clubhouse',
  'property_alcohol_available', 'property_golf_cart_rental', 'property_waterpark', 'property_general_store',
  'property_waterfront', 'property_pickball_courts',
  'activities_fishing', 'activities_surfing', 'activities_horseback_riding', 'activities_paddling',
  'activities_climbing', 'activities_off_roading_ohv', 'activities_boating', 'activities_swimming',
  'activities_wind_sports', 'activities_snow_sports', 'activities_whitewater_paddling', 'activities_fall_fun',
  'activities_hiking', 'activities_wildlife_watching', 'activities_biking', 'activities_canoeing_kayaking',
  'setting_ranch', 'setting_beach', 'setting_coastal', 'setting_suburban', 'setting_forest', 'setting_field',
  'setting_wetlands', 'setting_hot_spring', 'setting_desert', 'setting_canyon', 'setting_waterfall',
  'setting_swimming_hole', 'setting_lake', 'setting_cave', 'setting_redwoods', 'setting_farm',
  'river_stream_or_creek', 'setting_mountainous',
  'rv_parking', 'rv_accommodates_slideout', 'rv_surface_level', 'rv_vehicles_fifth_wheels',
  'rv_vehicles_class_a_rvs', 'rv_vehicles_class_b_rvs', 'rv_vehicles_class_c_rvs', 'rv_vehicles_toy_hauler',
  'rv_sewer_hook_up', 'rv_electrical_hook_up', 'rv_generators_allowed', 'rv_water_hookup',
]);

interface PropertyRow {
  id: number;
  property_name: string | null;
  site_name: string | null;
  url: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  operating_season_months: string | null;
  phone_number: string | null;
  unit_type: string | null;
  property_type: string | null;
  minimum_nights: string | null;
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
    p.lat != null && p.lon != null ? `Coordinates: ${p.lat}, ${p.lon}` : null,
    `Description: ${p.description ?? 'None'}`,
    `Operating season: ${p.operating_season_months ?? 'Unknown'}`,
    `Phone: ${p.phone_number ?? 'Not provided'}`,
    `Unit type: ${p.unit_type ?? 'Unknown'}`,
    `Property type: ${p.property_type ?? 'Unknown'}`,
    `Minimum nights: ${p.minimum_nights ?? 'Not specified'}`,
  ];
  return parts.filter(Boolean).join('\n');
}

async function researchProperty(property: PropertyRow, attempt = 0): Promise<Record<string, unknown>> {
  const context = buildContext(property);

  const prompt = `You are a research assistant for a glamping/camping directory. Research this property using your knowledge of the property name, location, and website. Prefer the property's official website and reputable booking or review sites.

${context}

Return a JSON object with any of the following fields you can confidently fill. Use null for unknown. For Yes/No fields use exactly "Yes" or "No".

Priority:
1. description - 2–4 sentence description of the property, its setting, and what makes it special (improve or replace if current is thin).
2. url - Official website URL (https preferred).
3. phone_number - Contact phone.
4. operating_season_months - Number of months operating (1-12), e.g. 12 for year-round, 7 for April-October.
5. minimum_nights - e.g. "2 nights", "1 night", "3 nights minimum".

Then for each amenity/activity/setting below, set "Yes", "No", or null:
Unit: unit_shower, unit_water, unit_electricity, unit_picnic_table, unit_wifi, unit_pets, unit_private_bathroom, unit_full_kitchen, unit_kitchenette, unit_patio, unit_hot_tub_or_sauna, unit_hot_tub, unit_sauna, unit_cable, unit_campfires, unit_charcoal_grill, unit_mini_fridge, unit_bathtub, unit_wood_burning_stove.
Property: property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub, property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental, property_waterpark, property_general_store, property_waterfront, property_pickball_courts.
Activities: activities_fishing, activities_surfing, activities_horseback_riding, activities_paddling, activities_climbing, activities_off_roading_ohv, activities_boating, activities_swimming, activities_wind_sports, activities_snow_sports, activities_whitewater_paddling, activities_fall_fun, activities_hiking, activities_wildlife_watching, activities_biking, activities_canoeing_kayaking.
Setting: setting_ranch, setting_beach, setting_coastal, setting_suburban, setting_forest, setting_field, setting_wetlands, setting_hot_spring, setting_desert, setting_canyon, setting_waterfall, setting_swimming_hole, setting_lake, setting_cave, setting_redwoods, setting_farm, river_stream_or_creek, setting_mountainous.
RV: rv_vehicle_length (e.g. "10 meters" or null), rv_parking, rv_accommodates_slideout, rv_surface_type, rv_surface_level, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs, rv_vehicles_toy_hauler, rv_sewer_hook_up, rv_electrical_hook_up, rv_generators_allowed, rv_water_hookup.

Return ONLY valid JSON. No markdown or extra text.`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 2500,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty OpenAI response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else throw new Error('Invalid JSON from OpenAI');
  }

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!ALLOWED_UPDATE_COLUMNS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (YES_NO_KEYS.has(key)) {
      const normalized = normalizeYesNo(value);
      if (normalized !== null) update[key] = normalized;
    } else if (key === 'url' && typeof value === 'string') {
      let u = value.trim();
      if (u && !u.startsWith('http')) u = `https://${u}`;
      if (u) {
        try {
          new URL(u);
          update[key] = u;
        } catch {
          /* skip invalid url */
        }
      }
    } else {
      update[key] = typeof value === 'string' ? value.trim() || null : value;
    }
  }

  return update;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const dryRun = args.includes('--dry-run');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select(
      'id, property_name, site_name, url, description, address, city, state, country, lat, lon, operating_season_months, phone_number, unit_type, property_type, minimum_nights'
    )
    .eq('research_status', 'new')
    .order('id', { ascending: true })
    .limit(limit ?? 5000);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log('No properties with research_status = "new".');
    return;
  }

  console.log(`Enriching ${rows.length} properties (research_status = 'new'). Dry-run: ${dryRun}\n`);

  let ok = 0;
  let err = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i] as PropertyRow;
    process.stdout.write(`[${i + 1}/${rows.length}] ${p.property_name ?? p.id} ... `);

    try {
      let update: Record<string, unknown> = {};
      for (let tryCount = 0; tryCount <= MAX_RETRIES; tryCount++) {
        try {
          update = await researchProperty(p);
          break;
        } catch (e) {
          if (tryCount === MAX_RETRIES) throw e;
          await sleep(DELAY_MS * 2);
        }
      }

      if (Object.keys(update).length === 0) {
        console.log('no data');
        continue;
      }

      if (!dryRun) {
        update.research_status = 'in_progress';
        update.date_updated = new Date().toISOString().split('T')[0];
        const { error: upErr } = await supabase.from(TABLE).update(update).eq('id', p.id);
        if (upErr) {
          console.log('update failed:', upErr.message);
          err++;
          continue;
        }
      }
      console.log(`${Object.keys(update).length} fields`);
      ok++;
    } catch (e) {
      console.log('error:', e instanceof Error ? e.message : e);
      err++;
    }
  }

  console.log(`\nDone. Enriched: ${ok}, Errors: ${err}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
