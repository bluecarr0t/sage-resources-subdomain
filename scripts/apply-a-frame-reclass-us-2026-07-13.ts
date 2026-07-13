#!/usr/bin/env npx tsx
/**
 * Phase 1 — A-Frame reclass for USA inventory already signaling A-Frame in site_name.
 *
 *   A) UPDATE clear mislabels → unit_type = A-Frame
 *   B) Document skipped / ambiguous rows (no auto-write)
 *
 * Usage:
 *   npx tsx scripts/apply-a-frame-reclass-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-a-frame-reclass-us-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'a_frame_reclass_us_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-a-frame-review');
const CANONICAL = normalizeGlampingUnitTypeForStorage('A-Frame') ?? 'A-Frame';

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

/** Clear site_name A-Frame signals with wrong unit_type (Phase 0 retype queue). */
const RETYPE_TO_A_FRAME: Array<{
  id: number;
  property_name: string;
  site_name: string;
  from_unit_type: string;
  evidence: string;
}> = [
  {
    id: 9983,
    property_name: 'Tiny Town Campground',
    site_name: 'A-Frames',
    from_unit_type: 'Tiny Home',
    evidence: 'site_name A-Frames; emigrantcabins.com markets A-frame cabins.',
  },
  {
    id: 10259,
    property_name: 'Khushatta Hills Ranch',
    site_name: 'A-Frame',
    from_unit_type: 'Safari Tent',
    evidence: 'site_name is A-Frame; Safari Tent label is a misclass.',
  },
  {
    id: 9965,
    property_name: 'Paloma Lake',
    site_name: 'A-Frame Cabins',
    from_unit_type: 'Tiny Home',
    evidence: 'site_name A-Frame Cabins; palomalakela.com markets A-frame cabins.',
  },
  {
    id: 9984,
    property_name: 'Tobacco River Ranch Glamping',
    site_name: 'A-Frame',
    from_unit_type: 'Tiny Home',
    evidence: 'site_name A-Frame; tobaccoriverranch.com lists A-frame lodging.',
  },
  {
    id: 10480,
    property_name: 'Bison Creek Ranch',
    site_name: 'A-Frames',
    from_unit_type: 'Cabin',
    evidence: 'site_name A-Frames; bisoncreekranch.com markets A-frame cabins.',
  },
  {
    id: 10879,
    property_name: 'Cedar Bloom Farm',
    site_name: 'A-Frame Cabin',
    from_unit_type: 'Cabin',
    evidence: 'site_name A-Frame Cabin; cedarbloomfarm.com markets an A-frame cabin.',
  },
  {
    id: 10028,
    property_name: 'Treetopia Campground',
    site_name: 'A-Frame Cabin',
    from_unit_type: 'Tiny Home',
    evidence: 'site_name A-Frame Cabin; treetopiacampground.com markets A-frame cabin.',
  },
];

const SKIP_ALREADY_HAS_AFRAME = [
  {
    id: 9971,
    property_name: "Tops'l Farm",
    reason: 'property_id already has published A-Frame row id 9739',
  },
  {
    id: 9622,
    property_name: 'Lost Woods Farm & Forest',
    reason: 'property_id already has published A-Frame row id 9714',
  },
];

const AMBIGUOUS = [
  {
    id: 10009,
    property_name: 'Lumen Nature Retreat',
    site_name: 'Luxury A-Frame Tents',
    reason: 'A-Frame Tents may be tent product, not hard-walled A-Frame cabin.',
  },
  {
    id: 10032,
    property_name: 'Happydale Retreat',
    site_name: 'A-Frame/Cabin',
    reason: 'Hybrid site_name; confirm whether all 10 units are A-Frames before retype.',
  },
  {
    id: 10504,
    property_name: 'Mohican Adventures',
    site_name: 'A-Frame, Frye',
    reason:
      'Mixed cabin inventory (qty 17). Retyping whole row would mislabel non-A-Frame cabins; needs sibling split after qty verify.',
  },
];

async function fetchRow(id: number): Promise<{
  id: number;
  unit_type: string | null;
  property_name: string | null;
  site_name: string | null;
  notes: string | null;
} | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, unit_type, property_name, site_name, notes')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Fetch id ${id}: ${error.message}`);
  return data as {
    id: number;
    unit_type: string | null;
    property_name: string | null;
    site_name: string | null;
    notes: string | null;
  } | null;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Canonical unit_type: ${CANONICAL}`);
  console.log(`Discovery source tag (notes): ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- Phase 1 A-Frame reclass USA (${TODAY})`,
    `-- discovery_source note tag: ${DISCOVERY_SOURCE}`,
    `-- Canonical: ${CANONICAL}`,
    '',
  ];

  let retyped = 0;
  let skipped = 0;

  console.log(`A) RETYPE mislabeled rows → unit_type = ${CANONICAL}`);
  console.log('-'.repeat(60));
  for (const item of RETYPE_TO_A_FRAME) {
    const row = await fetchRow(item.id);
    if (!row) {
      console.log(`SKIP id=${item.id} — row not found`);
      skipped += 1;
      continue;
    }
    const current = String(row.unit_type ?? '');
    if (current === CANONICAL) {
      console.log(`SKIP id=${item.id} ${item.property_name} — already ${CANONICAL}`);
      skipped += 1;
      continue;
    }
    if (current !== item.from_unit_type) {
      console.log(
        `WARN id=${item.id} expected unit_type=${item.from_unit_type} got=${current} — still applying ${CANONICAL}`
      );
    }

    const noteAppend = `[${TODAY}] Phase 1 A-Frame reclass: unit_type ${current || 'null'} → ${CANONICAL} (${item.evidence}) [${DISCOVERY_SOURCE}]`;
    console.log(
      `UPDATE id=${item.id} ${item.property_name} / ${item.site_name}: ${current} → ${CANONICAL}`
    );

    sqlLines.push(
      `UPDATE public.${TABLE} SET unit_type = '${CANONICAL}', date_updated = '${TODAY}', notes = COALESCE(notes || E'\\n', '') || '${noteAppend.replace(/'/g, "''")}' WHERE id = ${item.id} AND unit_type IS DISTINCT FROM '${CANONICAL}';`
    );

    if (!DRY_RUN) {
      const prevNotes = String(row.notes ?? '');
      const { error } = await supabase
        .from(TABLE)
        .update({
          unit_type: CANONICAL,
          date_updated: TODAY,
          notes: prevNotes ? `${prevNotes}\n${noteAppend}` : noteAppend,
        })
        .eq('id', item.id);
      if (error) throw new Error(`Update id ${item.id}: ${error.message}`);
    }
    retyped += 1;
  }

  console.log('\nB) Skip — property already has A-Frame row');
  console.log('-'.repeat(60));
  for (const s of SKIP_ALREADY_HAS_AFRAME) {
    console.log(`  id ${s.id} ${s.property_name}: ${s.reason}`);
    skipped += 1;
  }

  console.log('\nC) Ambiguous — no auto-write');
  console.log('-'.repeat(60));
  for (const a of AMBIGUOUS) {
    console.log(`  id ${a.id} ${a.property_name} / ${a.site_name}: ${a.reason}`);
  }

  const sqlPath = join(OUT_DIR, `phase1-a-frame-reclass-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');

  const migrationPath = resolve(
    process.cwd(),
    `scripts/migrations/a-frame-reclass-siblings-us-${TODAY}.sql`
  );
  writeFileSync(migrationPath, sqlLines.join('\n') + '\n', 'utf-8');

  const reportPath = join(OUT_DIR, `PHASE1_REPORT-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Phase 1 A-Frame reclass report (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      '',
      '## Applied',
      '',
      `- Retyped to A-Frame: **${retyped}**`,
      `- Skipped (already has / not found): **${skipped}**`,
      '',
      '### Retypes',
      ...RETYPE_TO_A_FRAME.map(
        (r) =>
          `- id ${r.id} ${r.property_name} / ${r.site_name}: ${r.from_unit_type} → A-Frame`
      ),
      '',
      '### Skipped (already has A-Frame)',
      ...SKIP_ALREADY_HAS_AFRAME.map((s) => `- id ${s.id} ${s.property_name}: ${s.reason}`),
      '',
      '### Ambiguous (no write)',
      ...AMBIGUOUS.map(
        (a) => `- id ${a.id} ${a.property_name} / ${a.site_name}: ${a.reason}`
      ),
      '',
      '## Artifacts',
      '',
      `- \`${sqlPath}\``,
      `- \`${migrationPath}\``,
      `- \`${reportPath}\``,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: retyped=${retyped}, skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} applied)`
  );
  console.log(`SQL export: ${sqlPath}`);
  console.log(`Migration: ${migrationPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
