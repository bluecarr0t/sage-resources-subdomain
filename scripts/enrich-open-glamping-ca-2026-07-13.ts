#!/usr/bin/env npx tsx
/**
 * Enrich Canada open glamping batches A+B with rates + amenities.
 * Targets discovery_source:
 *   - web_research_open_glamping_ca_2026_07_13
 *   - web_research_open_glamping_ca_2026_07_13_b
 *
 * Flow per property:
 *   1. Firecrawl scrape of official URL (when available)
 *   2. Optional Tavily rate search if scrape is thin
 *   3. GPT-4o extract rates (CAD) + unit/property/activities/setting Yes/No
 *   4. Convert CAD nightly rates → USD via applyGlampingRatesToUsd
 *   5. Update all_sage_data (keeps research_status = in_progress)
 *
 * Usage:
 *   npx tsx scripts/enrich-open-glamping-ca-2026-07-13.ts --dry-run --limit 3
 *   npx tsx scripts/enrich-open-glamping-ca-2026-07-13.ts
 *   npx tsx scripts/enrich-open-glamping-ca-2026-07-13.ts --limit 10
 *   npx tsx scripts/enrich-open-glamping-ca-2026-07-13.ts --force
 *   npx tsx scripts/enrich-open-glamping-ca-2026-07-13.ts --rates-only --allow-estimates --missing-adr
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { tavily } from '@tavily/core';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { applyGlampingRatesToUsd } from '@/lib/glamping-rates-usd';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCES = [
  'web_research_open_glamping_ca_2026_07_13',
  'web_research_open_glamping_ca_2026_07_13_b',
] as const;
const RESEARCH_TAG = 'enrich_open_glamping_ca_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DELAY_MS = 1200;
const MAX_RETRIES = 2;
const MIN_RATE_CAD = 80;
const MAX_RATE_CAD = 2500;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const RATES_ONLY = args.includes('--rates-only');
const ALLOW_ESTIMATES = args.includes('--allow-estimates');
const MISSING_ADR = args.includes('--missing-adr');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limitIdx = args.findIndex((a) => a === '--limit');
const LIMIT = limitArg
  ? parseInt(limitArg.split('=')[1] ?? '0', 10)
  : limitIdx >= 0
    ? parseInt(args[limitIdx + 1] ?? '0', 10)
    : undefined;

const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;
const tavilyClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;

const YES_NO_COLUMNS = [
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
  'property_extended_stay',
  'property_family_friendly',
  'property_remote_work_friendly',
  'property_fitness_room',
  'property_propane_refilling_station',
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
] as const;

const RATE_KEYS = [
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;

type PropertyRow = {
  id: number;
  property_name: string | null;
  url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  unit_type: string | null;
  property_type: string | null;
  description: string | null;
  notes: string | null;
  rate_avg_retail_daily_rate: number | null;
  discovery_source: string | null;
};

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
  if (val === undefined || val === null || val === '' || val === 'closed') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'null' || s === 'closed' || s === 'n/a') return null;
  // "$299–$399" / "299-399 CAD" → midpoint
  const range = s.match(/(\d[\d,]*(?:\.\d+)?)\s*[-–—to]+\s*(\d[\d,]*(?:\.\d+)?)/);
  if (range) {
    const a = parseFloat(range[1]!.replace(/,/g, ''));
    const b = parseFloat(range[2]!.replace(/,/g, ''));
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function firecrawlScrape(url: string): Promise<string> {
  if (!firecrawl) return '';
  try {
    const result = (await firecrawl.scrape(url, {
      formats: ['markdown'],
    })) as { markdown?: string };
    return (result.markdown ?? '').slice(0, 18000);
  } catch (err) {
    console.warn(`    Firecrawl failed: ${err instanceof Error ? err.message : err}`);
    return '';
  }
}

async function tavilyEvidence(p: PropertyRow, ratesFocus = false): Promise<string> {
  if (!tavilyClient) return '';
  const name = p.property_name ?? '';
  const city = p.city ?? '';
  const state = p.state ?? '';
  const unit = p.unit_type ?? 'glamping';
  const query = ratesFocus
    ? `"${name}" ${city} ${state} ${unit} "per night" OR nightly OR "from $" OR CAD OR booking rate 2024 OR 2025 OR 2026`
    : `"${name}" ${unit} nightly rate OR price OR amenities ${city} ${state} Canada`;
  try {
    const response = await tavilyClient.search(query.trim(), {
      maxResults: ratesFocus ? 6 : 4,
      includeAnswer: true,
    });
    const parts: string[] = [];
    if (typeof response.answer === 'string') parts.push(response.answer);
    for (const res of response.results ?? []) {
      parts.push(`${res.title ?? ''}\n${res.content ?? ''}\n${res.url ?? ''}`);
    }
    return parts.join('\n\n').slice(0, 10000);
  } catch (err) {
    console.warn(`    Tavily failed: ${err instanceof Error ? err.message : err}`);
    return '';
  }
}

function buildAmenitiesRaw(update: Record<string, unknown>): string | null {
  const yes: string[] = [];
  for (const key of YES_NO_COLUMNS) {
    if (update[key] === 'Yes') {
      yes.push(key.replace(/^(unit_|property_|activities_|setting_)/, '').replace(/_/g, ' '));
    }
  }
  if (!yes.length) return null;
  return `Website/research amenities (${TODAY}): ${yes.slice(0, 40).join('; ')}`;
}

async function researchProperty(
  property: PropertyRow,
  evidence: string
): Promise<Record<string, unknown>> {
  const context = [
    `Property: ${property.property_name ?? 'Unknown'}`,
    `URL: ${property.url ?? 'Not provided'}`,
    `Address: ${property.address ?? 'Not provided'}`,
    `Location: ${[property.city, property.state, property.country].filter(Boolean).join(', ')}`,
    `Unit type: ${property.unit_type ?? 'Unknown'}`,
    `Property type: ${property.property_type ?? 'Glamping'}`,
    `Existing description: ${property.description ?? 'None'}`,
  ].join('\n');

  const ratesGuidance = ALLOW_ESTIMATES
    ? `Rates: Prefer published evidence. If the scrape/search lacks an explicit nightly price but this is a known bookable Canada glamping operator, provide a best-estimate CAD nightly average for the named unit type (mark rate_confidence "low" or "medium") using comparable regional luxury dome/yurt pricing. Do NOT return null for rate_avg_retail_daily_rate unless the property is clearly not bookable.`
    : `Rates: Prefer published evidence. If evidence is insufficient, return null for rates (do not invent).`;

  const amenityBlock = RATES_ONLY
    ? `2) Skip amenity fields (return {} for amenities) — rates/operating fields only.
   Still include: operating_season_months, year_site_opened, quantity_of_units, property_total_sites when known.`
    : `2) Operating season:
   - operating_season_months: number 1-12 (12 = year-round) or null
   - year_site_opened: number or null
   - quantity_of_units: number or null
   - property_total_sites: number or null
   - minimum_nights: string like "2 nights" or null
   - phone_number: string or null (only if found)
   - description: improved 2-4 sentence description if evidence supports it, else null

3) Yes/No amenities (exactly "Yes", "No", or null if unknown):
${YES_NO_COLUMNS.join(', ')}`;

  const prompt = `You are a research assistant for a Canadian glamping directory (Sage).
Extract nightly rates${RATES_ONLY ? '' : ' and amenities'} for this OPEN/OPERATING property from the evidence and your knowledge of the operator website.

${context}

EVIDENCE (website scrape and/or search snippets; may be incomplete):
${evidence.slice(0, 14000) || '(No scrape available — use careful knowledge of this named property only.)'}

${ratesGuidance}

Return ONLY valid JSON with:
1) Rates in Canadian dollars (CAD), numbers only (no $). Prefer published "from"/starting nightly rates for the named unit type. If a range is given, use the midpoint.
   - rate_currency: always "CAD"
   - rate_avg_retail_daily_rate: average typical nightly rate in CAD (or null)
   - rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
     rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend
     (use null if unknown; use the string "closed" if the property is closed that season)
   - rate_confidence: "high" | "medium" | "low"
   - rate_evidence_note: short string citing where the rate came from

${amenityBlock}

Rules:
- Prefer evidence over parametric memory.
${!RATES_ONLY ? '- If private hot tubs are mentioned per unit, set unit_hot_tub=Yes and unit_hot_tub_or_sauna=Yes.\n- If shared property spa/hot tub only, prefer property_hot_tub=Yes.\n' : ''}- Keep rates inside CAD ${MIN_RATE_CAD}-${MAX_RATE_CAD} for typical glamping nights.
- Keep research_status unchanged (do not include it).`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 3500,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty OpenAI response');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Invalid JSON from OpenAI');
    parsed = JSON.parse(m[0]);
  }

  const update: Record<string, unknown> = {};

  const year = toNum(parsed.year_site_opened);
  if (year != null && year > 1900 && year <= new Date().getFullYear() + 1) {
    update.year_site_opened = Math.round(year);
  }

  const months = toNum(parsed.operating_season_months);
  if (months != null && months >= 1 && months <= 12) {
    update.operating_season_months = String(Math.round(months));
  }

  const qty = toNum(parsed.quantity_of_units);
  if (qty != null && qty > 0) update.quantity_of_units = String(Math.round(qty));

  const sites = toNum(parsed.property_total_sites);
  if (sites != null && sites > 0) update.property_total_sites = String(Math.round(sites));

  if (typeof parsed.minimum_nights === 'string' && parsed.minimum_nights.trim()) {
    update.minimum_nights = parsed.minimum_nights.trim();
  }
  if (typeof parsed.phone_number === 'string' && parsed.phone_number.trim().length >= 7) {
    update.phone_number = parsed.phone_number.trim();
  }
  if (typeof parsed.description === 'string' && parsed.description.trim().length > 80) {
    update.description = parsed.description.trim();
  }

  const cadRates: Record<string, unknown> = {};
  const avgCad = toNum(parsed.rate_avg_retail_daily_rate);
  if (avgCad != null && avgCad >= MIN_RATE_CAD && avgCad <= MAX_RATE_CAD) {
    cadRates.rate_avg_retail_daily_rate = Math.round(avgCad);
  }

  for (const key of RATE_KEYS) {
    const rawVal = parsed[key];
    if (typeof rawVal === 'string' && rawVal.trim().toLowerCase() === 'closed') {
      cadRates[key] = 'closed';
      continue;
    }
    const n = toNum(rawVal);
    if (n != null && n >= MIN_RATE_CAD && n <= MAX_RATE_CAD) {
      cadRates[key] = Math.round(n);
    }
  }

  if (Object.keys(cadRates).length > 0) {
    const avg =
      toNum(cadRates.rate_avg_retail_daily_rate) ??
      (() => {
        const nums = RATE_KEYS.map((k) => toNum(cadRates[k])).filter(
          (n): n is number => n != null
        );
        if (!nums.length) return null;
        return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
      })();

    if (avg != null) cadRates.rate_avg_retail_daily_rate = avg;

    const seasonFallback = (wd: unknown, we: unknown) => ({
      weekday: toNum(wd) ?? avg,
      weekend: toNum(we) ?? avg,
    });

    cadRates.rate_unit_rates_by_year = {
      '2026': {
        currency: 'CAD',
        source: RESEARCH_TAG,
        confidence:
          typeof parsed.rate_confidence === 'string' ? parsed.rate_confidence : 'medium',
        evidence_note:
          typeof parsed.rate_evidence_note === 'string'
            ? parsed.rate_evidence_note
            : null,
        winter: seasonFallback(cadRates.rate_winter_weekday, cadRates.rate_winter_weekend),
        spring: seasonFallback(cadRates.rate_spring_weekday, cadRates.rate_spring_weekend),
        summer: seasonFallback(cadRates.rate_summer_weekday, cadRates.rate_summer_weekend),
        fall: seasonFallback(cadRates.rate_fall_weekday, cadRates.rate_fall_weekend),
      },
    };

    const { row: usdRow } = applyGlampingRatesToUsd(cadRates, { forceCurrency: 'CAD' });
    Object.assign(update, usdRow);
  }

  if (!RATES_ONLY) {
    for (const key of YES_NO_COLUMNS) {
      const normalized = normalizeYesNo(parsed[key]);
      if (normalized !== null) update[key] = normalized;
    }

    if (update.unit_hot_tub === 'Yes' || update.unit_sauna === 'Yes') {
      update.unit_hot_tub_or_sauna = 'Yes';
    }

    const amenitiesRaw = buildAmenitiesRaw(update);
    if (amenitiesRaw) update.amenities_raw = amenitiesRaw;
  }

  update.date_updated = TODAY;
  update.notes = appendNote(
    property.notes,
    `[${RESEARCH_TAG}] Rates (CAD→USD)${RATES_ONLY ? '' : ' + amenities'} enriched from website scrape / search + GPT extract on ${TODAY}${ALLOW_ESTIMATES ? ' (estimates allowed)' : ''}. Verify before publishing.`
  );

  return update;
}

async function main(): Promise<void> {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${FORCE ? ' (force)' : ''}${RATES_ONLY ? ' rates-only' : ''}${ALLOW_ESTIMATES ? ' allow-estimates' : ''}${MISSING_ADR ? ' missing-adr' : ''}`
  );
  console.log(`APIs: Firecrawl=${firecrawl ? 'yes' : 'no'} Tavily=${tavilyClient ? 'yes' : 'no'} OpenAI=yes`);
  console.log(`Discovery sources: ${DISCOVERY_SOURCES.join(', ')}\n`);

  let query = supabase
    .from(TABLE)
    .select(
      'id, property_name, url, address, city, state, country, unit_type, property_type, description, notes, rate_avg_retail_daily_rate, discovery_source'
    )
    .in('discovery_source', [...DISCOVERY_SOURCES])
    .eq('research_status', 'in_progress')
    .eq('country', 'Canada')
    .order('property_name');

  if (LIMIT && LIMIT > 0) query = query.limit(LIMIT);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (!rows?.length) {
    console.log('No matching properties found.');
    return;
  }

  const work = (MISSING_ADR || (!FORCE && RATES_ONLY)
    ? (rows as PropertyRow[]).filter(
        (r) => r.rate_avg_retail_daily_rate == null || Number(r.rate_avg_retail_daily_rate) <= 0
      )
    : (rows as PropertyRow[])) as PropertyRow[];

  console.log(`Enriching ${work.length} of ${rows.length} fetched properties.\n`);

  let ok = 0;
  let err = 0;
  let skipped = 0;

  for (let i = 0; i < work.length; i++) {
    const p = work[i] as PropertyRow;
    process.stdout.write(
      `[${i + 1}/${work.length}] ${p.property_name ?? p.id} (${p.city}, ${p.state}) ... `
    );

    if (
      !FORCE &&
      p.rate_avg_retail_daily_rate != null &&
      Number(p.rate_avg_retail_daily_rate) > 0
    ) {
      // Still allow amenity-only refresh when rate exists — continue
    }

    try {
      let evidence = '';
      if (p.url && /^https?:\/\//i.test(p.url)) {
        evidence = await firecrawlScrape(p.url.trim());
      }
      // Always pull Tavily rate evidence on rates-only / missing-adr passes
      if (RATES_ONLY || MISSING_ADR || evidence.length < 400) {
        const more = await tavilyEvidence(p, RATES_ONLY || MISSING_ADR || ALLOW_ESTIMATES);
        if (more) evidence = evidence ? `${evidence}\n\n---\n\n${more}` : more;
      }

      let update: Record<string, unknown> = {};
      for (let tryCount = 0; tryCount <= MAX_RETRIES; tryCount++) {
        try {
          update = await researchProperty(p, evidence);
          break;
        } catch (e) {
          if (tryCount === MAX_RETRIES) throw e;
          await sleep(DELAY_MS * 2);
        }
      }

      const keys = Object.keys(update).filter((k) => k !== 'date_updated' && k !== 'notes');
      if (!keys.length) {
        console.log('no data');
        skipped += 1;
        continue;
      }

      const rate = update.rate_avg_retail_daily_rate;
      const amenityYes = YES_NO_COLUMNS.filter((k) => update[k] === 'Yes').length;

      if (!DRY_RUN) {
        const { error: upErr } = await supabase.from(TABLE).update(update).eq('id', p.id);
        if (upErr) {
          console.log(`update failed: ${upErr.message}`);
          err += 1;
          continue;
        }
      }

      console.log(
        `${keys.length} fields` +
          (rate != null ? ` | ADR≈$${rate} USD` : ' | no ADR') +
          ` | ${amenityYes} Yes amenities` +
          (evidence ? ' | scraped' : ' | no scrape')
      );
      ok += 1;
    } catch (e) {
      console.log(`error: ${e instanceof Error ? e.message : e}`);
      err += 1;
    }
  }

  console.log(`\nDone. Enriched: ${ok}, Skipped: ${skipped}, Errors: ${err}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
