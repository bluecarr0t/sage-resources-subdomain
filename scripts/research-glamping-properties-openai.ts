#!/usr/bin/env npx tsx
/**
 * Research and add glamping properties in MD, AZ, ID, TN using OpenAI.
 *
 * Uses OpenAI to discover glamping properties in the target states, deduplicates
 * against existing records, and inserts new ones with research_status = 'New'
 * so they require manual review before publishing to the map.
 *
 * Usage:
 *   npx tsx scripts/research-glamping-properties-openai.ts
 *   npx tsx scripts/research-glamping-properties-openai.ts --dry-run
 *   npx tsx scripts/research-glamping-properties-openai.ts --limit 5
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
function slugifyPropertyName(name: string): string {
  const transliterated = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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
const TARGET_STATES = [
  { name: 'Maryland', code: 'MD' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Tennessee', code: 'TN' },
] as const;

const DELAY_MS = 1500;
const TODAY = new Date().toISOString().split('T')[0];

interface DiscoveredProperty {
  property_name: string;
  city?: string;
  state: string;
  address?: string;
  zip_code?: string;
  url?: string;
  phone_number?: string;
  description?: string;
  property_type?: string;
  unit_type?: string;
  lat?: number;
  lon?: number;
}

async function getExistingProperties(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('property_name, url')
    .in('state', TARGET_STATES.map((s) => s.code));

  if (error) {
    console.error('Error fetching existing properties:', error);
    return new Set();
  }

  const keys = new Set<string>();
  data?.forEach((row: { property_name?: string | null; url?: string | null }) => {
    const name = (row.property_name || '').trim().toLowerCase();
    const url = (row.url || '').trim().toLowerCase();
    if (name) keys.add(`name:${name}`);
    if (url) keys.add(`url:${url}`);
  });
  return keys;
}

function isDuplicate(p: DiscoveredProperty, existing: Set<string>): boolean {
  const nameKey = `name:${(p.property_name || '').trim().toLowerCase()}`;
  const urlKey = p.url ? `url:${p.url.trim().toLowerCase()}` : null;
  return existing.has(nameKey) || (urlKey !== null && existing.has(urlKey));
}

async function discoverPropertiesForState(
  stateName: string,
  stateCode: string,
  limit?: number
): Promise<DiscoveredProperty[]> {
  const limitClause = limit ? `Return up to ${limit} properties.` : 'Return 10-20 properties.';

  const prompt = `You are a researcher for a glamping and outdoor hospitality directory. List real glamping properties (safari tents, domes, treehouses, luxury cabins, yurts, etc.) located in ${stateName}, USA.

${limitClause}

Include only properties that:
- Offer glamping-style accommodations (not traditional RV parks or basic campgrounds)
- Are currently operating (not permanently closed)
- Have a physical location in ${stateName}

For each property provide: property_name (required), city (required), address, zip_code, url (official website), phone_number, description (2-4 sentences), property_type, unit_type, lat, lon if you know them.

Return a JSON object with a "properties" array. Be accurate - only include properties you are confident exist.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  let parsed: { properties?: DiscoveredProperty[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
    else return [];
  }

  const list = Array.isArray(parsed.properties) ? parsed.properties : [];
  return list
    .filter((p) => p && typeof p.property_name === 'string' && p.property_name.trim())
    .map((p) => ({
      ...p,
      state: stateCode,
      property_name: String(p.property_name).trim(),
    }));
}

function toDbRow(p: DiscoveredProperty): Record<string, unknown> {
  const slug = slugifyPropertyName(p.property_name);
  let url = (p.url || '').trim();
  if (url && !url.startsWith('http')) url = `https://${url}`;

  return {
    property_name: p.property_name,
    slug,
    property_type: p.property_type || 'Glamping',
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_closed: 'No',
    source: 'Sage',
    discovery_source: 'OpenAI Research',
    date_added: TODAY,
    date_updated: TODAY,
    address: p.address || null,
    city: p.city || null,
    state: p.state,
    zip_code: p.zip_code || null,
    country: 'USA',
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    url: url || null,
    phone_number: p.phone_number || null,
    description: p.description || null,
    unit_type: p.unit_type || null,
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : undefined;

  console.log('Fetching existing properties for deduplication...');
  const existing = await getExistingProperties();
  console.log(`Found ${existing.size} existing name/url keys to avoid duplicates.\n`);

  const allNew: DiscoveredProperty[] = [];

  for (const { name, code } of TARGET_STATES) {
    console.log(`Researching glamping properties in ${name} (${code})...`);
    await new Promise((r) => setTimeout(r, DELAY_MS));

    const discovered = await discoverPropertiesForState(name, code, limit);
    const filtered = discovered.filter((p) => !isDuplicate(p, existing));

    console.log(`  Found ${discovered.length} properties, ${filtered.length} new after dedup.`);

    for (const p of filtered) {
      allNew.push(p);
      existing.add(`name:${p.property_name.toLowerCase()}`);
      if (p.url) existing.add(`url:${p.url.toLowerCase()}`);
    }
  }

  console.log(`\nTotal new properties to add: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would insert:');
    allNew.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.property_name} (${p.city}, ${p.state}) - ${p.url || 'no url'}`);
    });
    return;
  }

  const rows = allNew.map(toDbRow);
  const BATCH_SIZE = 20;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from(TABLE).insert(batch).select('id, property_name, state');

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? 0} rows`);
  }

  console.log(`\nDone. Added ${allNew.length} new glamping properties with research_status='new'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
