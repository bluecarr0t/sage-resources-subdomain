#!/usr/bin/env npx tsx
/**
 * Phase 1 — Jupe USA enrichments / reclass.
 *
 * Baseline found 0 mislabeled unit_type rows. Wave-1 Phase 1 therefore:
 *   A) Enrich quantity_of_units on Flying Flags Avila Beach (official: 8 Jupes)
 *   B) Document skipped / closed / non-USA case studies
 *
 * Usage:
 *   npx tsx scripts/apply-jupe-reclass-enrich-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-jupe-reclass-enrich-us-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'jupe_enrich_us_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-jupe-review');
const CANONICAL = normalizeGlampingUnitTypeForStorage('Jupe') ?? 'Jupe';

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

const QTY_ENRICH: Array<{
  id: number;
  property_name: string;
  quantity_of_units: number;
  evidence: string;
}> = [
  {
    id: 9562,
    property_name: 'Flying Flags Avila Beach',
    quantity_of_units: 8,
    evidence:
      'flyingflags.com/room/jupes-tent — “Enjoy one of our eight available Jupes!”',
  },
];

const NOTES = [
  {
    name: 'El Cosmico (Marfa, TX)',
    reason:
      'Already in Sage as Closed / OG site shut down; relocating 2027. Do not add Jupe sibling while closed.',
  },
  {
    name: 'Akampa (Magdalena Bay, MX)',
    reason: 'Jupe case study is Mexico — out of USA campaign scope.',
  },
  {
    name: 'Lake Hemet Campground',
    reason:
      'Official site markets bell/glamping tents, not branded Jupe product — skipped.',
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Canonical unit_type: ${CANONICAL}`);
  console.log(`Tag: ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- Phase 1 Jupe USA enrichments (${TODAY})`,
    `-- discovery_source note tag: ${DISCOVERY_SOURCE}`,
    '',
  ];

  let updated = 0;
  let skipped = 0;

  console.log('A) Enrich quantity_of_units on existing Jupe rows');
  console.log('-'.repeat(60));
  for (const item of QTY_ENRICH) {
    const { data: row, error } = await supabase
      .from(TABLE)
      .select('id, unit_type, quantity_of_units, notes')
      .eq('id', item.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      console.log(`SKIP id=${item.id} — not found`);
      skipped += 1;
      continue;
    }
    if (String(row.unit_type ?? '') !== CANONICAL) {
      console.log(
        `SKIP id=${item.id} — unit_type=${row.unit_type} (expected ${CANONICAL})`
      );
      skipped += 1;
      continue;
    }
    const currentQty = row.quantity_of_units;
    if (String(currentQty ?? '') === String(item.quantity_of_units)) {
      console.log(`SKIP id=${item.id} — qty already ${item.quantity_of_units}`);
      skipped += 1;
      continue;
    }

    const noteAppend = `[${TODAY}] Phase 1 Jupe enrich: quantity_of_units ${currentQty ?? 'null'} → ${item.quantity_of_units} (${item.evidence}) [${DISCOVERY_SOURCE}]`;
    console.log(
      `UPDATE id=${item.id} ${item.property_name}: qty ${currentQty ?? 'null'} → ${item.quantity_of_units}`
    );
    sqlLines.push(
      `UPDATE public.${TABLE} SET quantity_of_units = '${item.quantity_of_units}', date_updated = '${TODAY}', notes = COALESCE(notes || E'\\n', '') || '${noteAppend.replace(/'/g, "''")}' WHERE id = ${item.id};`
    );

    if (!DRY_RUN) {
      const prevNotes = String(row.notes ?? '');
      const { error: updErr } = await supabase
        .from(TABLE)
        .update({
          quantity_of_units: String(item.quantity_of_units),
          date_updated: TODAY,
          notes: prevNotes ? `${prevNotes}\n${noteAppend}` : noteAppend,
        })
        .eq('id', item.id);
      if (updErr) throw new Error(updErr.message);
    }
    updated += 1;
  }

  console.log('\nB) Documented skips');
  console.log('-'.repeat(60));
  for (const n of NOTES) {
    console.log(`  ${n.name}: ${n.reason}`);
  }

  const sqlPath = join(OUT_DIR, `phase1-jupe-enrich-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');
  const migrationPath = resolve(
    process.cwd(),
    `scripts/migrations/jupe-enrich-us-${TODAY}.sql`
  );
  writeFileSync(migrationPath, sqlLines.join('\n') + '\n', 'utf-8');

  const reportPath = join(OUT_DIR, `PHASE1_REPORT-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Phase 1 Jupe enrich report (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      '',
      `- Qty enrichments: **${updated}**`,
      `- Skipped: **${skipped}**`,
      '',
      '### Notes',
      ...NOTES.map((n) => `- **${n.name}**: ${n.reason}`),
      '',
      'No mislabeled `unit_type` reclasses in Phase 0 (0 signal rows with wrong unit_type).',
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: updated=${updated}, skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} applied)`
  );
  console.log(`SQL: ${sqlPath}`);
  console.log(`Migration: ${migrationPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
