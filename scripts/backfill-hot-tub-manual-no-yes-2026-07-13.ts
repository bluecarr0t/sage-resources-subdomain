#!/usr/bin/env npx tsx
/**
 * Wave A — Manual No for scrape-inconclusive Safari/Cabin brands (US only).
 * Wave B — Yes-focused private tub corrections / fills.
 *
 * Usage:
 *   npx tsx scripts/backfill-hot-tub-manual-no-yes-2026-07-13.ts --dry-run
 *   npx tsx scripts/backfill-hot-tub-manual-no-yes-2026-07-13.ts
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
const DISCOVERY_TAG = 'manual_hot_tub_2026_07_13';

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
  unit_hot_tub: 'Yes' | 'No';
  property_hot_tub?: 'Yes' | 'No';
  /** Allow overwriting an existing Yes/No when correcting a known mis-tag. */
  allowOverwrite?: boolean;
  evidence: string;
};

/** Wave A — Manual No (unit_hot_tub blank only). */
const MANUAL_NO: Spec[] = [
  // Huttopia White Mountains
  { id: 10193, unit_hot_tub: 'No', evidence: 'Huttopia Trappeur — no private tub; shared facilities.' },
  { id: 10195, unit_hot_tub: 'No', evidence: 'Huttopia Canadienne — no private tub.' },
  { id: 10194, unit_hot_tub: 'No', evidence: 'Huttopia Trappeur Duo — no private tub.' },
  // Huttopia Paradise Springs (Chaplain Cabin 10425 is Yes in Wave B)
  { id: 10424, unit_hot_tub: 'No', evidence: 'Huttopia Trappeur Duo Pacific Red Rock — no private tub.' },
  { id: 10099, unit_hot_tub: 'No', evidence: 'Huttopia Canadienne Pacific — no private tub.' },
  { id: 10100, unit_hot_tub: 'No', evidence: 'Huttopia Trappeur Pacific — no private tub.' },
  { id: 10101, unit_hot_tub: 'No', evidence: 'Huttopia Trappeur Duo Pacific — no private tub.' },
  // Huttopia Wine Country
  { id: 10096, unit_hot_tub: 'No', evidence: 'Huttopia Wine Country Canadienne — no private tub.' },
  { id: 10097, unit_hot_tub: 'No', evidence: 'Huttopia Wine Country Trappeur — no private tub.' },
  { id: 10098, unit_hot_tub: 'No', evidence: 'Huttopia Wine Country Trappeur Duo — no private tub.' },
  // Costanoa — shared bathhouse/sauna
  {
    id: 10095,
    unit_hot_tub: 'No',
    property_hot_tub: 'Yes',
    evidence: 'Costanoa Tent Bungalo — shared Bath House saunas/showers; no private tub.',
  },
  {
    id: 10419,
    unit_hot_tub: 'No',
    property_hot_tub: 'Yes',
    evidence: 'Costanoa Douglas Fir Cabins — shared Bath House; no private tub.',
  },
  {
    id: 10418,
    unit_hot_tub: 'No',
    property_hot_tub: 'Yes',
    evidence: 'Costanoa Campground Cabin — shared Bath House; no private tub.',
  },
  // AutoCamp Luxury Tents
  { id: 10093, unit_hot_tub: 'No', evidence: 'AutoCamp Russian River Luxury Tent — no private hot tub.' },
  { id: 10198, unit_hot_tub: 'No', evidence: 'AutoCamp Catskills Luxury Tent — no private hot tub.' },
  // Collective Retreats
  { id: 13008, unit_hot_tub: 'No', evidence: 'Collective Governors Island Journey Tent — no private tub.' },
  { id: 13009, unit_hot_tub: 'No', evidence: 'Collective Governors Island Voyager Tent — no private tub.' },
  { id: 13010, unit_hot_tub: 'No', evidence: 'Collective Governors Island Basecamp Cabin — no private tub.' },
  { id: 10254, unit_hot_tub: 'No', evidence: 'Collective Hill Country Summit Tent — no private tub.' },
  { id: 10252, unit_hot_tub: 'No', evidence: 'Collective Hill Country Honeymoon Tent — no private tub.' },
  { id: 10253, unit_hot_tub: 'No', evidence: 'Collective Hill Country Family Suite — no private tub.' },
  // Two Capes Mirror Cabin — patio only, no private tub
  { id: 10326, unit_hot_tub: 'No', evidence: 'Two Capes South Cape Mirror Cabin — patio; no private hot tub listed.' },
  // Postcard Cabin blanks (brand standard: no private outdoor tub)
  { id: 10672, unit_hot_tub: 'No', evidence: 'Postcard Cabins Hocking Hills — brand standard no private tub.' },
  { id: 10675, unit_hot_tub: 'No', evidence: 'Postcard Cabins Shenandoah North — brand standard no private tub.' },
];

/** Wave B — Yes-focused (private tub / in-unit jacuzzi). */
const MANUAL_YES: Spec[] = [
  {
    id: 10539,
    unit_hot_tub: 'Yes',
    property_hot_tub: 'Yes',
    evidence:
      'North Texas Jellystone Cabins — Premium/Rustic/Silos market in-room Jacuzzi-style tubs; park also has shared spa.',
  },
  {
    id: 10481,
    unit_hot_tub: 'Yes',
    evidence:
      'Paws Up Montana luxury cabins/homes — private outdoor hot tubs standard (Big Timber / Meadow / Green O).',
  },
  {
    id: 10425,
    unit_hot_tub: 'Yes',
    evidence: 'Huttopia Paradise Springs Chaplain Cabin — private patio hot tub (site listing).',
  },
  {
    id: 10045,
    unit_hot_tub: 'Yes',
    allowOverwrite: true,
    evidence:
      'Bolt Farm Mirror Cabins — private Nordic hot tub on terrace (boltfarmtreehouse.com / Travel + Leisure). Correct prior No.',
  },
  {
    id: 13095,
    unit_hot_tub: 'Yes',
    evidence:
      "Tu Tu' Tun ÖÖD Glass Cabins — private outdoor soaking tubs (NYT / lodge marketing).",
  },
  {
    id: 13093,
    unit_hot_tub: 'Yes',
    evidence: 'Oakey Mountain Mirror Häus — outdoor bath / hot tub + shared sauna (oodhotels).',
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

  const sqlNo: string[] = [`-- Hot tub Manual No batch-4 (${TODAY})`, ''];
  const sqlYes: string[] = [`-- Hot tub Manual Yes batch-5 (${TODAY})`, ''];
  let noN = 0;
  let yesN = 0;
  let skipped = 0;

  console.log('Wave A — Manual No');
  console.log('-'.repeat(60));
  for (const spec of MANUAL_NO) {
    const r = await applySpec(spec, sqlNo);
    if (r === 'updated') noN += 1;
    else skipped += 1;
  }

  console.log('\nWave B — Manual Yes');
  console.log('-'.repeat(60));
  for (const spec of MANUAL_YES) {
    const r = await applySpec(spec, sqlYes);
    if (r === 'updated') yesN += 1;
    else skipped += 1;
  }

  const batch4 = join(
    process.cwd(),
    'scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-4.sql'
  );
  const batch5 = join(
    process.cwd(),
    'scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-5.sql'
  );
  writeFileSync(batch4, sqlNo.join('\n') + '\n', 'utf-8');
  writeFileSync(batch5, sqlYes.join('\n') + '\n', 'utf-8');

  const auditCsv = join(OUT_DIR, `manual-hot-tub-pass-${TODAY}.csv`);
  writeFileSync(
    auditCsv,
    'wave,id,unit_hot_tub,status,evidence\n',
    'utf-8'
  );
  for (const s of MANUAL_NO) {
    appendFileSync(
      auditCsv,
      `A-No,${s.id},${s.unit_hot_tub},manual,${JSON.stringify(s.evidence)}\n`
    );
  }
  for (const s of MANUAL_YES) {
    appendFileSync(
      auditCsv,
      `B-Yes,${s.id},${s.unit_hot_tub},manual,${JSON.stringify(s.evidence)}\n`
    );
  }

  console.log(
    `\nSummary: Manual No updates=${noN}, Manual Yes updates=${yesN}, skipped=${skipped}`
  );
  console.log(`Migrations: ${batch4}`);
  console.log(`            ${batch5}`);
  console.log(`Audit CSV: ${auditCsv}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
