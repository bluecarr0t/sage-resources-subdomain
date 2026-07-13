#!/usr/bin/env npx tsx
/**
 * Retire Canvas Tent catch-all → four structural types + rename Canvas Cabin → Cabin Tent.
 *
 * 1. Rename all `Canvas Cabin` → `Cabin Tent`
 * 2. Merge `Wall Tent` → `Safari Tent`
 * 3. High-confidence remaps of published `Canvas Tent` rows from site_name / notes cues
 * 4. Export ambiguous Canvas Tent remainder to CSV for research queue
 *
 * Usage:
 *   npx tsx scripts/apply-retire-canvas-tent-structural-types-2026-07-13.ts --dry-run
 *   npx tsx scripts/apply-retire-canvas-tent-structural-types-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const NOTE_PREFIX = '[2026-07-13] retire Canvas Tent structural remap';
const RESEARCH_TAG = 'retire_canvas_tent_structural_2026_07_13';

type Row = {
  id: number;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  notes: string | null;
  quantity_of_units: number | null;
  research_status: string | null;
};

type Target = 'Safari Tent' | 'Cabin Tent' | 'Bell Tent' | 'Tipi';

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX) && base.includes(addition.slice(0, 50))) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

function classifyCanvasTent(row: Row): { target: Target; reason: string } | null {
  // Use site_name only — notes often contain prior "Safari Tent → Canvas Tent" remap text.
  const site = (row.site_name ?? '').toLowerCase().trim();
  if (!site) return null;

  // Cabin Tent cues
  if (
    /\bcabin\s*tents?\b/.test(site) ||
    /\btent[-\s]?cabins?\b/.test(site) ||
    /\btentalows?\b/.test(site) ||
    /\bcanvas\s*cabins?\b/.test(site)
  ) {
    return { target: 'Cabin Tent', reason: `site_name cabin/tentalow cue ("${row.site_name}")` };
  }

  // Tipi
  if (/\btipis?\b|\bteepees?\b/.test(site)) {
    return { target: 'Tipi', reason: `site_name tipi cue ("${row.site_name}")` };
  }

  // Bell
  if (/\bbell\s*tents?\b|\blotus\s*belle?\b|\blotus\s*tents?\b/.test(site)) {
    return { target: 'Bell Tent', reason: `site_name bell/lotus cue ("${row.site_name}")` };
  }

  // Safari / wall (explicit structural naming only)
  if (
    /\bwall\s*tents?\b/.test(site) ||
    /\bsafari\s*tents?\b/.test(site) ||
    /\bsafari\s*suites?\b/.test(site) ||
    /\bsuite\s*tents?\b/.test(site) ||
    /\bfurnished\s*wall\s*tent/.test(site)
  ) {
    return { target: 'Safari Tent', reason: `site_name wall/safari/suite tent cue ("${row.site_name}")` };
  }

  return null;
}

async function fetchAll(
  supabase: ReturnType<typeof createClient>,
  unitType: string
): Promise<Row[]> {
  const rows: Row[] = [];
  let offset = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id,property_name,site_name,unit_type,notes,quantity_of_units,research_status'
      )
      .eq('unit_type', unitType)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`fetch ${unitType}: ${error.message}`);
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

async function patchRow(
  supabase: ReturnType<typeof createClient>,
  row: Row,
  unitType: string,
  reason: string
): Promise<void> {
  const note = `${NOTE_PREFIX}: ${row.unit_type} → ${unitType} (${reason}; ${RESEARCH_TAG}).`;
  const patch = {
    unit_type: unitType,
    date_updated: TODAY,
    notes: appendNote(row.notes, note),
  };
  console.log(
    `${DRY_RUN ? 'DRY ' : ''}PATCH id=${row.id} ${row.property_name} | ${row.site_name} | ${row.unit_type} → ${unitType}`
  );
  if (DRY_RUN) return;
  const { error } = await supabase.from(TABLE).update(patch).eq('id', row.id);
  if (error) throw new Error(`update id=${row.id}: ${error.message}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Canvas Cabin → Cabin Tent
  const canvasCabins = await fetchAll(supabase, 'Canvas Cabin');
  console.log(`\n=== Canvas Cabin → Cabin Tent (${canvasCabins.length}) ===`);
  for (const row of canvasCabins) {
    await patchRow(supabase, row, 'Cabin Tent', 'rename Canvas Cabin → Cabin Tent');
  }

  // 2) Wall Tent → Safari Tent
  const wallTents = await fetchAll(supabase, 'Wall Tent');
  console.log(`\n=== Wall Tent → Safari Tent (${wallTents.length}) ===`);
  for (const row of wallTents) {
    await patchRow(supabase, row, 'Safari Tent', 'Wall Tent alias → Safari Tent');
  }

  // 3–4) Canvas Tent high-confidence remaps + ambiguous queue
  const canvasTents = await fetchAll(supabase, 'Canvas Tent');
  const published = canvasTents.filter(
    (r) => (r.research_status ?? '').toLowerCase() === 'published'
  );
  console.log(
    `\n=== Canvas Tent rows: ${canvasTents.length} total, ${published.length} published ===`
  );

  const ambiguous: Row[] = [];
  let remapped = 0;
  for (const row of published) {
    const hit = classifyCanvasTent(row);
    if (hit) {
      await patchRow(supabase, row, hit.target, hit.reason);
      remapped += 1;
    } else {
      ambiguous.push(row);
    }
  }

  // Also remap non-published high-confidence if any
  for (const row of canvasTents.filter(
    (r) => (r.research_status ?? '').toLowerCase() !== 'published'
  )) {
    const hit = classifyCanvasTent(row);
    if (hit) {
      await patchRow(supabase, row, hit.target, hit.reason);
      remapped += 1;
    }
  }

  const outDir = resolve(process.cwd(), 'docs/data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'CANVAS_TENT_AMBIGUOUS_QUEUE_2026-07-13.csv');
  const header =
    'id,property_name,site_name,unit_type,quantity_of_units,research_status\n';
  const lines = ambiguous.map((r) =>
    [
      r.id,
      csvEscape(r.property_name),
      csvEscape(r.site_name),
      csvEscape(r.unit_type),
      r.quantity_of_units ?? '',
      csvEscape(r.research_status),
    ].join(',')
  );
  writeFileSync(outPath, header + lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');

  console.log(`\nRemapped Canvas Tent (high confidence): ${remapped}`);
  console.log(`Ambiguous published Canvas Tent queue: ${ambiguous.length} → ${outPath}`);
  if (DRY_RUN) console.log('\nDry run only — no DB writes.');
}

function csvEscape(v: string | null | undefined): string {
  const s = v ?? '';
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
