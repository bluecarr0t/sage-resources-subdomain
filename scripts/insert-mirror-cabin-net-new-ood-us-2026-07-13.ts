#!/usr/bin/env npx tsx
/**
 * Phase 2 — Net-new USA Mirror Cabin properties from ÖÖD hospitality research.
 *
 * Scope: high-priority unmatched ÖÖD deals + verified Stay ÖÖD / partner resorts
 * missing from all_sage_data. Private residential installs rejected.
 *
 * Usage:
 *   npx tsx scripts/insert-mirror-cabin-net-new-ood-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-mirror-cabin-net-new-ood-us-2026-07-13.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'ood_mirror_cabin_net_new_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-mirror-cabin-review');

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

type InsertSpec = {
  property_name: string;
  site_name: string;
  city: string;
  state: string;
  url: string;
  unit_type: string;
  quantity_of_units: number;
  property_total_sites?: number | null;
  address?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  lat?: number | null;
  lon?: number | null;
  description: string;
  notes: string;
  /** When set, reuse existing property_id (sibling insert). */
  existing_property_id?: string;
};

function assertRequired(spec: InsertSpec): InsertSpec {
  const url = spec.url.trim();
  const city = spec.city.trim();
  const state = spec.state.trim().toUpperCase();
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(`${spec.property_name}: url required (http/https)`);
  }
  if (!city) throw new Error(`${spec.property_name}: city required`);
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error(`${spec.property_name}: 2-letter US state required (got ${spec.state})`);
  }
  return { ...spec, url, city, state };
}

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  const gated = assertRequired(spec);
  return {
    property_name: gated.property_name,
    site_name: gated.site_name,
    slug: slugify(gated.property_name),
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
    address: gated.address ?? null,
    city: gated.city,
    state: gated.state,
    zip_code: gated.zip_code ?? null,
    lat: gated.lat ?? null,
    lon: gated.lon ?? null,
    url: gated.url,
    phone_number: gated.phone_number ?? null,
    description: gated.description,
    unit_type: normalizeGlampingUnitTypeForStorage(gated.unit_type),
    quantity_of_units: String(gated.quantity_of_units),
    property_total_sites:
      gated.property_total_sites != null ? String(gated.property_total_sites) : null,
    notes: gated.notes,
  };
}

/** Verified hospitality Mirror Cabin properties / siblings (2026-07-13). */
const PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Cameron Ranch Glamping - Coldspring',
    site_name: "ÖÖD Nature's Reflection",
    city: 'Coldspring',
    state: 'TX',
    zip_code: '77331',
    address: '360 England Ln',
    url: 'https://cameronranchglamping.com/listing/ood-texas-mirror-house-houston/',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 1,
    property_total_sites: 3,
    description:
      'Cameron Ranch Glamping Coldspring (near Houston) offers an ÖÖD Mirror House (Nature’s Reflection) with outdoor bath and sauna, plus geodesic dome and cabin inventory on England Lane. Distinct from the Cameron Ranch Lake Bastrop / Austin ÖÖD houses already in Sage.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new (doc high-priority Coldspring). Confirm exact unit count and lat/lon before publishing.',
  },
  {
    property_name: 'All Is Well Resort',
    site_name: 'ÖÖD Extended House',
    city: 'St Jo',
    state: 'TX',
    zip_code: '76265',
    address: '9214 Farm To Market Rd 677 N',
    url: 'http://alliswellstjo.com/',
    phone_number: '+1 972-672-7974',
    lat: 33.8194695,
    lon: -97.496326,
    unit_type: 'Mirror Cabin',
    quantity_of_units: 3,
    property_total_sites: 9,
    existing_property_id: '4c497e74-3355-4830-8d6e-ed2a777c9ca9',
    description:
      'All Is Well Resort near Saint Jo, TX added three ÖÖD Extended Mirror Houses (opened Dec 2025) alongside existing yurts, domes, and bubble huts. Each mirrored unit includes private hot tub, deck, and kitchen; ~90 minutes from DFW.',
    notes:
      '[2026-07-13] Phase 2 sibling for existing All Is Well property_id. ÖÖD House news Dec 2025.',
  },
  {
    property_name: 'The Retreat at Fredericksburg',
    site_name: 'ÖÖD Mirror House',
    city: 'Fredericksburg',
    state: 'TX',
    zip_code: '78624',
    address: '259 Constellation Dr',
    url: 'https://theretreatatfredericksburg.com/',
    phone_number: '(830) 992-0494',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 4,
    property_total_sites: 4,
    description:
      'The Retreat at Fredericksburg (Texas Wine Country) opened four ÖÖD Mirror Houses (Andromeda, Ursa Major, Ursa Minor, Perseus) on 33 acres with vineyard views, ~5 minutes from Main Street. Units feature private decks; several include hot tubs and one offers a private sauna.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new. Distinct from Haven Yurts / Onera / AutoCamp Hill Country in Fredericksburg. Confirm lat/lon and dome inventory before publishing.',
  },
  {
    property_name: 'FarAway Pond',
    site_name: 'ÖÖD Mirror House',
    city: 'Dalton',
    state: 'NH',
    zip_code: '03598',
    address: '43 Ridge Road',
    url: 'https://www.farawaypond.com/',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 2,
    property_total_sites: 5,
    description:
      'FarAway Pond is a White Mountains waterfront retreat in Dalton, NH with ÖÖD Mirror Houses (Balsam Fir and Birch) plus private cottages on a spring-fed pond. Amenities include private hot tubs, trails, and kayaks; dog-friendly.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new. Distinct from Under Canvas White Mountains (also Dalton NH). Confirm phone and exact qty before publishing.',
  },
  {
    property_name: 'Oakey Mountain Mirror Häus',
    site_name: 'ÖÖD Mirror House',
    city: 'Clarkesville',
    state: 'GA',
    zip_code: '30523',
    address: '3 Oakey Mountain Road',
    url: 'https://oodhotels.com/accommodation/oakey-mountain-mirror-h%C3%A4us',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Oakey Mountain Mirror Häus is a Stay ÖÖD mirrored cabin near Clarkesville, GA (North Georgia mountains), marketed near Tallulah Gorge, Helen, and Lake Burton. Private outdoor bath and shared sauna; pets allowed.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new (matched deal address 3 Oakey Mountain Road). Confirm booking URL/brand site and lat/lon before publishing.',
  },
  {
    property_name: 'Paradise Ranch Inn',
    site_name: 'ÖÖD Mirror House',
    city: 'Three Rivers',
    state: 'CA',
    zip_code: '93271',
    address: '49741 South Fork Drive',
    url: 'http://paradiseranch.me/',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 4,
    property_total_sites: 4,
    description:
      'Paradise Ranch Inn is an off-grid luxury eco micro-retreat on ~50 acres of riverfront in Three Rivers, CA at the gateway to Sequoia National Park. Four ÖÖD Mirror Houses (including Stellar / Awake / Infinite / Limitless) with hot tubs and sauna access.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new. Distinct from AutoCamp Sequoia in Three Rivers. Confirm unit names/qty and lat/lon before publishing.',
  },
  {
    property_name: "Tu Tu' Tun Lodge",
    site_name: 'ÖÖD Glass Cabin',
    city: 'Gold Beach',
    state: 'OR',
    zip_code: '97444',
    address: '96550 North Bank Rogue River Road',
    url: 'https://tututun.com/',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 12,
    property_total_sites: 30,
    description:
      "Tu Tu' Tun Lodge is an adults-only Rogue River retreat near Gold Beach, OR with twelve ÖÖD mirrored glass cabins (creek/river views) plus lodge rooms, houses, restaurant, pool, and wood-fired sauna. Widely covered by Dezeen, NYT, and Travel + Leisure.",
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new (verified hospitality; not in deal CSV high list). Confirm exact cabin count vs lodge rooms and lat/lon before publishing.',
  },
  {
    property_name: 'SkyEagle Ridge',
    site_name: 'ÖÖD Mirror House',
    city: 'Conway',
    state: 'AR',
    url: 'https://skyeagleridge.com/en/ood-mirror-house-at-skyeagle-ridge',
    unit_type: 'Mirror Cabin',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'SkyEagle Ridge hosts Arkansas’s first ÖÖD Mirror House near Conway, with panoramic views toward Pinnacle Mountain, private hot tub, sauna, and cold plunge. Bookable via Stay ÖÖD / property site.',
    notes:
      '[2026-07-13] Phase 2 ÖÖD net-new. Confirm street address and lat/lon before publishing.',
  },
];

const REJECTED_HIGH_PRIORITY = [
  {
    location: '372 River Rd, Lake Placid, NY',
    reason: 'Private Adirondack log home rental (River Road Loj) — not glamping hospitality.',
  },
  {
    location: '1160 Lakeside Dr, Wimberley, TX',
    reason: 'No confirmed bookable hospitality/ÖÖD resort at address; treat as private.',
  },
  {
    location: '76 Sugarbush Village Drive, Warren, VT',
    reason: 'No confirmed public Mirror Cabin hospitality brand at address.',
  },
  {
    location: '353 Forestdale Farm Lane, Stowe, VT',
    reason: 'No confirmed public Mirror Cabin hospitality brand at address.',
  },
  {
    location: '7411 County Road 204, Plantersville, TX (AutoCamp deal label)',
    reason: 'AutoCamp Hill Country already in Sage (Fredericksburg); Plantersville address not a verified open AutoCamp/ÖÖD site.',
  },
];

async function nameCityStateExists(
  name: string,
  city: string,
  state: string
): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .eq('city', city)
    .eq('state', state)
    .limit(1);
  return Boolean(data?.length);
}

async function propertyIdHasMirrorCabin(propertyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, unit_type, site_name')
    .eq('property_id', propertyId);
  if (error) throw new Error(error.message);
  return (data ?? []).some((r) => {
    const u = String(r.unit_type ?? '').toLowerCase();
    return u.includes('mirror cabin');
  });
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  let inserted = 0;
  let skipped = 0;
  const applied: string[] = [];

  for (const spec of PROPERTIES) {
    const gated = assertRequired(spec);

    if (gated.existing_property_id) {
      if (await propertyIdHasMirrorCabin(gated.existing_property_id)) {
        console.log(`SKIP sibling ${gated.property_name} — Mirror Cabin already present`);
        skipped += 1;
        continue;
      }
      const row = baseRow(gated, gated.existing_property_id);
      console.log(
        `INSERT sibling ${gated.property_name} / ${gated.site_name} (qty=${gated.quantity_of_units})`
      );
      if (DRY_RUN) console.log(JSON.stringify(row, null, 2));
      else {
        const { error } = await supabase.from(TABLE).insert(row);
        if (error) throw new Error(`Insert sibling ${gated.property_name}: ${error.message}`);
      }
      inserted += 1;
      applied.push(`sibling:${gated.property_name}`);
      continue;
    }

    if (await nameCityStateExists(gated.property_name, gated.city, gated.state)) {
      console.log(
        `SKIP ${gated.property_name} (${gated.city}, ${gated.state}) — already exists`
      );
      skipped += 1;
      continue;
    }

    const propertyId = randomUUID();
    const row = baseRow(gated, propertyId);
    console.log(
      `INSERT ${gated.property_name} (${gated.city}, ${gated.state}) / ${gated.site_name} qty=${gated.quantity_of_units}`
    );
    if (DRY_RUN) console.log(JSON.stringify(row, null, 2));
    else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert ${gated.property_name}: ${error.message}`);
    }
    inserted += 1;
    applied.push(`new:${gated.property_name}`);
  }

  console.log('\nRejected high-priority deal addresses (private / unverified):');
  for (const r of REJECTED_HIGH_PRIORITY) {
    console.log(`  ${r.location}: ${r.reason}`);
  }

  const reportPath = join(OUT_DIR, `PHASE2_REPORT-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Phase 2 Mirror Cabin net-new report (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      `Discovery source: \`${DISCOVERY_SOURCE}\``,
      '',
      `Inserted: **${inserted}** | Skipped: **${skipped}**`,
      '',
      '## Applied',
      ...applied.map((a) => `- ${a}`),
      '',
      '## Specs',
      ...PROPERTIES.map(
        (p) =>
          `- **${p.property_name}** (${p.city}, ${p.state}) — ${p.quantity_of_units} × Mirror Cabin${p.existing_property_id ? ' [sibling]' : ''}`
      ),
      '',
      '## Rejected deal addresses',
      ...REJECTED_HIGH_PRIORITY.map((r) => `- ${r.location}: ${r.reason}`),
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: ${inserted} row(s) ${DRY_RUN ? 'would be' : 'were'} inserted; ${skipped} skipped.`
  );
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
