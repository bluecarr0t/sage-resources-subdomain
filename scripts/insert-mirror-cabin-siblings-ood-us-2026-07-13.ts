#!/usr/bin/env npx tsx
/**
 * Phase 1 — Mirror Cabin siblings / unit_type corrections for USA inventory.
 *
 * Web verification (2026-07-13) found most ÖÖD *deal* seed matches do NOT currently
 * market bookable Mirror Cabins. Phase 1 therefore:
 *   A) UPDATE rows that already name Mirror House/Cabin but store wrong unit_type
 *   B) INSERT a Mirror Cabin sibling where ÖÖD is verified on-site but no mirror row exists
 *   C) Document rejected ÖÖD seed targets (no public mirror inventory found)
 *
 * Usage:
 *   npx tsx scripts/insert-mirror-cabin-siblings-ood-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-mirror-cabin-siblings-ood-us-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'ood_mirror_cabin_phase1_2026_07_13';
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

/** Existing rows: site_name already identifies mirror product; unit_type is wrong. */
const RETYPE_TO_MIRROR_CABIN: Array<{
  id: number;
  property_name: string;
  site_name: string;
  from_unit_type: string;
  evidence: string;
}> = [
  {
    id: 10045,
    property_name: 'Bolt Farm Treehouse',
    site_name: 'Mirror Cabins',
    from_unit_type: 'Tiny Home',
    evidence:
      'boltfarmtreehouse.com markets Mirror Cabin + Floating Mirror Cabin; BusinessWire confirms ÖÖD units.',
  },
  {
    id: 12237,
    property_name: 'East Zion Resort',
    site_name: 'Mirror House',
    from_unit_type: 'Tiny Home',
    evidence:
      'eastzionresort.com/mirror-house-rentals — stand-alone mirrored tiny homes (qty 3 in Sage).',
  },
  {
    id: 9565,
    property_name: 'Two Capes Lookout',
    site_name: 'Mirror Cabin',
    from_unit_type: 'Cabin',
    evidence:
      'Duplicate of South Cape Mirror Cabin (id 10326 already Mirror Cabin); Portland Monthly confirms ÖÖD at Two Capes.',
  },
];

/** New Mirror Cabin sibling where property exists but no mirror-typed row. */
const INSERT_SIBLINGS: Array<{
  property_id: string;
  anchor_id: number;
  property_name: string;
  site_name: string;
  quantity_of_units: number | null;
  evidence: string;
  notes: string;
}> = [
  {
    property_id: '0ed65a3c-274b-4274-b8dd-ef394dfce9f7',
    anchor_id: 10912,
    property_name: 'Cameron Ranch Glamping - Bastrop',
    site_name: 'ÖÖD Mirror House',
    quantity_of_units: 2,
    evidence:
      'ÖÖD House + Chron/Tribeza: The Hideaway & The Bloom at Lake Bastrop South Shore (Cameron Ranch / LCRA).',
    notes:
      '[2026-07-13] Phase 1 Mirror Cabin sibling. Verify booking URL (LCRA vs cameronranchglamping.com) and rates before publishing.',
  },
];

/** ÖÖD deal seed list — rejected after web verification (do not insert). */
const REJECTED_OOD_SEED = [
  {
    name: 'Borealis Basecamp',
    reason: 'Website markets Igloos + Cubes only; no ÖÖD/mirror cabin listing found.',
  },
  {
    name: 'Heritage Ranch MT',
    reason: 'No public Mirror Cabin / ÖÖD inventory confirmed on property site.',
  },
  {
    name: 'Inn Town Campground',
    reason: 'No public Mirror Cabin / ÖÖD inventory confirmed on property site.',
  },
  {
    name: 'Hidden Flower Tiny Farm',
    reason: 'No public Mirror Cabin / ÖÖD inventory confirmed on property site.',
  },
  {
    name: 'Dupont Yurts',
    reason: 'Yurt-only marketing; no mirror cabin offering found.',
  },
  {
    name: 'The Yurtopian (Dripping Springs)',
    reason: 'Yurt-only marketing; ÖÖD deal address may be private/unrelated install.',
  },
  {
    name: 'Collective Retreats Governors Island',
    reason: 'Tents + Basecamp Cabin only; no ÖÖD/mirror cabin on Collective site.',
  },
  {
    name: 'Two Capes Lookout',
    reason: 'Already has Mirror Cabin row (id 10326); id 9565 retyped in this batch.',
  },
];

type AnchorRow = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
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
  lat: number | null;
  lon: number | null;
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
      'id, property_id, property_name, site_name, unit_type, slug, property_type, research_status, is_glamping_property, is_open, source, address, city, state, zip_code, country, lat, lon, url, phone_number, description, property_total_sites, land_operator_category, glamping_service_tier'
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
    return u.includes('mirror cabin') || s.includes('mirror cabin') || s.includes('mirror house');
  });
}

function buildSiblingInsert(
  anchor: AnchorRow,
  spec: (typeof INSERT_SIBLINGS)[number]
): Record<string, unknown> {
  return {
    property_name: anchor.property_name,
    site_name: spec.site_name,
    slug: anchor.slug,
    property_id: spec.property_id,
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
    lat: anchor.lat,
    lon: anchor.lon,
    url: anchor.url,
    phone_number: anchor.phone_number,
    description: anchor.description,
    unit_type: normalizeGlampingUnitTypeForStorage('Mirror Cabin'),
    quantity_of_units:
      spec.quantity_of_units != null ? String(spec.quantity_of_units) : null,
    property_total_sites: anchor.property_total_sites,
    glamping_service_tier: anchor.glamping_service_tier,
    notes: spec.notes,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- Phase 1 Mirror Cabin corrections / siblings (${TODAY})`,
    `-- discovery_source: ${DISCOVERY_SOURCE}`,
    '',
  ];

  let retyped = 0;
  let inserted = 0;
  let skipped = 0;

  console.log('A) RETYPE mislabeled mirror rows → unit_type = Mirror Cabin');
  console.log('-'.repeat(60));
  for (const item of RETYPE_TO_MIRROR_CABIN) {
    const row = await fetchRow(item.id);
    if (!row) {
      console.log(`SKIP id=${item.id} — row not found`);
      skipped += 1;
      continue;
    }
    const current = String(row.unit_type ?? '');
    if (current === 'Mirror Cabin') {
      console.log(`SKIP id=${item.id} ${item.property_name} — already Mirror Cabin`);
      skipped += 1;
      continue;
    }
    if (current !== item.from_unit_type) {
      console.log(
        `WARN id=${item.id} expected unit_type=${item.from_unit_type} got=${current} — still applying Mirror Cabin`
      );
    }

    const noteAppend = `[${TODAY}] Phase 1: unit_type ${current || 'null'} → Mirror Cabin (${item.evidence})`;
    console.log(
      `UPDATE id=${item.id} ${item.property_name} / ${item.site_name}: ${current} → Mirror Cabin`
    );

    sqlLines.push(
      `UPDATE public.${TABLE} SET unit_type = 'Mirror Cabin', date_updated = '${TODAY}', notes = COALESCE(notes || E'\\n', '') || '${noteAppend.replace(/'/g, "''")}' WHERE id = ${item.id};`
    );

    if (!DRY_RUN) {
      const { data: existing } = await supabase
        .from(TABLE)
        .select('notes')
        .eq('id', item.id)
        .maybeSingle();
      const prevNotes = String((existing as { notes?: string | null } | null)?.notes ?? '');
      const { error } = await supabase
        .from(TABLE)
        .update({
          unit_type: 'Mirror Cabin',
          date_updated: TODAY,
          notes: prevNotes ? `${prevNotes}\n${noteAppend}` : noteAppend,
        })
        .eq('id', item.id);
      if (error) throw new Error(`Update id ${item.id}: ${error.message}`);
    }
    retyped += 1;
  }

  console.log('\nB) INSERT verified Mirror Cabin siblings');
  console.log('-'.repeat(60));
  for (const spec of INSERT_SIBLINGS) {
    if (await propertyHasMirrorCabin(spec.property_id)) {
      console.log(
        `SKIP ${spec.property_name} — already has mirror cabin/house signal on property_id`
      );
      skipped += 1;
      continue;
    }
    const anchor = await fetchRow(spec.anchor_id);
    if (!anchor) {
      console.log(`SKIP ${spec.property_name} — anchor id ${spec.anchor_id} not found`);
      skipped += 1;
      continue;
    }
    const row = buildSiblingInsert(anchor, spec);
    console.log(
      `INSERT sibling ${spec.property_name} / ${spec.site_name} (qty=${spec.quantity_of_units})`
    );
    console.log(`  evidence: ${spec.evidence}`);
    sqlLines.push(
      `-- INSERT sibling for ${spec.property_name} (anchor id ${spec.anchor_id}); applied via script`
    );

    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert ${spec.property_name}: ${error.message}`);
    }
    inserted += 1;
  }

  console.log('\nC) Rejected ÖÖD seed targets (no insert)');
  console.log('-'.repeat(60));
  for (const r of REJECTED_OOD_SEED) {
    console.log(`  ${r.name}: ${r.reason}`);
  }

  const sqlPath = join(OUT_DIR, `phase1-mirror-cabin-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');

  const reportPath = join(OUT_DIR, `PHASE1_REPORT-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Phase 1 Mirror Cabin report (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      '',
      '## Applied',
      '',
      `- Retyped to Mirror Cabin: **${retyped}**`,
      `- Sibling inserts: **${inserted}**`,
      `- Skipped: **${skipped}**`,
      '',
      '### Retypes',
      ...RETYPE_TO_MIRROR_CABIN.map(
        (r) => `- id ${r.id} ${r.property_name} / ${r.site_name}: ${r.from_unit_type} → Mirror Cabin`
      ),
      '',
      '### Inserts',
      ...INSERT_SIBLINGS.map(
        (s) => `- ${s.property_name} / ${s.site_name} (qty ${s.quantity_of_units}) — ${s.evidence}`
      ),
      '',
      '## Rejected ÖÖD seed (deal match ≠ live inventory)',
      ...REJECTED_OOD_SEED.map((r) => `- **${r.name}**: ${r.reason}`),
      '',
      '## Artifacts',
      '',
      `- \`${sqlPath}\``,
      `- \`${reportPath}\``,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: retyped=${retyped}, inserted=${inserted}, skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} applied)`
  );
  console.log(`SQL export: ${sqlPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
