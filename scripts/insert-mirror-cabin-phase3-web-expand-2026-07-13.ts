#!/usr/bin/env npx tsx
/**
 * Phase 3 — Curated USA Mirror Cabin inserts from web discovery + alias policy.
 *
 * Discovery (Tavily/Firecrawl) mostly resurfaced Phase 1–2 inventory. Manual
 * verification added:
 *   A) Glamp Michigan sibling (ÖÖD Lumi + Sol) — property already in Sage as Dome
 *   B) Oak Ranch Resort net-new (Graham, TX) — Reflections + Whispering Oaks
 *
 * Not retyped: The Glamping Collective "Glass Cabin" rows remain Cabin (view-glass
 * wall product, not mirrored cladding). Alias map still maps free-text
 * "glass cabin" → Mirror Cabin for ÖÖD-style labels.
 *
 * Usage:
 *   npx tsx scripts/insert-mirror-cabin-phase3-web-expand-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-mirror-cabin-phase3-web-expand-2026-07-13.ts
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
const DISCOVERY_SOURCE = 'ood_mirror_cabin_web_expand_2026_07_13';
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

type AnchorRow = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  slug: string | null;
  property_type: string | null;
  research_status: string | null;
  is_glamping_property: string | null;
  is_open: string | null;
  source: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  lat: number | string | null;
  lon: number | string | null;
  url: string | null;
  phone_number: string | null;
  description: string | null;
  property_total_sites: string | null;
  land_operator_category: string | null;
  glamping_service_tier: string | null;
};

async function fetchRow(id: number): Promise<AnchorRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      'id, property_id, property_name, slug, property_type, research_status, is_glamping_property, is_open, source, address, city, state, zip_code, country, lat, lon, url, phone_number, description, property_total_sites, land_operator_category, glamping_service_tier'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Fetch id ${id}: ${error.message}`);
  return (data as AnchorRow | null) ?? null;
}

async function propertyHasMirrorCabin(propertyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, unit_type, site_name')
    .eq('property_id', propertyId);
  if (error) throw new Error(`Mirror check ${propertyId}: ${error.message}`);
  return (data ?? []).some((r) => {
    const u = String(r.unit_type ?? '').toLowerCase();
    const s = String(r.site_name ?? '').toLowerCase();
    return (
      u.includes('mirror cabin') ||
      s.includes('mirror cabin') ||
      s.includes('mirror house') ||
      s.includes('ööd') ||
      s.includes('ood ')
    );
  });
}

async function nameExists(propertyName: string, state: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, property_name, state')
    .ilike('property_name', `%${propertyName}%`)
    .eq('state', state)
    .limit(5);
  if (error) throw new Error(`Name check ${propertyName}: ${error.message}`);
  return (data ?? []).length > 0;
}

const GLAMP_MICHIGAN = {
  anchor_id: 9628,
  property_id: '79707212-25c5-4dfe-8d31-56e72be7b0aa',
  site_name: 'ÖÖD Mirror House',
  quantity_of_units: 2,
  evidence:
    'glampmichigan.co/mirrorhouses — Michigan’s first two ÖÖD units (Lumi + Sol) with mirrored glass on three sides; private hot tub/sauna/plunge.',
};

const OAK_RANCH = {
  property_name: 'Oak Ranch Resort',
  site_name: 'Mirror House',
  city: 'Graham',
  state: 'TX',
  zip_code: '76450',
  address: '303 Young Ln',
  url: 'https://oakranchresort.com/mirror-houses/',
  quantity_of_units: 2,
  property_total_sites: null as number | null,
  description:
    'Oak Ranch Resort is a 57-acre ranch retreat near Graham, TX (north of Possum Kingdom Lake) offering two mirrored cabins (Reflections and Whispering Oaks Mirror Houses, ~238 sq ft) with private hot tubs and fire pits, plus casitas and La Casa Tierra.',
  notes:
    '[2026-07-13] Phase 3 web-expand net-new. Confirm ÖÖD vs other mirror manufacturer and lat/lon before publishing.',
  evidence:
    'oakranchresort.com/mirror-houses — Reflections + Whispering Oaks Mirror Houses now booking; Scandinavian mirrored design.',
};

const REJECTED = [
  {
    name: 'The Glamping Collective Glass Cabin / Luxe Glass Cabin (ids 10490, 10491, 11600)',
    reason:
      'View-glass wall cabins (8×16 / 16-ft glass wall), not mirrored cladding / ÖÖD. Keep unit_type Cabin.',
  },
  {
    name: 'Space Cowboys Mirrored Space Pod',
    reason: 'Mirrored dome/pod product — leave unit_type Dome.',
  },
  {
    name: 'Terranova Nirvana Mirror glamping dome',
    reason: 'Mirrored dome SKUs — leave unit_type Dome.',
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- Phase 3 Mirror Cabin web expand (${TODAY})`,
    `-- discovery_source: ${DISCOVERY_SOURCE}`,
    '',
  ];
  let inserted = 0;
  let skipped = 0;

  console.log('A) Glamp Michigan sibling');
  console.log('-'.repeat(60));
  if (await propertyHasMirrorCabin(GLAMP_MICHIGAN.property_id)) {
    console.log('SKIP Glamp Michigan — already has mirror/ÖÖD signal');
    skipped += 1;
  } else {
    const anchor = await fetchRow(GLAMP_MICHIGAN.anchor_id);
    if (!anchor) {
      console.log(`SKIP Glamp Michigan — anchor ${GLAMP_MICHIGAN.anchor_id} missing`);
      skipped += 1;
    } else {
      const row = {
        property_name: anchor.property_name,
        site_name: GLAMP_MICHIGAN.site_name,
        slug: anchor.slug,
        property_id: GLAMP_MICHIGAN.property_id,
        property_type: anchor.property_type ?? 'Glamping',
        research_status: 'in_progress',
        is_glamping_property: anchor.is_glamping_property ?? 'Yes',
        is_open: anchor.is_open ?? 'Yes',
        source: anchor.source ?? 'Sage',
        discovery_source: DISCOVERY_SOURCE,
        date_added: TODAY,
        date_updated: TODAY,
        country: anchor.country ?? 'United States',
        land_operator_category: anchor.land_operator_category ?? 'private_commercial',
        address: anchor.address,
        city: anchor.city,
        state: anchor.state,
        zip_code: anchor.zip_code,
        lat: anchor.lat != null ? Number(anchor.lat) : null,
        lon: anchor.lon != null ? Number(anchor.lon) : null,
        url: 'https://glampmichigan.co/mirrorhouses',
        phone_number: anchor.phone_number,
        description:
          anchor.description ??
          'Glamp Michigan (The Domes) in Benzonia, MI now offers two ÖÖD Mirror Houses (Lumi and Sol) alongside geodesic domes — Michigan’s first mirrored ÖÖD stays.',
        unit_type: normalizeGlampingUnitTypeForStorage('Mirror Cabin'),
        quantity_of_units: String(GLAMP_MICHIGAN.quantity_of_units),
        property_total_sites: anchor.property_total_sites,
        glamping_service_tier: anchor.glamping_service_tier,
        notes: `[${TODAY}] Phase 3 sibling. ${GLAMP_MICHIGAN.evidence}`,
      };
      console.log(
        `INSERT sibling Glamp Michigan / ${GLAMP_MICHIGAN.site_name} qty=${GLAMP_MICHIGAN.quantity_of_units}`
      );
      console.log(`  evidence: ${GLAMP_MICHIGAN.evidence}`);
      sqlLines.push(
        `-- INSERT Glamp Michigan sibling (anchor ${GLAMP_MICHIGAN.anchor_id}); applied via script`
      );
      if (DRY_RUN) {
        console.log(JSON.stringify(row, null, 2));
      } else {
        const { error } = await supabase.from(TABLE).insert(row);
        if (error) throw new Error(`Insert Glamp Michigan: ${error.message}`);
      }
      inserted += 1;
    }
  }

  console.log('\nB) Oak Ranch Resort net-new');
  console.log('-'.repeat(60));
  if (await nameExists('Oak Ranch Resort', 'TX')) {
    console.log('SKIP Oak Ranch Resort — name already in Sage (TX)');
    skipped += 1;
  } else {
    const propertyId = randomUUID();
    const row = {
      property_name: OAK_RANCH.property_name,
      site_name: OAK_RANCH.site_name,
      slug: slugify(OAK_RANCH.property_name),
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
      address: OAK_RANCH.address,
      city: OAK_RANCH.city,
      state: OAK_RANCH.state,
      zip_code: OAK_RANCH.zip_code,
      lat: null,
      lon: null,
      url: OAK_RANCH.url,
      phone_number: null,
      description: OAK_RANCH.description,
      unit_type: normalizeGlampingUnitTypeForStorage('Mirror Cabin'),
      quantity_of_units: String(OAK_RANCH.quantity_of_units),
      property_total_sites:
        OAK_RANCH.property_total_sites != null
          ? String(OAK_RANCH.property_total_sites)
          : null,
      notes: OAK_RANCH.notes,
    };
    console.log(
      `INSERT net-new ${OAK_RANCH.property_name} / ${OAK_RANCH.site_name} qty=${OAK_RANCH.quantity_of_units}`
    );
    console.log(`  evidence: ${OAK_RANCH.evidence}`);
    sqlLines.push(`-- INSERT Oak Ranch Resort (property_id ${propertyId}); applied via script`);
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert Oak Ranch: ${error.message}`);
    }
    inserted += 1;
  }

  console.log('\nC) Rejected / not retyped');
  console.log('-'.repeat(60));
  for (const r of REJECTED) {
    console.log(`  ${r.name}: ${r.reason}`);
  }

  const sqlPath = join(OUT_DIR, `phase3-mirror-cabin-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');

  const reportPath = join(OUT_DIR, `PHASE3_REPORT-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Phase 3 Mirror Cabin report (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      '',
      '## Aliases',
      '',
      'Added to `lib/glamping-unit-type-normalize.ts` → `Mirror Cabin`:',
      '',
      '- mirror cabin(s), mirrored cabin(s), mirror/mirrored house(s)',
      '- glass cabin(s), glass house(s)',
      '- ood / ööd house(s), ood mirror house/cabin',
      '',
      '## Discovery',
      '',
      'Script: `scripts/research-mirror-cabin-glamping-us.ts`',
      '',
      '- Tavily multi-query + optional Firecrawl + GPT extract',
      '- Dedupes vs `all_sage_data`; writes review CSVs under `scripts/.tmp-mirror-cabin-review/`',
      '- First automated pass: mostly already-in-Sage (Two Capes, Bolt Farm, Cameron Ranch, Glamp Michigan)',
      '- Manual web expand found Oak Ranch Resort (not in first GPT extract set)',
      '',
      '## Applied',
      '',
      `- Inserts: **${inserted}**`,
      `- Skipped: **${skipped}**`,
      `- discovery_source: \`${DISCOVERY_SOURCE}\``,
      '',
      '### Inserts',
      '',
      `- Glamp Michigan / ÖÖD Mirror House (qty 2) — sibling on property_id \`${GLAMP_MICHIGAN.property_id}\``,
      `- Oak Ranch Resort / Mirror House (qty 2) — net-new Graham, TX`,
      '',
      '## Rejected / not retyped',
      '',
      ...REJECTED.map((r) => `- **${r.name}**: ${r.reason}`),
      '',
      '## Artifacts',
      '',
      `- \`${sqlPath}\``,
      `- \`phase3-discovery-queue.csv\``,
      `- \`phase3-already-in-sage.csv\``,
      `- \`phase3-discovery-results.jsonl\``,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: inserted=${inserted}, skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} applied)`
  );
  console.log(`SQL export: ${sqlPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
