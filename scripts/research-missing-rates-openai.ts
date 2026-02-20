#!/usr/bin/env npx tsx
/**
 * Research and populate rate_avg_retail_daily_rate and rate_unit_rates_by_year
 * for ALL properties with missing rate_avg_retail_daily_rate using OpenAI.
 *
 * Estimates average nightly rate even when multiple unit types have different rates.
 * Populates rate_unit_rates_by_year with 2026 structure; uses season-specific rates
 * when OpenAI provides them, otherwise uses the estimated average.
 *
 * Usage:
 *   npx tsx scripts/research-missing-rates-openai.ts
 *   npx tsx scripts/research-missing-rates-openai.ts --limit 10
 *   npx tsx scripts/research-missing-rates-openai.ts --dry-run
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

interface ResearchResult {
  rate_avg_retail_daily_rate: number | null;
  rate_winter_weekday?: number | null;
  rate_winter_weekend?: number | null;
  rate_spring_weekday?: number | null;
  rate_spring_weekend?: number | null;
  rate_summer_weekday?: number | null;
  rate_summer_weekend?: number | null;
  rate_fall_weekday?: number | null;
  rate_fall_weekend?: number | null;
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

function toNum(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function buildRateUnitRatesByYear(avg: number, result: ResearchResult): Record<string, unknown> {
  const fallback = (wd: number | null, we: number | null) => ({
    weekday: wd ?? avg,
    weekend: we ?? avg,
  });

  return {
    '2026': {
      winter: fallback(result.rate_winter_weekday ?? null, result.rate_winter_weekend ?? null),
      spring: fallback(result.rate_spring_weekday ?? null, result.rate_spring_weekend ?? null),
      summer: fallback(result.rate_summer_weekday ?? null, result.rate_summer_weekend ?? null),
      fall: fallback(result.rate_fall_weekday ?? null, result.rate_fall_weekend ?? null),
    },
  };
}

async function researchRates(property: PropertyRow): Promise<ResearchResult> {
  const context = buildContext(property);

  const prompt = `You are a research assistant for a glamping/camping directory. Using your knowledge of this property (from its website, booking sites, reviews, or industry data), estimate nightly rates in USD.

${context}

IMPORTANT: Even if the property has multiple unit types with different rates (e.g. cabins $200, tents $150), provide an ESTIMATED AVERAGE. Use a weighted average, the most common rate tier, or mid-range. A rough estimate is better than null.

Return a JSON object with:
1. rate_avg_retail_daily_rate (required) - Your best estimate of the average nightly rate in USD (number, e.g. 175)
2. Optional season-specific rates if you know them (numbers or null):
   rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
   rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend

Example with season rates: {"rate_avg_retail_daily_rate": 180, "rate_summer_weekday": 165, "rate_summer_weekend": 195, "rate_spring_weekday": 150, "rate_spring_weekend": 175}
Example with avg only: {"rate_avg_retail_daily_rate": 200}

Return ONLY valid JSON. No markdown or extra text.`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return { rate_avg_retail_daily_rate: null };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return { rate_avg_retail_daily_rate: null };
  }

  const avg = toNum(parsed.rate_avg_retail_daily_rate);
  if (avg == null || avg <= 0) return { rate_avg_retail_daily_rate: null };

  return {
    rate_avg_retail_daily_rate: Math.round(avg),
    rate_winter_weekday: toNum(parsed.rate_winter_weekday),
    rate_winter_weekend: toNum(parsed.rate_winter_weekend),
    rate_spring_weekday: toNum(parsed.rate_spring_weekday),
    rate_spring_weekend: toNum(parsed.rate_spring_weekend),
    rate_summer_weekday: toNum(parsed.rate_summer_weekday),
    rate_summer_weekend: toNum(parsed.rate_summer_weekend),
    rate_fall_weekday: toNum(parsed.rate_fall_weekday),
    rate_fall_weekend: toNum(parsed.rate_fall_weekend),
  };
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
    .select('id, property_name, site_name, url, city, state, country, unit_type, property_type')
    .is('rate_avg_retail_daily_rate', null)
    .order('id', { ascending: true })
    .limit(limit ?? 5000);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No properties with missing rate_avg_retail_daily_rate found.');
    return;
  }

  console.log(`Processing ${rows.length} properties with missing rates...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as PropertyRow;
    const progress = `[${i + 1}/${rows.length}]`;

    try {
      const result = await researchRates(row);

      if (result.rate_avg_retail_daily_rate == null) {
        console.log(`${progress} ${row.property_name} - No rate found, skipped`);
        skipped++;
        continue;
      }

      const rateUnitRatesByYear = buildRateUnitRatesByYear(
        result.rate_avg_retail_daily_rate,
        result
      );

      const update = {
        rate_avg_retail_daily_rate: result.rate_avg_retail_daily_rate,
        rate_unit_rates_by_year: rateUnitRatesByYear,
      };

      if (dryRun) {
        console.log(
          `${progress} ${row.property_name} - Would set: rate=$${result.rate_avg_retail_daily_rate}, rate_unit_rates_by_year`
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
          `${progress} ${row.property_name} - Updated: rate=$${result.rate_avg_retail_daily_rate}`
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
