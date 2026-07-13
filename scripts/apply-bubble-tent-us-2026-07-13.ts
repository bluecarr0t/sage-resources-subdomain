#!/usr/bin/env npx tsx
/**
 * USA Bubble Tent inventory expansion from web research (2026-07-13).
 *
 * - Reclassify River Rock Point Bubbles Dome → Bubble Tent
 * - Set Basecamp Terlingua Bubble Tent quantity
 * - Insert Bubble Terlingua + Oceanview Mountaintop Bubble Dome
 *
 * Usage:
 *   npx tsx scripts/apply-bubble-tent-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-bubble-tent-us-2026-07-13.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'web_research_bubble_tent_us_2026_07_13';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const CANONICAL = normalizeGlampingUnitTypeForStorage('Bubble Tent') ?? 'Bubble Tent';
const NOTE_PREFIX = `[${TODAY}] Bubble Tent US research`;

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

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 48))) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

type UpdateSpec = {
  id: number;
  patch: Record<string, unknown>;
  note: string;
};

/** Existing rows: reclassify / fill quantity from operator sites. */
const UPDATES: UpdateSpec[] = [
  {
    id: 10341,
    patch: {
      unit_type: CANONICAL,
      site_name: 'Bubble Suites',
      quantity_of_units: '3',
      property_total_sites: '5',
    },
    note: `${NOTE_PREFIX}: River Rock Point Ruby/Sapphire/Emerald suite bubbles (private bath). Reclass Dome→Bubble Tent; qty=3. Source: riverrockpoint.com.`,
  },
  {
    id: 10340,
    patch: {
      unit_type: CANONICAL,
      site_name: 'Summer Bubbles',
      quantity_of_units: '2',
      property_total_sites: '5',
    },
    note: `${NOTE_PREFIX}: River Rock Point Amethyst/Moonstone family bubbles (outdoor bath). Reclass Dome→Bubble Tent; qty=2. Source: riverrockpoint.com.`,
  },
  {
    id: 9534,
    patch: {
      quantity_of_units: '5',
      property_total_sites: '5',
      url: 'https://basecampterlingua.com/bubbles/',
    },
    note: `${NOTE_PREFIX}: Basecamp Terlingua named Bubble inventory = 5 (Bubbles 1 & 2, Bubble X, X4, X5). Source: basecampterlingua.com/bubbles.`,
  },
];

type InsertSpec = {
  property_name: string;
  site_name: string;
  city: string;
  state: string;
  url: string;
  quantity_of_units: number;
  property_total_sites: number;
  address?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  lat?: number | null;
  lon?: number | null;
  rate_avg_retail_daily_rate?: number | null;
  description: string;
  notes: string;
};

const INSERTS: InsertSpec[] = [
  {
    property_name: 'Bubble Terlingua',
    site_name: 'Two Room Bubble',
    city: 'Study Butte',
    state: 'TX',
    zip_code: '79852',
    address: '411 Fulcher Rd',
    lat: 29.3255,
    lon: -103.5342,
    url: 'https://basecampterlingua.com/bubble-terlingua/',
    quantity_of_units: 3,
    property_total_sites: 3,
    rate_avg_retail_daily_rate: 250,
    description:
      'Inflatable two-room Bubble Tent glamping near Big Bend National Park (Study Butte / Terlingua, TX). Sister brand to Basecamp Terlingua. Each bubble has queen bed + sofa sleeper, private bath/shower, minisplit A/C-heat, Wi‑Fi, BBQ, fire pit; private hot tubs on bubble units and shared guest pool. Book via Bubble Terlingua / basecampterlingua.com.',
    notes: `${NOTE_PREFIX}: Dedicated operator page lists Three Two Room Bubbles (+ two casitas not counted here). Address 411 Fulcher Rd near Hwy 118. Conservatively qty=3 (older FAQ copy cited higher historical counts).`,
  },
  {
    property_name: 'Oceanview Mountaintop Bubble Dome',
    site_name: 'Bubble Dome',
    city: 'Rancho Palos Verdes',
    state: 'CA',
    zip_code: '90275',
    url: 'https://www.hipcamp.com/en-US/land/california-oceanview-mountaintop-bubble-dome-dw9h9m88',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Private bluff-top Bubble Tent / bubble dome lodging in Rancho Palos Verdes, CA with Pacific Ocean views. Furnished queen setup, ambient lighting, hotel amenities; shared indoor bathroom/shower on property plus ocean-facing swing, lounge, and outdoor projector. Listed on Hipcamp (host Arianne; joined Apr 2025). Exact address provided after booking.',
    notes: `${NOTE_PREFIX}: Verified Hipcamp lodging site “Oceanview Mountaintop Bubble Dome” (sleeps 4). Distinct from optional campsite bubble setup. Confirm rates/coordinates before publishing.`,
  },
];

async function applyUpdates(): Promise<number> {
  let n = 0;
  for (const u of UPDATES) {
    const { data: row, error: fetchErr } = await supabase
      .from(TABLE)
      .select('id,property_name,site_name,unit_type,quantity_of_units,notes')
      .eq('id', u.id)
      .maybeSingle();
    if (fetchErr) throw new Error(`fetch id=${u.id}: ${fetchErr.message}`);
    if (!row) throw new Error(`Missing id=${u.id}`);

    console.log(
      `${DRY_RUN ? 'DRY ' : ''}UPDATE id=${u.id} ${row.property_name} | ${row.site_name} | ${row.unit_type} qty=${row.quantity_of_units} → ${JSON.stringify(u.patch)}`
    );
    if (DRY_RUN) {
      n += 1;
      continue;
    }

    const { error } = await supabase
      .from(TABLE)
      .update({
        ...u.patch,
        notes: appendNote(row.notes as string | null, u.note),
        discovery_source: DISCOVERY_SOURCE,
        date_updated: TODAY,
      })
      .eq('id', u.id);
    if (error) throw new Error(`update id=${u.id}: ${error.message}`);
    n += 1;
  }
  return n;
}

async function propertyExists(name: string, city: string, state: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .eq('city', city)
    .eq('state', state)
    .limit(1);
  return Boolean(data?.length);
}

async function applyInserts(): Promise<number> {
  let n = 0;
  for (const spec of INSERTS) {
    if (await propertyExists(spec.property_name, spec.city, spec.state)) {
      console.log(
        `SKIP insert ${spec.property_name} (${spec.city}, ${spec.state}) — already exists`
      );
      continue;
    }
    const propertyId = randomUUID();
    const row = {
      property_name: spec.property_name,
      site_name: spec.site_name,
      slug: slugify(spec.property_name),
      property_id: propertyId,
      property_type: 'Glamping',
      research_status: 'in_progress',
      is_glamping_property: 'Yes',
      is_open: 'Yes',
      source: 'Sage',
      discovery_source: DISCOVERY_SOURCE,
      date_added: TODAY,
      date_updated: TODAY,
      country: 'United States',
      land_operator_category: 'private_commercial',
      address: spec.address ?? null,
      city: spec.city,
      state: spec.state,
      zip_code: spec.zip_code ?? null,
      lat: spec.lat ?? null,
      lon: spec.lon ?? null,
      url: spec.url,
      phone_number: spec.phone_number ?? null,
      description: spec.description,
      unit_type: CANONICAL,
      quantity_of_units: String(spec.quantity_of_units),
      property_total_sites: String(spec.property_total_sites),
      rate_avg_retail_daily_rate: spec.rate_avg_retail_daily_rate ?? null,
      notes: spec.notes,
    };
    console.log(
      `${DRY_RUN ? 'DRY ' : ''}INSERT ${spec.property_name} (${spec.city}, ${spec.state}) qty=${spec.quantity_of_units}`
    );
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
      n += 1;
      continue;
    }
    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(`insert ${spec.property_name}: ${error.message}`);
    n += 1;
  }
  return n;
}

async function main(): Promise<void> {
  console.log(`\n=== Bubble Tent US research (${TODAY})${DRY_RUN ? ' DRY RUN' : ''} ===\n`);
  const updated = await applyUpdates();
  const inserted = await applyInserts();
  console.log(`\nDone. updates=${updated}, inserts=${inserted}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
