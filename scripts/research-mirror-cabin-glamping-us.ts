#!/usr/bin/env npx tsx
/**
 * Phase 3 — USA Mirror Cabin web discovery (Tavily + optional Firecrawl + GPT).
 *
 * Writes review artifacts only (no DB inserts):
 *   scripts/.tmp-mirror-cabin-review/phase3-discovery-results.jsonl
 *   scripts/.tmp-mirror-cabin-review/phase3-discovery-queue.csv
 *   scripts/.tmp-mirror-cabin-review/phase3-already-in-sage.csv
 *
 * Usage:
 *   npx tsx scripts/research-mirror-cabin-glamping-us.ts --dry-run
 *   npx tsx scripts/research-mirror-cabin-glamping-us.ts --limit 30
 *   npx tsx scripts/research-mirror-cabin-glamping-us.ts --no-firecrawl --limit 20
 *
 * Env: TAVILY_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *      FIRECRAWL_API_KEY (optional unless Firecrawl enabled)
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { tavily } from '@tavily/core';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { scrapeUrlMarkdown } from '@/lib/comps-v2/scrape-url';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-mirror-cabin-review');
const TODAY = new Date().toISOString().split('T')[0];
const TAVILY_DELAY_MS = 700;
const OPENAI_MODEL = process.env.MIRROR_CABIN_RESEARCH_MODEL || 'gpt-4o';

const SEARCH_QUERIES = [
  'mirror cabin glamping USA resort',
  'ÖÖD house stay United States',
  'ood mirror house glamping resort',
  'mirrored glass cabin glamping United States',
  'glass cabin glamping resort USA',
  'Stay ÖÖD destinations United States',
  'Tu Tu Tun Lodge glass cabin',
  'mirror house glamping Texas Oregon California',
  'Oak Ranch Resort mirror houses Graham Texas',
  'Glamp Michigan ÖÖD mirror house Benzonia',
  'mirror houses glamping Michigan Texas New Hampshire',
  'Scandinavian mirrored cabin glamping United States book',
  'ÖÖD Hotels United States accommodation list',
  'mirrored cabin resort Possum Kingdom OR White Mountains',
];

/** Prefer scraping these even if Tavily ranks them lower. */
const SEED_URLS = [
  'https://glampmichigan.co/mirrorhouses',
  'https://oakranchresort.com/mirror-houses/',
  'https://www.glamptuary.com/blog/spotlight-on-glamping-structures-mirror-cabins',
  'https://oodhouse.com/en-us',
  'https://tututun.com/',
];

type Args = {
  dryRun: boolean;
  limit: number;
  noFirecrawl: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limitRaw = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? '', 10) : 40;
  return {
    dryRun: args.includes('--dry-run'),
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 40,
    noFirecrawl: args.includes('--no-firecrawl'),
  };
}

type SageRow = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  url: string | null;
};

type DiscoveryCandidate = {
  property_name: string;
  city: string | null;
  state: string | null;
  url: string | null;
  unit_count: number | null;
  is_hospitality: boolean;
  is_private_residential: boolean;
  notes: string;
  source_urls: string[];
};

type QueueRow = DiscoveryCandidate & {
  status: 'new_candidate' | 'already_in_sage' | 'reject_private' | 'reject_incomplete';
  matched_sage_id: number | null;
  matched_property_name: string | null;
  normalized_unit_type: string;
};

function normalizeName(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(path: string, headers: string[], rows: string[][]): void {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => escapeCsv(c ?? '')).join(','))];
  writeFileSync(path, lines.join('\n') + '\n', 'utf-8');
}

async function fetchSageRows(
  supabase: ReturnType<typeof createClient>
): Promise<SageRow[]> {
  const all: SageRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select('id, property_id, property_name, site_name, unit_type, city, state, url')
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...(data as SageRow[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

function findSageMatch(
  candidate: DiscoveryCandidate,
  sage: SageRow[]
): SageRow | null {
  const name = normalizeName(candidate.property_name);
  const city = normalizeName(candidate.city);
  const state = String(candidate.state ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!name) return null;

  for (const row of sage) {
    const rn = normalizeName(row.property_name);
    const rs = String(row.state ?? '')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    if (!rn) continue;
    if (state && rs && state !== rs) continue;
    if (rn === name || rn.includes(name) || name.includes(rn)) {
      if (!city) return row;
      const rc = normalizeName(row.city);
      if (!rc || rc === city || rc.includes(city) || city.includes(rc)) return row;
    }
  }

  const candUrl = String(candidate.url ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (candUrl.length >= 12) {
    for (const row of sage) {
      const u = String(row.url ?? '')
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');
      if (u && (u.includes(candUrl) || candUrl.includes(u))) return row;
    }
  }
  return null;
}

async function tavilyDiscover(
  apiKey: string,
  limit: number
): Promise<Array<{ url: string; title: string; content: string }>> {
  const client = tavily({ apiKey });
  const seen = new Set<string>();
  const out: Array<{ url: string; title: string; content: string }> = [];

  for (const query of SEARCH_QUERIES) {
    if (out.length >= limit) break;
    try {
      const response = await client.search(query, {
        searchDepth: 'advanced',
        maxResults: 8,
        includeAnswer: false,
      });
      for (const r of response.results || []) {
        const url = String(r.url ?? '');
        if (!url.startsWith('http') || seen.has(url)) continue;
        seen.add(url);
        out.push({
          url,
          title: String(r.title ?? ''),
          content: String(r.content ?? '').slice(0, 2500),
        });
        if (out.length >= limit) break;
      }
    } catch (err) {
      console.warn(`Tavily failed for "${query}":`, err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, TAVILY_DELAY_MS));
  }
  return out;
}

async function extractCandidates(
  openai: OpenAI,
  docs: Array<{ url: string; title: string; content: string }>,
  firecrawlSnippets: Record<string, string>
): Promise<DiscoveryCandidate[]> {
  const packed = docs
    .map((d, i) => {
      const extra = firecrawlSnippets[d.url] ? `\nFIRECRAWL:\n${firecrawlSnippets[d.url].slice(0, 4000)}` : '';
      return `[DOC ${i + 1}]\nURL: ${d.url}\nTITLE: ${d.title}\nSNIPPET: ${d.content}${extra}`;
    })
    .join('\n\n');

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract USA Mirror Cabin / ÖÖD / mirrored glass cabin hospitality properties from web docs.
Return JSON: { "candidates": [ { "property_name": string, "city": string|null, "state": string|null, "url": string|null, "unit_count": number|null, "is_hospitality": boolean, "is_private_residential": boolean, "notes": string, "source_urls": string[] } ] }
Rules:
- United States only.
- Include bookable resorts/lodges/glamping sites with mirror/ÖÖD/glass cabins.
- Exclude private backyard installs, single vacation homes without a hospitality brand, pure manufacturer pages with no stay location, news listicles without a specific property.
- state must be 2-letter US code when known.
- Prefer official booking/property URLs.
- unit_count = number of mirror/glass/ÖÖD units when stated; else null.`,
      },
      { role: 'user', content: packed.slice(0, 100_000) },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{"candidates":[]}';
  let parsed: { candidates?: DiscoveryCandidate[] };
  try {
    parsed = JSON.parse(raw) as { candidates?: DiscoveryCandidate[] };
  } catch {
    console.warn('GPT JSON parse failed');
    return [];
  }
  return (parsed.candidates ?? [])
    .map((c) => ({
      property_name: String(c.property_name ?? '').trim(),
      city: c.city ? String(c.city).trim() : null,
      state: c.state
        ? String(c.state)
            .trim()
            .toUpperCase()
            .slice(0, 2)
        : null,
      url: c.url ? String(c.url).trim() : null,
      unit_count:
        typeof c.unit_count === 'number' && Number.isFinite(c.unit_count)
          ? c.unit_count
          : null,
      is_hospitality: Boolean(c.is_hospitality),
      is_private_residential: Boolean(c.is_private_residential),
      notes: String(c.notes ?? '').trim(),
      source_urls: Array.isArray(c.source_urls)
        ? c.source_urls.map(String)
        : [],
    }))
    .filter((c) => c.property_name.length >= 2);
}

async function main(): Promise<void> {
  const opts = parseArgs();
  const tavilyKey = process.env.TAVILY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!tavilyKey || !openaiKey || !supabaseUrl || !secretKey) {
    console.error('Missing TAVILY_API_KEY, OPENAI_API_KEY, or Supabase credentials');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const resultsPath = join(OUT_DIR, 'phase3-discovery-results.jsonl');
  writeFileSync(resultsPath, '', 'utf-8');

  console.log(`Phase 3 Mirror Cabin discovery (limit=${opts.limit}, firecrawl=${!opts.noFirecrawl})`);
  console.log('Alias check:', normalizeGlampingUnitTypeForStorage('glass cabin'));

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('Loading all_sage_data for dedupe...');
  const sage = await fetchSageRows(supabase);
  console.log(`  ${sage.length} rows`);

  console.log('Tavily search...');
  // Reserve slots so seed URLs are never crowded out by Tavily volume.
  const tavilyBudget = Math.max(1, opts.limit - SEED_URLS.length);
  const docs = await tavilyDiscover(tavilyKey, tavilyBudget);
  const seenDocUrls = new Set(docs.map((d) => d.url));
  for (const url of SEED_URLS) {
    if (seenDocUrls.has(url)) continue;
    docs.unshift({
      url,
      title: 'seed',
      content: 'Seeded Mirror Cabin discovery URL for Firecrawl/GPT extract.',
    });
    seenDocUrls.add(url);
  }
  if (docs.length > opts.limit) docs.length = opts.limit;
  console.log(`  ${docs.length} unique docs (incl. seeds)`);

  const firecrawlSnippets: Record<string, string> = {};
  if (!opts.noFirecrawl && !opts.dryRun) {
    const throttle = { lastCall: 0 };
    const seedFirst = [
      ...docs.filter((d) => SEED_URLS.includes(d.url)),
      ...docs.filter((d) => !SEED_URLS.includes(d.url)),
    ];
    const targets = seedFirst.slice(0, Math.min(16, seedFirst.length));
    console.log(`Firecrawl deep scrape (${targets.length} URLs)...`);
    for (const d of targets) {
      const scraped = await scrapeUrlMarkdown(d.url, throttle);
      if (scraped.ok) {
        firecrawlSnippets[d.url] = scraped.markdown;
        console.log(`  ok ${d.url.slice(0, 80)}`);
      } else {
        console.log(`  skip ${scraped.reason} ${d.url.slice(0, 80)}`);
      }
    }
  } else if (opts.dryRun) {
    console.log('Dry-run: skipping Firecrawl');
  }

  console.log('GPT extract...');
  const candidates = await extractCandidates(openai, docs, firecrawlSnippets);
  console.log(`  ${candidates.length} candidates`);

  const queue: QueueRow[] = [];
  const seenNames = new Set<string>();
  for (const c of candidates) {
    const key = `${normalizeName(c.property_name)}|${String(c.state ?? '').toUpperCase()}`;
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    const match = findSageMatch(c, sage);
    let status: QueueRow['status'] = 'new_candidate';
    if (c.is_private_residential || !c.is_hospitality) status = 'reject_private';
    else if (match) status = 'already_in_sage';
    else if (!c.state || !c.url) status = 'reject_incomplete';

    const row: QueueRow = {
      ...c,
      status,
      matched_sage_id: match?.id ?? null,
      matched_property_name: match?.property_name ?? null,
      normalized_unit_type: 'Mirror Cabin',
    };
    queue.push(row);
    appendFileSync(resultsPath, JSON.stringify({ ...row, audit_date: TODAY }) + '\n');
  }

  const newRows = queue.filter((q) => q.status === 'new_candidate');
  const already = queue.filter((q) => q.status === 'already_in_sage');
  const rejected = queue.filter(
    (q) => q.status === 'reject_private' || q.status === 'reject_incomplete'
  );

  writeCsv(
    join(OUT_DIR, 'phase3-discovery-queue.csv'),
    [
      'status',
      'property_name',
      'city',
      'state',
      'url',
      'unit_count',
      'normalized_unit_type',
      'matched_sage_id',
      'matched_property_name',
      'notes',
      'source_urls',
      'audit_date',
    ],
    newRows.map((q) => [
      q.status,
      q.property_name,
      q.city ?? '',
      q.state ?? '',
      q.url ?? '',
      q.unit_count != null ? String(q.unit_count) : '',
      q.normalized_unit_type,
      '',
      '',
      q.notes,
      q.source_urls.join(' | '),
      TODAY,
    ])
  );

  writeCsv(
    join(OUT_DIR, 'phase3-already-in-sage.csv'),
    [
      'property_name',
      'city',
      'state',
      'url',
      'matched_sage_id',
      'matched_property_name',
      'notes',
      'audit_date',
    ],
    already.map((q) => [
      q.property_name,
      q.city ?? '',
      q.state ?? '',
      q.url ?? '',
      q.matched_sage_id != null ? String(q.matched_sage_id) : '',
      q.matched_property_name ?? '',
      q.notes,
      TODAY,
    ])
  );

  writeCsv(
    join(OUT_DIR, 'phase3-rejected.csv'),
    ['status', 'property_name', 'city', 'state', 'url', 'notes', 'audit_date'],
    rejected.map((q) => [
      q.status,
      q.property_name,
      q.city ?? '',
      q.state ?? '',
      q.url ?? '',
      q.notes,
      TODAY,
    ])
  );

  console.log('\nSummary');
  console.log(`  new_candidate: ${newRows.length}`);
  console.log(`  already_in_sage: ${already.length}`);
  console.log(`  rejected: ${rejected.length}`);
  console.log(`Artifacts under ${OUT_DIR}`);
  for (const q of newRows.slice(0, 20)) {
    console.log(`  NEW ${q.property_name} (${q.city}, ${q.state}) qty=${q.unit_count ?? '?'} ${q.url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
