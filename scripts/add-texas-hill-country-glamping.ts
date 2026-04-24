#!/usr/bin/env npx tsx
/**
 * Insert 5 new Texas Hill Country glamping properties and enrich them with OpenAI.
 *
 * Properties:
 *  1. River Yurt Village          – Bandera, TX
 *  2. Basecamp Resort             – Ingram, TX
 *  3. The Disco Ranch (Disco Domes) – Fischer, TX
 *  4. Rio Bella Resort            – Rio Frio, TX
 *  5. The Yurtopian Wimberley     – Wimberley, TX
 *
 * Usage:
 *   npx tsx scripts/add-texas-hill-country-glamping.ts
 *   npx tsx scripts/add-texas-hill-country-glamping.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const TABLE = 'all_glamping_properties';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Properties to insert
// ---------------------------------------------------------------------------
const NEW_PROPERTIES = [
  {
    property_name: 'River Yurt Village',
    property_type: 'Glamping',
    unit_type: 'Yurt',
    city: 'Bandera',
    state: 'TX',
    zip_code: '78003',
    country: 'USA',
    lat: 29.7279,
    lon: -99.0745,
    url: 'https://riveryurtvillage.com/',
    phone_number: '726-238-8188',
    quantity_of_units: 9,
    unit_capacity: '7',
    description:
      'River Yurt Village offers 9 luxury glamping yurts on 21 acres just one block from Bandera\'s Main Street, with private access to the Medina River. Each yurt features cedar hot tubs, AC, kitchenette, gaucho grill, and sleeps 2–7 guests. A perfect Hill Country retreat combining rustic charm with modern comforts.',
  },
  {
    property_name: 'Basecamp Resort',
    property_type: 'Glamping',
    unit_type: 'Luxury Tent, Cabin',
    address: '145 Cardinal Hill Rd',
    city: 'Ingram',
    state: 'TX',
    zip_code: '78025',
    country: 'USA',
    lat: 30.073,
    lon: -99.237,
    url: 'https://basecampresort.com/',
    phone_number: '830-282-0778',
    quantity_of_units: 6,
    unit_capacity: '6',
    description:
      'Basecamp Resort is a 34-acre Hill Country destination nestled between Ingram and Hunt, TX, above the Guadalupe River. Guests stay in luxury glamping tents shaded by 200-year-old oak trees, cozy cabins, or a beautifully restored log home lodge. Amenities include a 3-acre private lake for paddleboarding, a hot tub, and access to the Guadalupe River.',
  },
  {
    property_name: 'The Disco Ranch',
    property_type: 'Glamping',
    unit_type: 'Dome',
    address: '698 Lipan Run',
    city: 'Fischer',
    state: 'TX',
    zip_code: '78623',
    country: 'USA',
    lat: 29.9274,
    lon: -98.2366,
    url: 'https://www.thediscodomes.com/',
    phone_number: '512-657-7058',
    quantity_of_units: 2,
    unit_capacity: '2',
    description:
      'The Disco Ranch features two adult-only luxury geodesic domes — Africa and Mexico themed — along the Devil\'s Backbone in Fischer, TX. Each dome combines a plush king bed, full kitchen, surround sound, and a spinning disco ball with an outdoor cold plunge pool, fire pit, and hammocks. Starting at $325/night, this is a one-of-a-kind couples glamping experience 1 hour from Austin.',
    rate_avg_retail_daily_rate: 325,
  },
  {
    property_name: 'Rio Bella Resort',
    property_type: 'Glamping',
    unit_type: 'Cabin',
    address: '3088 Ranch Road 1120',
    city: 'Rio Frio',
    state: 'TX',
    zip_code: '78879',
    country: 'USA',
    lat: 29.698,
    lon: -99.728,
    url: 'https://friorivercabinrentals.com/',
    phone_number: '830-232-4781',
    quantity_of_units: 12,
    unit_capacity: '10',
    description:
      'Rio Bella Resort offers 12 newly built luxury riverfront cabins with private bluff-hanging balconies overlooking the Frio River, approximately 5 miles from Garner State Park. The resort includes a 16,000 sq ft carpet grass river park, the historic Lombardy dam and waterfall, and three gathering areas with fire pits. An ideal destination for families and groups seeking an upscale Frio River experience.',
  },
  {
    property_name: 'The Yurtopian Wimberley',
    property_type: 'Glamping',
    unit_type: 'Yurt',
    city: 'Wimberley',
    state: 'TX',
    zip_code: '78676',
    country: 'USA',
    lat: 29.9974,
    lon: -98.0983,
    url: 'https://www.yurtopiawimberley.com/',
    quantity_of_units: 6,
    unit_capacity: '2',
    description:
      'The Yurtopian Wimberley is the Wimberley location of the award-winning Yurtopian Hill Country Resort, featuring 6 adults-only luxury yurts tucked into a wooded hillside 5 miles from downtown Wimberley. Each private yurt offers sweeping Hill Country views from rooftop decks, a personal hot tub, fire pit, king bed, outdoor kitchen, and propane grill. Designed for rest, romance, and reconnection in nature.',
  },
] as const;

// ---------------------------------------------------------------------------
// Allowed enrichment columns (Yes/No amenity/activity/setting fields + rates)
// ---------------------------------------------------------------------------
const YES_NO_KEYS = new Set([
  'unit_shower', 'unit_water', 'unit_electricity', 'unit_picnic_table', 'unit_wifi', 'unit_pets',
  'unit_private_bathroom', 'unit_full_kitchen', 'unit_kitchenette', 'unit_patio', 'unit_hot_tub_or_sauna',
  'unit_hot_tub', 'unit_sauna', 'unit_cable', 'unit_campfires', 'unit_charcoal_grill',
  'unit_mini_fridge', 'unit_bathtub', 'unit_wood_burning_stove', 'unit_air_conditioning', 'unit_bed',
  'property_laundry', 'property_playground', 'property_pool', 'property_food_on_site', 'property_sauna',
  'property_hot_tub', 'property_restaurant', 'property_dog_park', 'property_clubhouse',
  'property_alcohol_available', 'property_golf_cart_rental', 'property_waterpark', 'property_general_store',
  'property_waterfront', 'property_pickball_courts', 'property_family_friendly', 'property_fitness_room',
  'activities_fishing', 'activities_horseback_riding', 'activities_boating', 'activities_swimming',
  'activities_hiking', 'activities_wildlife_watching', 'activities_biking', 'activities_canoeing_kayaking',
  'activities_stargazing',
  'setting_ranch', 'setting_forest', 'setting_field', 'setting_lake', 'setting_farm',
  'river_stream_or_creek', 'setting_mountainous',
]);

const NUMERIC_KEYS = new Set([
  'rate_avg_retail_daily_rate',
  'rate_winter_weekday', 'rate_winter_weekend',
  'rate_spring_weekday', 'rate_spring_weekend',
  'rate_summer_weekday', 'rate_summer_weekend',
  'rate_fall_weekday', 'rate_fall_weekend',
]);

function normalizeYesNo(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  return null;
}

async function enrichProperty(
  id: number,
  prop: (typeof NEW_PROPERTIES)[number]
): Promise<Record<string, unknown>> {
  const prompt = `You are a glamping industry research assistant. Enrich the following property with accurate data based on the official website and reputable review sites.

Property: ${prop.property_name}
Location: ${prop.city}, ${prop.state}, ${prop.country}
URL: ${prop.url}
Unit type: ${prop.unit_type}
Description: ${prop.description}

IMPORTANT: Return a single FLAT JSON object where every key is at the top level (no nesting, no grouping). Use null for unknown values. For Yes/No fields use exactly "Yes" or "No". For numeric fields use plain numbers (no $ sign).

Required fields (all at top level, flat):
unit_shower, unit_water, unit_electricity, unit_picnic_table, unit_wifi, unit_pets, unit_private_bathroom, unit_full_kitchen, unit_kitchenette, unit_patio, unit_hot_tub, unit_hot_tub_or_sauna, unit_sauna, unit_campfires, unit_charcoal_grill, unit_mini_fridge, unit_bathtub, unit_wood_burning_stove, unit_air_conditioning, unit_bed,
property_pool, property_hot_tub, property_food_on_site, property_restaurant, property_waterfront, property_family_friendly, property_playground, property_dog_park, property_laundry, property_fitness_room, property_general_store, property_alcohol_available, property_clubhouse, property_pickball_courts,
activities_hiking, activities_fishing, activities_swimming, activities_horseback_riding, activities_biking, activities_stargazing, activities_canoeing_kayaking, activities_wildlife_watching, activities_boating,
setting_ranch, setting_forest, setting_field, setting_lake, setting_farm, river_stream_or_creek, setting_mountainous,
operating_season_months, minimum_nights, rate_category, rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend

Example format (flat, no nesting):
{"unit_wifi":"Yes","unit_hot_tub":"Yes","property_pool":"No","rate_avg_retail_daily_rate":250,"rate_category":"Luxury","operating_season_months":12,"minimum_nights":"2 nights"}

Return ONLY valid flat JSON. No markdown, no extra text, no nested objects.`;

  await sleep(2000);

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? '{}';
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }

  // Flatten in case the model grouped fields into nested objects
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        flat[ik] = iv;
      }
    } else {
      flat[k] = v;
    }
  }

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === null || value === undefined) continue;
    if (YES_NO_KEYS.has(key)) {
      const n = normalizeYesNo(value);
      if (n) update[key] = n;
    } else if (NUMERIC_KEYS.has(key)) {
      const n = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(n) && n > 0) update[key] = n;
    } else if (key === 'operating_season_months') {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (!isNaN(n) && n > 0) update[key] = n;
    } else if (key === 'minimum_nights') {
      // Accept number or string like "2" or "2 nights"
      const s = String(value).trim();
      if (s) update[key] = s.match(/^\d+$/) ? `${s} nights` : s;
    } else if (key === 'rate_category') {
      const s = String(value).trim();
      if (s) update[key] = s;
    }
  }

  return update;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  for (const prop of NEW_PROPERTIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${prop.property_name} (${prop.city}, ${prop.state})`);

    // --- Dedup check ---
    const { data: existing } = await supabase
      .from(TABLE)
      .select('id, property_name')
      .ilike('property_name', prop.property_name)
      .limit(1);

    if (existing?.length) {
      console.log(`  SKIP — already exists (id=${existing[0].id})`);
      continue;
    }

    // --- Build base row ---
    const baseRow: Record<string, unknown> = {
      property_name: prop.property_name,
      slug: slugify(prop.property_name),
      property_type: prop.property_type,
      unit_type: prop.unit_type,
      is_glamping_property: 'Yes',
      is_open: 'Yes',
      research_status: 'new',
      source: 'Sage',
      discovery_source: 'Manual Research',
      date_added: TODAY,
      date_updated: TODAY,
      city: prop.city,
      state: prop.state,
      zip_code: (prop as Record<string, unknown>).zip_code ?? null,
      country: prop.country,
      lat: prop.lat,
      lon: prop.lon,
      url: prop.url,
      phone_number: (prop as Record<string, unknown>).phone_number ?? null,
      address: (prop as Record<string, unknown>).address ?? null,
      description: prop.description,
      quantity_of_units: prop.quantity_of_units,
      unit_capacity: prop.unit_capacity,
    };

    if ((prop as Record<string, unknown>).rate_avg_retail_daily_rate) {
      baseRow.rate_avg_retail_daily_rate = (prop as Record<string, unknown>).rate_avg_retail_daily_rate;
    }

    // --- OpenAI enrichment ---
    console.log('  Enriching with OpenAI...');
    let enriched: Record<string, unknown> = {};
    try {
      enriched = await enrichProperty(0, prop);
      console.log(`  Enrichment: ${Object.keys(enriched).length} fields returned`);
    } catch (e) {
      console.warn(`  Enrichment failed: ${e instanceof Error ? e.message : e}`);
    }

    const finalRow = { ...baseRow, ...enriched, research_status: 'in_progress', date_updated: TODAY };

    if (DRY_RUN) {
      console.log('  [DRY RUN] Would insert:');
      const display = Object.fromEntries(
        Object.entries(finalRow).filter(([, v]) => v !== null && v !== undefined)
      );
      console.log(JSON.stringify(display, null, 2));
      continue;
    }

    // --- Insert ---
    const { data, error } = await supabase.from(TABLE).insert(finalRow).select('id').single();
    if (error) {
      console.error(`  INSERT FAILED: ${error.message}`);
    } else {
      console.log(`  Inserted id=${data?.id} ✓`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
