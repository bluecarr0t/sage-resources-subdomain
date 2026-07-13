#!/usr/bin/env npx tsx
/**
 * Phase 0 — A-Frame USA inventory baseline vs Hipcamp gap.
 *
 * Exports under scripts/.tmp-a-frame-review/:
 *   - sage-a-frame-inventory.csv
 *   - reclass-queue.csv
 *   - hipcamp-gap-queue.csv
 *   - PHASE0_BASELINE-YYYY-MM-DD.md
 *
 * Usage: npx tsx scripts/analyze-a-frame-usa-inventory.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-a-frame-review');
const TODAY = new Date().toISOString().split('T')[0];
const TABLE = ALL_SAGE_DATA_TABLE;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const US_COUNTRIES = new Set(['united states', 'usa', 'us']);

const US_STATE_ABBREV: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toStateCode(state: string | null | undefined): string {
  const raw = (state ?? '').trim();
  if (!raw) return '';
  if (raw.length === 2) return raw.toUpperCase();
  return US_STATE_ABBREV[raw.toLowerCase()] ?? raw.toUpperCase();
}

function isUsCountry(country: string | null | undefined): boolean {
  if (!country) return true;
  return US_COUNTRIES.has(country.trim().toLowerCase());
}

function hasAFrameSignal(text: string | null | undefined): boolean {
  const t = (text ?? '').toLowerCase();
  return t.includes('a-frame') || t.includes('a frame') || t.includes('aframe');
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',');
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

async function fetchAllSageRows(): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, property_id, property_name, site_name, unit_type, city, state, country, research_status, is_open, quantity_of_units, rate_avg_retail_daily_rate, url, description'
      )
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Sage fetch: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function fetchHipcampAFrames(): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('hipcamp')
      .select('property_name, city, state, country, unit_type, url')
      .or('unit_type.ilike.%a frame%,unit_type.ilike.%a-frame%')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Hipcamp fetch: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all.filter((r) => isUsCountry(r.country as string | null));
}

type Action =
  | 'retype'
  | 'skip_already_has_aframe'
  | 'ambiguous'
  | 'description_only';

function recommendAction(
  row: Record<string, unknown>,
  propertyHasAFrame: Set<string>
): Action {
  const site = String(row.site_name ?? '');
  const propId = String(row.property_id ?? '');
  const signalOnSite = hasAFrameSignal(site);
  const signalOnName = hasAFrameSignal(String(row.property_name ?? ''));
  const signalOnDesc = hasAFrameSignal(String(row.description ?? ''));

  if (!signalOnSite && !signalOnName) {
    return 'description_only';
  }

  if (propId && propertyHasAFrame.has(propId)) {
    return 'skip_already_has_aframe';
  }

  const siteLower = site.toLowerCase();
  if (siteLower.includes('a-frame tent') || siteLower.includes('a frame tent')) {
    return 'ambiguous';
  }
  if (siteLower.includes('a-frame/') || siteLower.includes('a frame/')) {
    return 'ambiguous';
  }
  if (siteLower.includes(',') && /cabin|lodge|tiny|frye/i.test(siteLower)) {
    return 'ambiguous';
  }

  if (signalOnSite || signalOnName) return 'retype';
  return 'description_only';
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('Fetching Sage inventory...');
  const sage = await fetchAllSageRows();
  const sageUs = sage.filter((r) => isUsCountry(r.country as string | null));

  const inventory = sageUs.filter(
    (r) => String(r.unit_type ?? '') === 'A-Frame'
  );

  const propertyHasAFrame = new Set(
    inventory
      .map((r) => String(r.property_id ?? ''))
      .filter(Boolean)
  );

  const reclassRaw = sageUs.filter((r) => {
    if (String(r.unit_type ?? '') === 'A-Frame') return false;
    return (
      hasAFrameSignal(String(r.site_name ?? '')) ||
      hasAFrameSignal(String(r.property_name ?? '')) ||
      hasAFrameSignal(String(r.description ?? ''))
    );
  });

  const reclassQueue = reclassRaw.map((r) => {
    const signalField = hasAFrameSignal(String(r.site_name ?? ''))
      ? 'site_name'
      : hasAFrameSignal(String(r.property_name ?? ''))
        ? 'property_name'
        : 'description';
    const recommended_action = recommendAction(r, propertyHasAFrame);
    return {
      id: r.id,
      property_id: r.property_id,
      property_name: r.property_name,
      site_name: r.site_name,
      unit_type: r.unit_type,
      city: r.city,
      state: r.state,
      research_status: r.research_status,
      is_open: r.is_open,
      quantity_of_units: r.quantity_of_units,
      rate_avg_retail_daily_rate: r.rate_avg_retail_daily_rate,
      url: r.url,
      signal_field: signalField,
      recommended_action,
    };
  });

  console.log('Fetching Hipcamp A Frame listings...');
  const hipcamp = await fetchHipcampAFrames();

  const sageNameKeys = new Set(
    sageUs.map(
      (r) =>
        `${normalizeName(String(r.property_name ?? ''))}|${toStateCode(String(r.state ?? ''))}`
    )
  );

  const seenHipcamp = new Set<string>();
  const hipcampGap: Record<string, unknown>[] = [];
  for (const h of hipcamp) {
    const name = String(h.property_name ?? '').trim();
    const city = String(h.city ?? '').trim();
    const stateCode = toStateCode(String(h.state ?? ''));
    const key = `${normalizeName(name)}|${normalizeName(city)}|${stateCode}`;
    if (seenHipcamp.has(key)) continue;
    seenHipcamp.add(key);

    const sageKey = `${normalizeName(name)}|${stateCode}`;
    const match_status = sageNameKeys.has(sageKey)
      ? 'already_in_sage_name_state'
      : 'net_new_candidate';

    hipcampGap.push({
      property_name: name,
      city,
      state: stateCode || h.state,
      unit_type: h.unit_type,
      url: h.url,
      match_status,
    });
  }

  const inventoryPath = join(OUT_DIR, 'sage-a-frame-inventory.csv');
  const reclassPath = join(OUT_DIR, 'reclass-queue.csv');
  const gapPath = join(OUT_DIR, 'hipcamp-gap-queue.csv');

  writeFileSync(
    inventoryPath,
    toCsv(inventory, [
      'id',
      'property_id',
      'property_name',
      'site_name',
      'unit_type',
      'city',
      'state',
      'research_status',
      'is_open',
      'quantity_of_units',
      'rate_avg_retail_daily_rate',
      'url',
    ]),
    'utf-8'
  );

  writeFileSync(
    reclassPath,
    toCsv(reclassQueue, [
      'id',
      'property_id',
      'property_name',
      'site_name',
      'unit_type',
      'city',
      'state',
      'research_status',
      'is_open',
      'quantity_of_units',
      'rate_avg_retail_daily_rate',
      'url',
      'signal_field',
      'recommended_action',
    ]),
    'utf-8'
  );

  writeFileSync(
    gapPath,
    toCsv(hipcampGap, [
      'property_name',
      'city',
      'state',
      'unit_type',
      'url',
      'match_status',
    ]),
    'utf-8'
  );

  const retypeCount = reclassQueue.filter(
    (r) => r.recommended_action === 'retype'
  ).length;
  const skipDup = reclassQueue.filter(
    (r) => r.recommended_action === 'skip_already_has_aframe'
  ).length;
  const ambiguous = reclassQueue.filter(
    (r) => r.recommended_action === 'ambiguous'
  ).length;
  const descOnly = reclassQueue.filter(
    (r) => r.recommended_action === 'description_only'
  ).length;
  const netNew = hipcampGap.filter(
    (r) => r.match_status === 'net_new_candidate'
  ).length;
  const matched = hipcampGap.filter(
    (r) => r.match_status === 'already_in_sage_name_state'
  ).length;

  const reportPath = join(OUT_DIR, `PHASE0_BASELINE-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# A-Frame USA — Phase 0 baseline (${TODAY})`,
      '',
      `Audit of \`${TABLE}\` A-Frame inventory vs Hipcamp \`A Frame\` gap.`,
      '',
      'Re-run:',
      '',
      '```bash',
      'npx tsx scripts/analyze-a-frame-usa-inventory.ts',
      '```',
      '',
      '## Summary',
      '',
      '| Metric | Count |',
      '|--------|------:|',
      `| Sage USA \`A-Frame\` rows | ${inventory.length} |`,
      `| Reclass queue (any A-Frame signal, wrong unit_type) | ${reclassQueue.length} |`,
      `| Recommended retype | ${retypeCount} |`,
      `| Skip (property already has A-Frame) | ${skipDup} |`,
      `| Ambiguous (review) | ${ambiguous} |`,
      `| Description-only signal | ${descOnly} |`,
      `| Hipcamp USA distinct A Frame listings | ${hipcampGap.length} |`,
      `| Hipcamp already-in-Sage (name+state) | ${matched} |`,
      `| Hipcamp net-new candidates | ${netNew} |`,
      '',
      '## Current Sage A-Frame inventory',
      '',
      '| id | Property | Site | City, ST | ADR |',
      '|----|----------|------|----------|-----|',
      ...inventory.map(
        (r) =>
          `| ${r.id} | ${r.property_name} | ${r.site_name ?? ''} | ${r.city}, ${r.state} | ${r.rate_avg_retail_daily_rate ?? ''} |`
      ),
      '',
      '## Phase 1 retype targets (recommended_action=retype)',
      '',
      ...reclassQueue
        .filter((r) => r.recommended_action === 'retype')
        .map(
          (r) =>
            `- id ${r.id} **${r.property_name}** / ${r.site_name}: \`${r.unit_type}\` → \`A-Frame\` (${r.city}, ${r.state})`
        ),
      '',
      '## Ambiguous (do not auto-retype)',
      '',
      ...reclassQueue
        .filter((r) => r.recommended_action === 'ambiguous')
        .map(
          (r) =>
            `- id ${r.id} **${r.property_name}** / ${r.site_name}: \`${r.unit_type}\` — mixed or tent-shaped signal`
        ),
      '',
      '## Exports',
      '',
      '| File | Purpose |',
      '|------|---------|',
      '| `sage-a-frame-inventory.csv` | Current USA A-Frame rows |',
      '| `reclass-queue.csv` | Mislabeled / sibling candidates |',
      '| `hipcamp-gap-queue.csv` | Distinct Hipcamp A Frame listings + match status |',
      '',
      '## Phase 1 / 2 handoff',
      '',
      '1. **Phase 1:** Retype clear `site_name` A-Frame rows; skip properties that already have an `A-Frame` sibling.',
      '2. **Phase 2:** Research net-new USA A-Frames from Hipcamp gap + OpenAI discovery; write candidates to `openai-candidates.jsonl`.',
      '3. **Phase 3:** Curated insert into `all_sage_data` with `discovery_source=web_research_a_frame_us_2026_07_13`.',
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(`\nSage USA A-Frame rows: ${inventory.length}`);
  console.log(`Reclass queue: ${reclassQueue.length} (retype=${retypeCount})`);
  console.log(`Hipcamp distinct: ${hipcampGap.length} (net-new=${netNew})`);
  console.log(`Wrote ${inventoryPath}`);
  console.log(`Wrote ${reclassPath}`);
  console.log(`Wrote ${gapPath}`);
  console.log(`Wrote ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
