#!/usr/bin/env npx tsx
/**
 * Enrich the 225 new records (from our unit-type research) using OpenAI.
 *
 * Researches:
 * 1. All property_* columns (Yes/No)
 * 2. year_site_opened
 * 3. rate_avg_retail_daily_rate (average of highest and lowest unit type rates)
 * 4. rate_unit_rates_by_year (2026 structure)
 * 5. Weekend/weekday rates by season 2026
 *
 * Keeps research_status = 'new'.
 *
 * Usage:
 *   npx tsx scripts/enrich-225-new-records-openai.ts
 *   npx tsx scripts/enrich-225-new-records-openai.ts --limit 10
 *   npx tsx scripts/enrich-225-new-records-openai.ts --dry-run
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

const OUR_DISCOVERY_SOURCES = [
  'OpenAI Research - Treehouses',
  'OpenAI Research - Luxury Cabins',
  'OpenAI Research - Popular North America',
  'OpenAI Research - Safari Tents',
  'OpenAI Research - Yurts',
  'OpenAI Research - Hobbit Homes',
  'OpenAI Research - Domes',
  'OpenAI Research - Airstreams',
];

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
  'property_extended_stay',
  'property_family_friendly',
  'property_remote_work_friendly',
  'property_fitness_room',
  'property_propane_refilling_station',
  'property_pickball_courts',
] as const;

interface PropertyRow {
  id: number;
  property_name: string | null;
  site_name: string | null;
  url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  unit_type: string | null;
  property_type: string | null;
}

interface ResearchResult {
  year_site_opened?: number | null;
  rate_avg_retail_daily_rate?: number | null;
  rate_winter_weekday?: number | null;
  rate_winter_weekend?: number | null;
  rate_spring_weekday?: number | null;
  rate_spring_weekend?: number | null;
  rate_summer_weekday?: number | null;
  rate_summer_weekend?: number | null;
  rate_fall_weekday?: number | null;
  rate_fall_weekend?: number | null;
  [key: string]: unknown;
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

function toNum(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function buildContext(p: PropertyRow): string {
  const parts = [
    `Property: ${p.property_name ?? 'Unknown'}`,
    p.site_name ? `Site/Unit: ${p.site_name}` : null,
    `URL: ${p.url ?? 'Not provided'}`,
    `Address: ${p.address ?? 'Not provided'}`,
    `Location: ${[p.city, p.state, p.country].filter(Boolean).join(', ') || 'Not provided'}`,
    `Unit type: ${p.unit_type ?? 'Unknown'}`,
    `Property type: ${p.property_type ?? 'Unknown'}`,
  ];
  return parts.filter(Boolean).join('\n');
}

function buildRateUnitRatesByYear(result: ResearchResult): Record<string, unknown> {
  const avg = result.rate_avg_retail_daily_rate ?? 0;
  const fallback = (wd: number | null, we: number | null) => ({
    weekday: wd ?? avg,
    weekend: we ?? avg,
  });

  return {
    '2026': {
      winter: fallback(
        toNum(result.rate_winter_weekday),
        toNum(result.rate_winter_weekend)
      ),
      spring: fallback(
        toNum(result.rate_spring_weekday),
        toNum(result.rate_spring_weekend)
      ),
      summer: fallback(
        toNum(result.rate_summer_weekday),
        toNum(result.rate_summer_weekend)
      ),
      fall: fallback(
        toNum(result.rate_fall_weekday),
        toNum(result.rate_fall_weekend)
      ),
    },
  };
}

async function researchProperty(property: PropertyRow, attempt = 0): Promise<Record<string, unknown>> {
  const context = buildContext(property);

  const prompt = `You are a research assistant for a glamping/camping directory. Research this property using your knowledge of the property name, location, and website.

${context}

Return a JSON object with the following. Use null for unknown. For Yes/No use exactly "Yes" or "No".

1. year_site_opened - Year the property opened (number, e.g. 2018, 2020). Use null if unknown.

2. rate_avg_retail_daily_rate - Average nightly rate in USD. If the property has multiple unit types with different rates (e.g. luxury cabins $300, standard tents $150), compute the AVERAGE of the highest and lowest unit type rates. Example: ($300 + $150) / 2 = 225. Use your best estimate from the website, booking sites, or industry knowledge.

3. Season-specific rates for 2026 (numbers in USD, or null):
   rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
   rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend
   (Winter=Dec-Feb, Spring=Mar-May, Summer=Jun-Aug, Fall=Sep-Nov)

4. Property amenities (Yes/No for each):
   property_laundry, property_playground, property_pool, property_food_on_site, property_sauna, property_hot_tub, property_restaurant, property_dog_park, property_clubhouse, property_alcohol_available, property_golf_cart_rental, property_waterpark, property_general_store, property_waterfront, property_extended_stay, property_family_friendly, property_remote_work_friendly, property_fitness_room, property_propane_refilling_station, property_pickball_courts.

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

  // year_site_opened
  const year = toNum(parsed.year_site_opened);
  if (year != null && year > 1900 && year <= new Date().getFullYear()) {
    update.year_site_opened = year;
  }

  // rate_avg_retail_daily_rate
  const avgRate = toNum(parsed.rate_avg_retail_daily_rate);
  if (avgRate != null && avgRate > 0) {
    update.rate_avg_retail_daily_rate = Math.round(avgRate);
  }

  // Season rates
  const rateKeys = [
    'rate_winter_weekday', 'rate_winter_weekend', 'rate_spring_weekday', 'rate_spring_weekend',
    'rate_summer_weekday', 'rate_summer_weekend', 'rate_fall_weekday', 'rate_fall_weekend',
  ];
  const result: ResearchResult = { ...parsed };
  for (const k of rateKeys) {
    const v = toNum(parsed[k]);
    if (v != null && v > 0) update[k] = Math.round(v);
  }

  // rate_unit_rates_by_year
  if (avgRate != null && avgRate > 0) {
    update.rate_unit_rates_by_year = buildRateUnitRatesByYear({
      ...result,
      rate_avg_retail_daily_rate: avgRate,
    });
  }

  // property_* columns
  for (const key of PROPERTY_YES_NO_COLUMNS) {
    const normalized = normalizeYesNo(parsed[key]);
    if (normalized !== null) update[key] = normalized;
  }

  // Always update date_updated
  update.date_updated = new Date().toISOString().split('T')[0];

  return update;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.findIndex((a) => a === '--limit' || a.startsWith('--limit='));
  const limit =
    limitIdx >= 0
      ? parseInt(args[limitIdx].includes('=') ? args[limitIdx].split('=')[1] : args[limitIdx + 1] || '0', 10)
      : undefined;
  const dryRun = args.includes('--dry-run');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, url, address, city, state, country, unit_type, property_type')
    .eq('research_status', 'new')
    .in('discovery_source', OUR_DISCOVERY_SOURCES)
    .order('id', { ascending: true })
    .limit(limit ?? 500);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log('No matching properties found (research_status=new, our 8 discovery sources).');
    return;
  }

  console.log(`Enriching ${rows.length} properties. Dry-run: ${dryRun}\n`);
  console.log('Keeping research_status = "new".\n');

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

      const updateKeys = Object.keys(update).filter((k) => k !== 'date_updated');
      if (updateKeys.length === 0) {
        console.log('no data');
        continue;
      }

      if (!dryRun) {
        const { error: upErr } = await supabase.from(TABLE).update(update).eq('id', p.id);
        if (upErr) {
          console.log('update failed:', upErr.message);
          err++;
          continue;
        }
      }
      console.log(`${updateKeys.length} fields`);
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
