#!/usr/bin/env npx tsx
/**
 * High-accuracy ADR backfill for published open glamping rows missing rates.
 *
 * Tiers:
 *   0. Sibling copy (same property_id + unit_type with existing ADR)
 *   1. Firecrawl scrape of property URL + regex/GPT extract
 *   2. Tavily SERP rate search + extract
 *   3. GPT estimate (only with --allow-estimates)
 *
 * Usage:
 *   npx tsx scripts/apply-missing-published-adr-2026-07-09.ts
 *   npx tsx scripts/apply-missing-published-adr-2026-07-09.ts --apply --phase=us-url --tier=1 --limit=25
 *   npx tsx scripts/apply-missing-published-adr-2026-07-09.ts --apply --phase=all --tier=all
 *   npx tsx scripts/apply-missing-published-adr-2026-07-09.ts --apply --allow-estimates
 *   npx tsx scripts/apply-missing-published-adr-2026-07-09.ts --apply --ids=12947,11591 --tier=all
 */
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { tavily } from '@tavily/core';
import FirecrawlApp from '@mendable/firecrawl-js';
import { applyGlampingRatesToUsd } from '@/lib/glamping-rates-usd';
import { GLAMPING_SEASON_RATE_DB_COLUMNS } from '@/lib/glamping-seasonal-rate';
import {
  extractRateFromWebText,
  extractRateRangeFromWebText,
} from '@/lib/comps-v2/tavily-gap';
import {
  appendNote,
  createP1AuditClient,
  csvEscape,
  normKey,
  parsePositiveNumber,
  TODAY,
  writeCsv,
  OUTPUT_DIR,
} from '@/lib/sage-data-p1-audit';

type Source =
  | 'sibling_copy'
  | 'firecrawl'
  | 'tavily'
  | 'gpt_estimate'
  | 'skipped_no_evidence';

type Row = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
  brand_id: string | null;
  notes: string | null;
  land_operator_category: string | null;
  research_status: string | null;
  is_open: string | null;
  is_glamping_property: string | null;
  rate_avg_retail_daily_rate: unknown;
  rate_winter_weekday: unknown;
  rate_winter_weekend: unknown;
  rate_spring_weekday: unknown;
  rate_spring_weekend: unknown;
  rate_summer_weekday: unknown;
  rate_summer_weekend: unknown;
  rate_fall_weekday: unknown;
  rate_fall_weekend: unknown;
  rate_unit_rates_by_year: unknown;
};

type RatePayload = {
  avg: number;
  seasons: Record<(typeof GLAMPING_SEASON_RATE_DB_COLUMNS)[number], number>;
  source: Source;
  evidenceUrl: string | null;
};

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;
const ALLOW_ESTIMATES = process.argv.includes('--allow-estimates');
const FORCE = process.argv.includes('--force');

const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]!, 10) : undefined;

const PHASE_ARG = process.argv.find((a) => a.startsWith('--phase='));
const PHASE = (PHASE_ARG?.split('=')[1] ?? 'all') as
  | 'us-url'
  | 'us'
  | 'intl'
  | 'all';

const TIER_ARG = process.argv.find((a) => a.startsWith('--tier='));
const TIER = (TIER_ARG?.split('=')[1] ?? 'all') as '1' | '2' | '3' | 'all';

const IDS_ARG = process.argv.find((a) => a.startsWith('--ids='));
const IDS = new Set(
  (IDS_ARG?.split('=')[1] ?? '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
);

const DELAY_MS = 1500;
const MIN_RATE = 20;
const MAX_RATE = 2500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isUs(country: string | null | undefined): boolean {
  const c = normKey(country);
  return c === 'united states' || c === 'usa' || c === 'us' || c === '';
}

function isValidRate(n: number): boolean {
  return Number.isFinite(n) && n >= MIN_RATE && n <= MAX_RATE;
}

function looksLikePerPersonPackage(text: string): boolean {
  return /per\s*person|pp\/|\/pp\b|per\s*guest/i.test(text) &&
    !/per\s*night|nightly|\/\s*night/i.test(text);
}

function fillSeasonsFromAvg(
  avg: number
): Record<(typeof GLAMPING_SEASON_RATE_DB_COLUMNS)[number], number> {
  // AutoCamp-style mild seasonality around a single published anchor
  const a = Math.round(avg);
  return {
    rate_winter_weekday: Math.round(a * 0.88),
    rate_winter_weekend: Math.round(a * 0.98),
    rate_spring_weekday: a,
    rate_spring_weekend: Math.round(a * 1.08),
    rate_summer_weekday: Math.round(a * 1.12),
    rate_summer_weekend: Math.round(a * 1.24),
    rate_fall_weekday: Math.round(a * 1.04),
    rate_fall_weekend: Math.round(a * 1.14),
  };
}

function buildRateJson(
  seasons: Record<(typeof GLAMPING_SEASON_RATE_DB_COLUMNS)[number], number>
): Record<string, unknown> {
  return {
    '2026': {
      winter: {
        weekday: seasons.rate_winter_weekday,
        weekend: seasons.rate_winter_weekend,
      },
      spring: {
        weekday: seasons.rate_spring_weekday,
        weekend: seasons.rate_spring_weekend,
      },
      summer: {
        weekday: seasons.rate_summer_weekday,
        weekend: seasons.rate_summer_weekend,
      },
      fall: {
        weekday: seasons.rate_fall_weekday,
        weekend: seasons.rate_fall_weekend,
      },
      currency: 'USD',
      source: 'p1_adr_backfill_2026-07-09',
    },
  };
}

function extractRateFromText(text: string): number | null {
  if (!text.trim()) return null;
  if (looksLikePerPersonPackage(text.slice(0, 2000))) return null;
  const single = extractRateFromWebText(text);
  if (single != null && isValidRate(single)) return single;
  const range = extractRateRangeFromWebText(text);
  if (range && isValidRate(range.mid)) return range.mid;
  return null;
}

function matchesPhase(r: Row): boolean {
  const us = isUs(r.country);
  const hasUrl = Boolean(r.url?.trim());
  switch (PHASE) {
    case 'us-url':
      return us && hasUrl;
    case 'us':
      return us;
    case 'intl':
      return !us;
    case 'all':
      return true;
    default: {
      const _exhaustive: never = PHASE;
      return _exhaustive;
    }
  }
}

function tierAllows(source: Source): boolean {
  if (TIER === 'all') return true;
  if (source === 'sibling_copy') return true;
  if (source === 'firecrawl') return TIER === '1' || TIER === 'all';
  if (source === 'tavily') return TIER === '2' || TIER === 'all';
  if (source === 'gpt_estimate') return TIER === '3' || TIER === 'all';
  return false;
}

async function firecrawlScrape(
  firecrawl: FirecrawlApp,
  url: string
): Promise<string> {
  try {
    const result = (await firecrawl.scrape(url, {
      formats: ['markdown'],
    })) as { markdown?: string };
    return result.markdown ?? '';
  } catch (err) {
    console.warn(
      `    Firecrawl failed: ${err instanceof Error ? err.message : err}`
    );
    return '';
  }
}

async function tavilyRateSearch(
  client: ReturnType<typeof tavily>,
  r: Row
): Promise<{ text: string; url: string | null }> {
  const name = r.property_name ?? '';
  const city = r.city ?? '';
  const state = r.state ?? '';
  const unit = r.unit_type ?? 'glamping';
  const query = `"${name}" ${unit} nightly rate price per night ${city} ${state} 2025 2026`.trim();
  try {
    const response = await client.search(query, {
      maxResults: 5,
      includeAnswer: true,
    });
    const parts: string[] = [];
    if (typeof response.answer === 'string') parts.push(response.answer);
    let topUrl: string | null = null;
    for (const res of response.results ?? []) {
      if (!topUrl && res.url) topUrl = res.url;
      parts.push(`${res.title ?? ''}\n${res.content ?? ''}\n${res.url ?? ''}`);
    }
    return { text: parts.join('\n\n'), url: topUrl };
  } catch (err) {
    console.warn(
      `    Tavily failed: ${err instanceof Error ? err.message : err}`
    );
    return { text: '', url: null };
  }
}

async function gptExtractRate(
  openai: OpenAI,
  context: string,
  evidence: string
): Promise<number | null> {
  const prompt = `Extract the best estimate of the average nightly retail rate in USD for this glamping unit from the evidence below.
Return ONLY JSON: {"rate": number|null, "per_person": boolean}
Rules:
- Prefer published "from" / starting nightly rates for the named unit type.
- Reject per-person package prices unless you can convert to a room/unit nightly rate.
- Rate must be between ${MIN_RATE} and ${MAX_RATE}.
- If evidence is insufficient, return {"rate": null, "per_person": false}.

Property context:
${context}

Evidence:
${evidence.slice(0, 12000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 120,
    });
    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rate?: unknown; per_person?: boolean };
    if (parsed.per_person) return null;
    const n = parsePositiveNumber(parsed.rate);
    if (n == null || !isValidRate(n)) return null;
    return Math.round(n);
  } catch {
    return null;
  }
}

async function gptEstimateOnly(
  openai: OpenAI,
  r: Row
): Promise<number | null> {
  const prompt = `Estimate the average nightly retail rate in USD for this glamping property/unit.
Return ONLY JSON: {"rate": number|null}
Rate must be between ${MIN_RATE} and ${MAX_RATE}. Use null if you cannot estimate confidently.

Property: ${r.property_name}
Site/Unit: ${r.site_name ?? 'n/a'}
Unit type: ${r.unit_type ?? 'n/a'}
Location: ${[r.city, r.state, r.country].filter(Boolean).join(', ')}
URL: ${r.url ?? 'n/a'}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 80,
    });
    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rate?: unknown };
    const n = parsePositiveNumber(parsed.rate);
    if (n == null || !isValidRate(n)) return null;
    return Math.round(n);
  } catch {
    return null;
  }
}

function copySiblingRates(
  target: Row,
  siblings: Row[]
): RatePayload | null {
  const unit = normKey(target.unit_type);
  const match = siblings
    .filter(
      (s) =>
        s.id !== target.id &&
        normKey(s.unit_type) === unit &&
        parsePositiveNumber(s.rate_avg_retail_daily_rate) != null
    )
    .sort((a, b) => a.id - b.id)[0];
  if (!match) return null;
  const avg = parsePositiveNumber(match.rate_avg_retail_daily_rate)!;
  const filled = fillSeasonsFromAvg(avg);
  const seasons = { ...filled };
  let hasSeason = false;
  for (const col of GLAMPING_SEASON_RATE_DB_COLUMNS) {
    const n = parsePositiveNumber(match[col]);
    if (n != null) {
      seasons[col] = n;
      hasSeason = true;
    }
  }
  return {
    avg,
    seasons: hasSeason ? seasons : filled,
    source: 'sibling_copy',
    evidenceUrl: null,
  };
}

async function resolveRate(
  r: Row,
  siblings: Row[],
  deps: {
    firecrawl: FirecrawlApp | null;
    tavilyClient: ReturnType<typeof tavily> | null;
    openai: OpenAI | null;
  }
): Promise<RatePayload | null> {
  // Tier 0: sibling
  const sib = copySiblingRates(r, siblings);
  if (sib && tierAllows('sibling_copy')) return sib;

  const context = [
    `Property: ${r.property_name}`,
    `Site: ${r.site_name ?? 'n/a'}`,
    `Unit type: ${r.unit_type ?? 'n/a'}`,
    `Location: ${[r.city, r.state, r.country].filter(Boolean).join(', ')}`,
    `URL: ${r.url ?? 'n/a'}`,
  ].join('\n');

  // Tier 1: Firecrawl
  if (
    (TIER === '1' || TIER === 'all') &&
    deps.firecrawl &&
    r.url?.trim()
  ) {
    const md = await firecrawlScrape(deps.firecrawl, r.url.trim());
    await sleep(800);
    let rate = extractRateFromText(md);
    if (rate == null && deps.openai && md.length > 200) {
      rate = await gptExtractRate(deps.openai, context, md);
    }
    if (rate != null) {
      return {
        avg: rate,
        seasons: fillSeasonsFromAvg(rate),
        source: 'firecrawl',
        evidenceUrl: r.url.trim(),
      };
    }
  }

  // Tier 2: Tavily
  if ((TIER === '2' || TIER === 'all') && deps.tavilyClient) {
    const { text, url } = await tavilyRateSearch(deps.tavilyClient, r);
    await sleep(500);
    let rate = extractRateFromText(text);
    if (rate == null && deps.openai && text.length > 100) {
      rate = await gptExtractRate(deps.openai, context, text);
    }
    if (rate != null) {
      return {
        avg: rate,
        seasons: fillSeasonsFromAvg(rate),
        source: 'tavily',
        evidenceUrl: url,
      };
    }
  }

  // Tier 3: GPT estimate (opt-in)
  if (
    ALLOW_ESTIMATES &&
    (TIER === '3' || TIER === 'all') &&
    deps.openai
  ) {
    const rate = await gptEstimateOnly(deps.openai, r);
    if (rate != null) {
      return {
        avg: rate,
        seasons: fillSeasonsFromAvg(rate),
        source: 'gpt_estimate',
        evidenceUrl: null,
      };
    }
  }

  return null;
}

async function main() {
  const supabase = createP1AuditClient();
  const openaiKey = process.env.OPENAI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;

  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
  const tavilyClient = tavilyKey ? tavily({ apiKey: tavilyKey }) : null;
  const firecrawl = firecrawlKey
    ? new FirecrawlApp({ apiKey: firecrawlKey })
    : null;

  console.log(
    DRY_RUN
      ? '[DRY RUN] No DB writes\n'
      : '[APPLY] Writing rates to all_sage_data\n'
  );
  console.log(`Phase=${PHASE} tier=${TIER} allowEstimates=${ALLOW_ESTIMATES}`);
  if (IDS.size > 0) {
    console.log(`IDs filter=${[...IDS].sort((a, b) => a - b).join(',')}`);
  }
  console.log(
    `APIs: Firecrawl=${firecrawl ? 'yes' : 'no'} Tavily=${tavilyClient ? 'yes' : 'no'} OpenAI=${openai ? 'yes' : 'no'}\n`
  );

  const select = [
    'id',
    'property_id',
    'property_name',
    'site_name',
    'unit_type',
    'city',
    'state',
    'country',
    'url',
    'brand_id',
    'notes',
    'land_operator_category',
    'research_status',
    'is_open',
    'is_glamping_property',
    'rate_avg_retail_daily_rate',
    'rate_unit_rates_by_year',
    ...GLAMPING_SEASON_RATE_DB_COLUMNS,
  ].join(',');

  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(select)
      .eq('research_status', 'published')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const byPid = new Map<string, Row[]>();
  for (const r of all) {
    const pid = r.property_id?.trim();
    if (!pid) continue;
    const list = byPid.get(pid) ?? [];
    list.push(r);
    byPid.set(pid, list);
  }

  let missing = all.filter(
    (r) =>
      (IDS.size === 0 || IDS.has(r.id)) &&
      normKey(r.is_open) === 'yes' &&
      normKey(r.is_glamping_property) === 'yes' &&
      (FORCE || parsePositiveNumber(r.rate_avg_retail_daily_rate) == null) &&
      matchesPhase(r)
  );

  // Prefer private_commercial + has URL first within phase
  missing = missing.sort((a, b) => {
    const aPc =
      normKey(a.land_operator_category) === 'private_commercial' ? 0 : 1;
    const bPc =
      normKey(b.land_operator_category) === 'private_commercial' ? 0 : 1;
    if (aPc !== bPc) return aPc - bPc;
    const aUrl = a.url?.trim() ? 0 : 1;
    const bUrl = b.url?.trim() ? 0 : 1;
    if (aUrl !== bUrl) return aUrl - bUrl;
    return a.id - b.id;
  });

  if (LIMIT != null && Number.isFinite(LIMIT)) {
    missing = missing.slice(0, LIMIT);
  }

  console.log(`Processing ${missing.length} missing-ADR rows\n`);

  const resultLines: string[] = [];
  const manualLines: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < missing.length; i++) {
    const r = missing[i]!;
    const progress = `[${i + 1}/${missing.length}]`;
    console.log(
      `${progress} ${r.property_name} (${r.city}, ${r.state}) id=${r.id}`
    );

    const siblings = r.property_id?.trim()
      ? byPid.get(r.property_id.trim()) ?? []
      : [];

    const payload = await resolveRate(r, siblings, {
      firecrawl,
      tavilyClient,
      openai,
    });

    if (!payload) {
      skipped += 1;
      console.log('   skipped_no_evidence');
      resultLines.push(
        [
          String(r.id),
          csvEscape(r.property_name ?? ''),
          '',
          'skipped_no_evidence',
          '',
          DRY_RUN ? 'dry_run' : 'skipped',
        ].join(',')
      );
      manualLines.push(
        [
          String(r.id),
          csvEscape(r.property_name ?? ''),
          csvEscape(r.site_name ?? ''),
          csvEscape(r.unit_type ?? ''),
          csvEscape(r.city ?? ''),
          csvEscape(r.state ?? ''),
          csvEscape(r.country ?? ''),
          csvEscape(r.url ?? ''),
          csvEscape(r.brand_id ?? ''),
        ].join(',')
      );
      await sleep(300);
      continue;
    }

    console.log(
      `   ${payload.source} → $${payload.avg}${payload.evidenceUrl ? ` (${payload.evidenceUrl})` : ''}`
    );

    const note = `[${TODAY}] ADR from ${payload.source}${
      payload.evidenceUrl ? `: ${payload.evidenceUrl}` : ''
    } (avg $${payload.avg}).`;

    let patch: Record<string, unknown> = {
      ...payload.seasons,
      rate_unit_rates_by_year: buildRateJson(payload.seasons),
      notes: appendNote(r.notes, note),
      date_updated: TODAY,
    };

    // Do not set rate_avg_retail_daily_rate directly when seasons are set —
    // DB trigger calc_avg_retail_daily_rate maintains it. Still set as fallback
    // for environments without the trigger.
    patch.rate_avg_retail_daily_rate = payload.avg;

    if (!isUs(r.country)) {
      const { row: usdRow } = applyGlampingRatesToUsd(patch);
      patch = usdRow;
    }

    resultLines.push(
      [
        String(r.id),
        csvEscape(r.property_name ?? ''),
        String(payload.avg),
        payload.source,
        csvEscape(payload.evidenceUrl ?? ''),
        DRY_RUN ? 'dry_run' : 'update',
      ].join(',')
    );

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('all_sage_data')
        .update(patch)
        .eq('id', r.id);
      if (error) throw error;
    }
    updated += 1;
    await sleep(DELAY_MS);
  }

  const resultsPath = resolve(OUTPUT_DIR, 'missing-published-adr-results.csv');
  writeCsv(
    resultsPath,
    'id,property_name,rate,source,evidence_url,action',
    resultLines
  );

  const manualPath = resolve(
    OUTPUT_DIR,
    'missing-published-adr-manual-queue.csv'
  );
  writeCsv(
    manualPath,
    'id,property_name,site_name,unit_type,city,state,country,url,brand_id',
    manualLines
  );

  console.log('\n=== SUMMARY ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (manual queue): ${skipped}`);
  console.log(`Wrote ${resultsPath}`);
  console.log(`Wrote ${manualPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
