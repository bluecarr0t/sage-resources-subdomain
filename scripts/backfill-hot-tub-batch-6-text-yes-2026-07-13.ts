#!/usr/bin/env npx tsx
/**
 * Batch 6 — Curated Yes from site_name / description text signals + web verify.
 *
 * Targets private in-unit / on-deck hot tubs (or spa tubs) previously blank or
 * incorrectly tagged No.
 *
 * Usage:
 *   npx tsx scripts/backfill-hot-tub-batch-6-text-yes-2026-07-13.ts --dry-run
 *   npx tsx scripts/backfill-hot-tub-batch-6-text-yes-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-hot-tub-review');
const DISCOVERY_TAG = 'manual_hot_tub_text_batch6_2026_07_13';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Spec = {
  id: number;
  unit_hot_tub: 'Yes';
  property_hot_tub?: 'Yes' | 'No';
  allowOverwrite?: boolean;
  evidence: string;
};

/** Verified private tub Yes corrections / fills. */
const MANUAL_YES: Spec[] = [
  {
    id: 88,
    unit_hot_tub: 'Yes',
    evidence:
      'Sinya on Lone Man Creek — private cowboy/jacuzzi hot tub on back deck (hillcountrysinya.com/outside). Sage description also states private hot tub.',
  },
  {
    id: 10269,
    unit_hot_tub: 'Yes',
    evidence:
      'Sinya single safari tent row — same private deck hot tub as property amenity (hillcountrysinya.com).',
  },
  {
    id: 10282,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Open Sky Star Seeker — ensuite freestanding copper soaking tub / spa tub (stayopensky.com/accommodations). Correct prior No.',
  },
  {
    id: 9800,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Stay Nantahala Tranquil Haven Luxury Yurt — site marketing “with Hot Tub”; VRBO/private deck hot tub; FAQ each luxury yurt has hot tub.',
  },
  {
    id: 9801,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Stay Nantahala Creekside Cove Luxury Yurt — site title “w/Hot Tub”; FAQ each luxury yurt includes private hot tub.',
  },
  {
    id: 10886,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Onera Wimberley Spyglass/Greenhouse inventory — each unit private cedar hot tub (stayonera.com). Sage description: each with private hot tubs. Correct prior No.',
  },
  {
    id: 11591,
    unit_hot_tub: 'Yes',
    evidence:
      'Boonies Farm luxury dome tents — private wood-fired hot tubs (riversandroutes / operator marketing).',
  },
  {
    id: 10346,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'The Glamping Collective Ultra Luxe Dome — private deck hot tub (theglampingcollective.com). Sibling Accessible Ultra Luxe already Yes. Correct prior No.',
  },
  {
    id: 10344,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Asheville Glamping Mountain View Dome — Sage description: each featuring hot tubs; aligns with Luxe Dome private deck tub product line. Correct prior No.',
  },
];

function isEmpty(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === '';
}

function appendNote(prev: string | null | undefined, line: string): string {
  const p = String(prev ?? '').trim();
  return p ? `${p}\n\n${line}` : line;
}

function mergeDiscovery(prev: string | null | undefined, tag: string): string {
  const p = String(prev ?? '').trim();
  if (!p) return tag;
  if (p.includes(tag)) return p;
  return `${p}; ${tag}`;
}

async function applySpec(spec: Spec, sqlLines: string[]): Promise<'updated' | 'skipped'> {
  const { data: row, error } = await supabase
    .from(TABLE)
    .select(
      'id, property_name, site_name, unit_hot_tub, property_hot_tub, notes, discovery_source'
    )
    .eq('id', spec.id)
    .maybeSingle();
  if (error) throw new Error(`Fetch ${spec.id}: ${error.message}`);
  if (!row) {
    console.log(`SKIP id=${spec.id} — missing`);
    return 'skipped';
  }

  const currentUnit = row.unit_hot_tub as string | null;
  if (!isEmpty(currentUnit) && !spec.allowOverwrite) {
    console.log(
      `SKIP id=${spec.id} ${row.property_name} — unit_hot_tub already ${currentUnit}`
    );
    return 'skipped';
  }
  if (
    !isEmpty(currentUnit) &&
    spec.allowOverwrite &&
    String(currentUnit).toLowerCase() === spec.unit_hot_tub.toLowerCase()
  ) {
    console.log(`SKIP id=${spec.id} — already ${spec.unit_hot_tub}`);
    return 'skipped';
  }

  const patch: Record<string, unknown> = {
    unit_hot_tub: spec.unit_hot_tub,
    date_updated: TODAY,
    discovery_source: mergeDiscovery(row.discovery_source as string | null, DISCOVERY_TAG),
  };

  if (spec.property_hot_tub && isEmpty(row.property_hot_tub as string | null)) {
    patch.property_hot_tub = spec.property_hot_tub;
  }

  const noteLine = `[${TODAY}] Manual hot tub ${spec.unit_hot_tub}: ${spec.evidence}`;
  patch.notes = appendNote(row.notes as string | null, noteLine);

  console.log(
    `UPDATE id=${spec.id} ${row.property_name} / ${row.site_name}: unit_hot_tub ${currentUnit ?? 'null'} → ${spec.unit_hot_tub}`
  );

  const propSql =
    patch.property_hot_tub != null
      ? `,\n  property_hot_tub = '${patch.property_hot_tub}'`
      : '';
  sqlLines.push(
    `UPDATE public.${TABLE} SET\n  unit_hot_tub = '${spec.unit_hot_tub}'${propSql},\n  date_updated = '${TODAY}',\n  discovery_source = '${String(patch.discovery_source).replace(/'/g, "''")}',\n  notes = COALESCE(notes, '') || E'\\n\\n${noteLine.replace(/'/g, "''")}'\nWHERE id = ${spec.id};\n`
  );

  if (!DRY_RUN) {
    const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', spec.id);
    if (upErr) throw new Error(`Update ${spec.id}: ${upErr.message}`);
  }
  return 'updated';
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const sqlYes: string[] = [`-- Hot tub Manual Yes batch-6 text/web (${TODAY})`, ''];
  let yesN = 0;
  let skipped = 0;

  console.log('Batch 6 — Manual Yes (site_name / description + web verify)');
  console.log('-'.repeat(60));
  for (const spec of MANUAL_YES) {
    const r = await applySpec(spec, sqlYes);
    if (r === 'updated') yesN += 1;
    else skipped += 1;
  }

  const batch6 = join(
    process.cwd(),
    'scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-6.sql'
  );
  writeFileSync(batch6, sqlYes.join('\n') + '\n', 'utf-8');

  const auditCsv = join(OUT_DIR, `manual-hot-tub-batch6-${TODAY}.csv`);
  writeFileSync(auditCsv, 'wave,id,unit_hot_tub,status,evidence\n', 'utf-8');
  for (const s of MANUAL_YES) {
    appendFileSync(
      auditCsv,
      `B6-Yes,${s.id},${s.unit_hot_tub},manual,${JSON.stringify(s.evidence)}\n`
    );
  }

  console.log(`\nSummary: Manual Yes updates=${yesN}, skipped=${skipped}`);
  console.log(`Migration: ${batch6}`);
  console.log(`Audit CSV: ${auditCsv}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
