#!/usr/bin/env npx tsx
/**
 * Research rate_avg_retail_daily_rate and property_total_sites for in_progress properties.
 *
 * Uses OpenAI to lookup average nightly rates (USD) and estimated total unit count
 * for glamping properties with research_status = 'in_progress', then updates the DB.
 *
 * Usage:
 *   npx tsx scripts/research-rates-and-units-openai.ts
 *   npx tsx scripts/research-rates-and-units-openai.ts --limit 10
 *   npx tsx scripts/research-rates-and-units-openai.ts --dry-run
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

interface PropertyRow {
  id: number;
  property_name: string | null;
  site_name: string | null;
  url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  unit_type: string | null;
  property_type: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildContext(p: PropertyRow): string {
  const parts = [
    `Property: ${p.property_name ?? 'Unknown'}`,
    p.site_name ? `Site/Unit: ${p.site_name}` : null,
    `URL: ${p.url ?? 'Not provided'}`,
    `Location: ${[p.city, p.state, p.country].filter(Boolean).join(', ') || 'Not provided'}`,
    `Unit type: ${p.unit_type ?? 'Unknown'}`,
    `Property type: ${p.property_type ?? 'Unknown'}`,
  ];
  return parts.filter(Boolean).join('\n');
}

interface ResearchResult {
  rate_avg_retail_daily_rate: number | null;
  property_total_sites: number | null;
}

async function researchRatesAndUnits(property: PropertyRow, attempt = 0): Promise<ResearchResult> {
  const context = buildContext(property);

  const prompt = `You are a research assistant for a glamping/camping directory. Using your knowledge of this property (from its website, booking sites, reviews, or industry data), estimate:

1. rate_avg_retail_daily_rate - The average nightly rate in USD. Use a single number (e.g. 150, 299). Consider typical mid-range rates across unit types and seasons. If the property has multiple unit types with different rates, use a weighted average or the most common rate tier.

2. property_total_sites - The total number of glamping units/sites/cabins/tents at this property. This is the count of bookable accommodations (e.g. 5 safari tents, 12 cabins = 17 total). Do not include RV sites or tent camping pitches unless the property is primarily a glamping resort.

${context}

Return a JSON object with exactly:
{
  "rate_avg_retail_daily_rate": <number or null>,
  "property_total_sites": <number or null>
}

Use null for either field if you cannot confidently estimate. Be accurate - only provide numbers you are reasonably confident about based on the property's known information.

Return ONLY valid JSON. No markdown or extra text.`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 200,
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

  const rate = parsed.rate_avg_retail_daily_rate;
  const sites = parsed.property_total_sites;

  return {
    rate_avg_retail_daily_rate:
      typeof rate === 'number' && !isNaN(rate) && rate > 0 ? Math.round(rate) : null,
    property_total_sites:
      typeof sites === 'number' && !isNaN(sites) && sites > 0 ? Math.round(sites) : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(args[limitIdx + 1] || String(args[limitIdx] || '').replace('--limit=', '') || '0', 10)
      : undefined;
  const dryRun = args.includes('--dry-run');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, property_name, site_name, url, city, state, country, unit_type, property_type')
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
      const result = await researchRatesAndUnits(row);

      const hasUpdate =
        result.rate_avg_retail_daily_rate != null || result.property_total_sites != null;

      if (!hasUpdate) {
        console.log(`${progress} ${row.property_name} - No data found, skipped`);
        skipped++;
        continue;
      }

      const update: Record<string, unknown> = {};
      if (result.rate_avg_retail_daily_rate != null) {
        update.rate_avg_retail_daily_rate = result.rate_avg_retail_daily_rate;
      }
      if (result.property_total_sites != null) {
        update.property_total_sites = result.property_total_sites;
      }

      if (dryRun) {
        console.log(
          `${progress} ${row.property_name} - Would set: rate=$${result.rate_avg_retail_daily_rate ?? '—'}, sites=${result.property_total_sites ?? '—'}`
        );
        updated++;
        continue;
      }

      const { error: updateError } = await supabase
        .from(TABLE)
        .update(update)
        .eq('id', row.id);

      if (updateError) {
        console.error(`${progress} ${row.property_name} - Update failed: ${updateError.message}`);
        failed++;
      } else {
        console.log(
          `${progress} ${row.property_name} - Updated: rate=$${result.rate_avg_retail_daily_rate ?? '—'}, sites=${result.property_total_sites ?? '—'}`
        );
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
