#!/usr/bin/env npx tsx
/**
 * P2: Reclass generic tent site_name rows from Safari Tent → Canvas Tent.
 * Excludes brand portfolios (Under Canvas, Huttopia, Terramor, Mendocino, Collective,
 * AutoCamp, Open Sky, ULUM), property names containing "safari", and known luxury
 * safari camps (Longitude 131°, Suján The Serai).
 *
 * Companion SQL: scripts/migrations/safari-tent-generic-to-canvas-tent-2026-07-13.sql
 *
 * Usage:
 *   npx tsx scripts/apply-safari-tent-generic-to-canvas-tent-2026-07-13.ts
 *   npx tsx scripts/apply-safari-tent-generic-to-canvas-tent-2026-07-13.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const TODAY = '2026-07-13';
const DRY_RUN = process.argv.includes('--dry-run');
const NOTE_PREFIX = '[2026-07-13] unit_type Safari Tent → Canvas Tent';
const RESEARCH_TAG = 'safari_tent_generic_to_canvas_tent_2026_07_13';

const GENERIC_SITE_RE =
  /^(glamping tent|glamping tents|luxury tent|luxury tents|deluxe tent|deluxe tents|tents|tent|canvas tent|canvas tents)$/i;

const BRAND_PREFIXES = [
  'Under Canvas',
  'Huttopia',
  'Terramor',
  'Mendocino Grove',
  'Collective',
  'AutoCamp',
  'Open Sky',
  'ULUM',
];

/** Luxury safari camps whose "Luxury Tent" SKUs are safari product, not generic canvas. */
const KEEP_SAFARI_NAME_RE = /longitude\s*131|suj[aá]n/i;

type Row = {
  id: number;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  notes: string | null;
};

function isExcludedBrand(name: string): boolean {
  return BRAND_PREFIXES.some((p) => name.toLowerCase().startsWith(p.toLowerCase()));
}

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(NOTE_PREFIX)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: Row[] = [];
  let offset = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id,property_name,site_name,unit_type,notes')
      .eq('research_status', 'published')
      .eq('is_glamping_property', 'Yes')
      .ilike('unit_type', 'safari tent')
      .order('id')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }

  const targets = rows.filter((r) => {
    const site = (r.site_name ?? '').trim();
    const name = (r.property_name ?? '').trim();
    if (!GENERIC_SITE_RE.test(site)) return false;
    if (isExcludedBrand(name)) return false;
    if (/safari/i.test(name)) return false;
    if (KEEP_SAFARI_NAME_RE.test(name)) return false;
    return true;
  });

  console.log(`Candidates: ${targets.length} (of ${rows.length} Safari Tent published rows)`);

  for (const r of targets) {
    const note = `${NOTE_PREFIX} (P2 generic site_name "${r.site_name}" → Canvas Tent; ${RESEARCH_TAG}).`;
    const patch = {
      unit_type: 'Canvas Tent',
      date_updated: TODAY,
      notes: appendNote(r.notes, note),
    };
    console.log(
      `${DRY_RUN ? 'DRY ' : ''}PATCH id=${r.id} ${r.property_name} | ${r.site_name} | Safari Tent → Canvas Tent`
    );
    if (DRY_RUN) continue;
    const { error } = await supabase.from(TABLE).update(patch).eq('id', r.id);
    if (error) throw new Error(`update id=${r.id}: ${error.message}`);
  }

  console.log(`Done (${targets.length} rows)${DRY_RUN ? ' [dry-run]' : ''}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
