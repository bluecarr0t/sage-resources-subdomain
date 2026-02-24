#!/usr/bin/env npx tsx
/**
 * Classify the 225 new records using OpenAI to identify RV Parks and Hotels/Inns.
 * Removes records that are NOT glamping resorts (standalone units with beds and linens).
 *
 * Classification:
 * - RV Park: Mostly RV sites where guests bring their own RVs
 * - Hotel/Inn: Mostly shared rooms, traditional hotel rooms, B&B style
 * - Glamping Resort: Standalone units (tents, cabins, treehouses, etc.) with beds and linens
 *
 * Usage:
 *   npx tsx scripts/classify-and-remove-non-glamping-openai.ts
 *   npx tsx scripts/classify-and-remove-non-glamping-openai.ts --dry-run
 *   npx tsx scripts/classify-and-remove-non-glamping-openai.ts --limit 10
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
const DELAY_MS = 1500;
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

type Classification = 'glamping_resort' | 'rv_park' | 'hotel_inn' | 'unsure';

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
  description: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
    p.description ? `Description: ${p.description}` : null,
  ];
  return parts.filter(Boolean).join('\n');
}

async function classifyProperty(property: PropertyRow, attempt = 0): Promise<Classification> {
  const context = buildContext(property);

  const prompt = `You are classifying properties for a glamping directory. We want ONLY glamping resorts: standalone accommodation units (tents, cabins, treehouses, yurts, domes, Airstreams, etc.) that have beds and linens - where guests stay in their own private unit.

Classify this property into ONE category:

1. **rv_park** - Mostly RV sites where guests bring their own RVs/campers. May have a few cabins or glamping units, but the primary offering is RV hookups and pull-through sites. Exclude from glamping directory.

2. **hotel_inn** - Traditional hotel, inn, or B&B with mostly shared/standard rooms. Not standalone glamping units. May have shared bathrooms, hotel-style rooms. Exclude from glamping directory.

3. **glamping_resort** - Standalone units (safari tents, cabins, treehouses, yurts, domes, Airstreams, hobbit homes) with beds and linens. Each guest gets their own private accommodation. This is what we want.

4. **unsure** - Cannot confidently classify; default to keeping (do not remove).

Return a JSON object with exactly: {"classification": "glamping_resort" | "rv_park" | "hotel_inn" | "unsure", "reason": "brief reason"}

${context}

Return ONLY valid JSON. No markdown or extra text.`;

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return 'unsure';

  let parsed: { classification?: string; reason?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return 'unsure';
  }

  const c = (parsed.classification || '').toLowerCase().trim();
  if (['rv_park', 'hotel_inn', 'glamping_resort', 'unsure'].includes(c)) {
    return c as Classification;
  }
  if (c.includes('rv') || c.includes('rv_park')) return 'rv_park';
  if (c.includes('hotel') || c.includes('inn')) return 'hotel_inn';
  return 'unsure';
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
    .select('id, property_name, site_name, url, address, city, state, country, unit_type, property_type, description')
    .eq('research_status', 'new')
    .in('discovery_source', OUR_DISCOVERY_SOURCES)
    .order('id', { ascending: true })
    .limit(limit ?? 500);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log('No matching properties found.');
    return;
  }

  console.log(`Classifying ${rows.length} properties. Dry-run: ${dryRun}\n`);
  console.log('Will REMOVE: rv_park, hotel_inn');
  console.log('Will KEEP: glamping_resort, unsure\n');

  const toRemove: { id: number; name: string; classification: Classification }[] = [];
  const toKeep: { id: number; name: string; classification: Classification }[] = [];
  let errCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i] as PropertyRow;
    process.stdout.write(`[${i + 1}/${rows.length}] ${p.property_name ?? p.id} ... `);

    try {
      let classification: Classification = 'unsure';
      for (let tryCount = 0; tryCount <= MAX_RETRIES; tryCount++) {
        try {
          classification = await classifyProperty(p);
          break;
        } catch (e) {
          if (tryCount === MAX_RETRIES) throw e;
          await sleep(DELAY_MS * 2);
        }
      }

      if (classification === 'rv_park' || classification === 'hotel_inn') {
        toRemove.push({ id: p.id, name: p.property_name ?? String(p.id), classification });
        console.log(`REMOVE (${classification})`);
      } else {
        toKeep.push({ id: p.id, name: p.property_name ?? String(p.id), classification });
        console.log(`keep (${classification})`);
      }
    } catch (e) {
      console.log('error:', e instanceof Error ? e.message : e);
      errCount++;
      toKeep.push({ id: p.id, name: p.property_name ?? String(p.id), classification: 'unsure' });
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`To remove: ${toRemove.length} (${toRemove.filter((r) => r.classification === 'rv_park').length} RV parks, ${toRemove.filter((r) => r.classification === 'hotel_inn').length} hotels/inns)`);
  console.log(`To keep: ${toKeep.length}`);
  console.log(`Errors: ${errCount}`);

  if (toRemove.length === 0) {
    console.log('\nNo records to remove.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would remove:');
    toRemove.forEach((r) => console.log(`  - ${r.name} (${r.classification})`));
    return;
  }

  console.log('\nRemoving non-glamping records...');
  let deleted = 0;
  for (const r of toRemove) {
    const { error: delErr } = await supabase.from(TABLE).delete().eq('id', r.id);
    if (delErr) {
      console.error(`  Failed to delete ${r.name}: ${delErr.message}`);
    } else {
      deleted++;
      console.log(`  Deleted: ${r.name} (${r.classification})`);
    }
  }

  console.log(`\nDone. Removed ${deleted} non-glamping records.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
