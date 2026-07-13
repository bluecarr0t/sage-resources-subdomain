#!/usr/bin/env npx tsx
/**
 * Light cleanup after Mirror Cabin Phases 1–3 (2026-07-13):
 *   1) Delete Two Capes duplicate Mirror Cabin row (9565 → keep 10326)
 *   2) Annotate Glamping Collective Glass Cabin rows: keep unit_type Cabin
 *   3) Enrich Cameron Ranch Coldspring + SkyEagle Ridge street/geo
 *
 * Usage:
 *   npx tsx scripts/cleanup-mirror-cabin-light-2026-07-13.ts --dry-run
 *   npx tsx scripts/cleanup-mirror-cabin-light-2026-07-13.ts
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { geocodeAddress } from '@/lib/geocode';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
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

function appendNote(prev: string | null | undefined, note: string): string {
  const p = String(prev ?? '').trim();
  return p ? `${p}\n${note}` : note;
}

async function repointReportAnchors(fromId: number, toId: number): Promise<void> {
  const { error } = await supabase
    .schema('reports')
    .from('reports')
    .update({ sage_data_anchor_id: toId })
    .eq('sage_data_anchor_id', fromId);
  if (error && !error.message.includes('schema') && error.code !== 'PGRST106') {
    throw error;
  }
}

async function repointOrDrop(
  table: 'property_geocode' | 'property_embeddings',
  fromId: number,
  toId: number
): Promise<void> {
  const { data: keeperRow } = await supabase
    .from(table)
    .select('property_id')
    .eq('property_id', toId)
    .maybeSingle();
  const { data: loserRow } = await supabase
    .from(table)
    .select('property_id')
    .eq('property_id', fromId)
    .maybeSingle();
  if (!loserRow) return;
  if (keeperRow) {
    await supabase.from(table).delete().eq('property_id', fromId);
    return;
  }
  const { error } = await supabase
    .from(table)
    .update({ property_id: toId })
    .eq('property_id', fromId);
  if (error) throw error;
}

async function repointImages(fromId: number, toId: number): Promise<void> {
  const { error } = await supabase
    .from('glamping_property_images')
    .update({ property_id: toId })
    .eq('property_id', fromId);
  if (error) throw error;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  const sql: string[] = [`-- Light Mirror Cabin cleanup (${TODAY})`, ''];

  // --- 1) Two Capes duplicate ---
  console.log('1) Two Capes duplicate Mirror Cabin rows');
  console.log('-'.repeat(60));
  const LOSER = 9565;
  const KEEPER = 10326;
  const { data: loser } = await supabase
    .from(TABLE)
    .select('id, site_name, unit_type, quantity_of_units, notes')
    .eq('id', LOSER)
    .maybeSingle();
  const { data: keeper } = await supabase
    .from(TABLE)
    .select('id, site_name, unit_type, quantity_of_units, notes')
    .eq('id', KEEPER)
    .maybeSingle();

  if (!loser) {
    console.log(`SKIP delete id=${LOSER} — already gone`);
  } else if (!keeper) {
    console.log(`ERROR keeper id=${KEEPER} missing — abort delete`);
    process.exit(1);
  } else {
    console.log(
      `DELETE id=${LOSER} (${loser.site_name}, qty=${loser.quantity_of_units}) — duplicate of id=${KEEPER} (${keeper.site_name})`
    );
    console.log(
      '  Evidence: property markets four Mirror Cabins total (1859 / Woodalls / Hipcamp South Cape); both Sage rows qty=4.'
    );
    const keepNote = `[${TODAY}] Light cleanup: deleted duplicate Mirror Cabin row id ${LOSER} (generic site_name Mirror Cabin). Kept South Cape Mirror Cabin as sole Mirror Cabin SKU (qty 4).`;
    sql.push(
      `-- Two Capes: delete duplicate id ${LOSER}, keep ${KEEPER}`,
      `DELETE FROM public.${TABLE} WHERE id = ${LOSER};`,
      `UPDATE public.${TABLE} SET notes = COALESCE(notes || E'\\n', '') || '${keepNote.replace(/'/g, "''")}', date_updated = '${TODAY}' WHERE id = ${KEEPER};`,
      ''
    );
    if (!DRY_RUN) {
      await repointReportAnchors(LOSER, KEEPER);
      await repointImages(LOSER, KEEPER);
      await repointOrDrop('property_geocode', LOSER, KEEPER);
      await repointOrDrop('property_embeddings', LOSER, KEEPER);
      const { error: delErr } = await supabase.from(TABLE).delete().eq('id', LOSER);
      if (delErr) throw new Error(`Delete ${LOSER}: ${delErr.message}`);
      const { error: upErr } = await supabase
        .from(TABLE)
        .update({
          notes: appendNote(keeper.notes as string | null, keepNote),
          date_updated: TODAY,
        })
        .eq('id', KEEPER);
      if (upErr) throw new Error(`Update ${KEEPER}: ${upErr.message}`);
    }
  }

  // --- 2) Collective Glass Cabin decision ---
  console.log('\n2) Glamping Collective Glass Cabin — keep Cabin');
  console.log('-'.repeat(60));
  const COLLECTIVE_IDS = [10490, 10491, 11600];
  const collectiveNote = `[${TODAY}] Light cleanup: leave unit_type Cabin. Site markets view-glass wall cabins (8×16 / 16-ft glass), not mirrored cladding / ÖÖD. Do not map to Mirror Cabin.`;
  for (const id of COLLECTIVE_IDS) {
    const { data: row } = await supabase
      .from(TABLE)
      .select('id, site_name, unit_type, notes')
      .eq('id', id)
      .maybeSingle();
    if (!row) {
      console.log(`SKIP id=${id} — missing`);
      continue;
    }
    if (String(row.notes ?? '').includes('leave unit_type Cabin')) {
      console.log(`SKIP id=${id} ${row.site_name} — decision note already present`);
      continue;
    }
    console.log(`ANNOTATE id=${id} ${row.site_name} (unit_type=${row.unit_type})`);
    sql.push(
      `UPDATE public.${TABLE} SET notes = COALESCE(notes || E'\\n', '') || '${collectiveNote.replace(/'/g, "''")}', date_updated = '${TODAY}' WHERE id = ${id};`
    );
    if (!DRY_RUN) {
      const { error } = await supabase
        .from(TABLE)
        .update({
          notes: appendNote(row.notes as string | null, collectiveNote),
          date_updated: TODAY,
        })
        .eq('id', id);
      if (error) throw new Error(`Annotate ${id}: ${error.message}`);
    }
  }

  // --- 3) Geo enrichment ---
  console.log('\n3) Enrich Coldspring + SkyEagle street/geo');
  console.log('-'.repeat(60));

  const coldspringGeo = await geocodeAddress(
    '360 England Ln',
    'Coldspring',
    'TX',
    '77331'
  );
  if (!coldspringGeo) throw new Error('Geocode failed for Cameron Ranch Coldspring');
  console.log(
    `Coldspring id=13089 → lat=${coldspringGeo.lat}, lon=${coldspringGeo.lng} (address already set)`
  );
  const coldNote = `[${TODAY}] Light cleanup: geocoded 360 England Ln, Coldspring TX 77331 → ${coldspringGeo.lat}, ${coldspringGeo.lng}.`;
  sql.push(
    `UPDATE public.${TABLE} SET lat = ${coldspringGeo.lat}, lon = ${coldspringGeo.lng}, date_updated = '${TODAY}', notes = COALESCE(notes || E'\\n', '') || '${coldNote.replace(/'/g, "''")}' WHERE id = 13089;`
  );
  if (!DRY_RUN) {
    const { data: cold } = await supabase
      .from(TABLE)
      .select('notes')
      .eq('id', 13089)
      .maybeSingle();
    const { error } = await supabase
      .from(TABLE)
      .update({
        lat: coldspringGeo.lat,
        lon: coldspringGeo.lng,
        date_updated: TODAY,
        notes: appendNote(cold?.notes as string | null, coldNote),
      })
      .eq('id', 13089);
    if (error) throw new Error(`Update 13089: ${error.message}`);
  }

  const skyGeo = await geocodeAddress(
    '44 Roden Mill Road',
    'Conway',
    'AR',
    '72032'
  );
  if (!skyGeo) throw new Error('Geocode failed for SkyEagle Ridge');
  console.log(
    `SkyEagle id=13096 → 44 Roden Mill Road, Conway AR 72032; lat=${skyGeo.lat}, lon=${skyGeo.lng}`
  );
  const skyNote = `[${TODAY}] Light cleanup: set address 44 Roden Mill Road, Conway AR 72032; geocoded → ${skyGeo.lat}, ${skyGeo.lng}.`;
  sql.push(
    `UPDATE public.${TABLE} SET address = '44 Roden Mill Road', zip_code = '72032', lat = ${skyGeo.lat}, lon = ${skyGeo.lng}, date_updated = '${TODAY}', notes = COALESCE(notes || E'\\n', '') || '${skyNote.replace(/'/g, "''")}' WHERE id = 13096;`
  );
  if (!DRY_RUN) {
    const { data: sky } = await supabase
      .from(TABLE)
      .select('notes')
      .eq('id', 13096)
      .maybeSingle();
    const { error } = await supabase
      .from(TABLE)
      .update({
        address: '44 Roden Mill Road',
        zip_code: '72032',
        lat: skyGeo.lat,
        lon: skyGeo.lng,
        date_updated: TODAY,
        notes: appendNote(sky?.notes as string | null, skyNote),
      })
      .eq('id', 13096);
    if (error) throw new Error(`Update 13096: ${error.message}`);
  }

  const sqlPath = join(OUT_DIR, `light-cleanup-mirror-cabin-${TODAY}.sql`);
  writeFileSync(sqlPath, sql.join('\n') + '\n', 'utf-8');

  const reportPath = join(OUT_DIR, `LIGHT_CLEANUP-${TODAY}.md`);
  writeFileSync(
    reportPath,
    [
      `# Light cleanup — Mirror Cabin (${TODAY})`,
      '',
      `Mode: **${DRY_RUN ? 'dry-run' : 'live'}**`,
      '',
      '## 1. Two Capes duplicate',
      '',
      '- Property has **four** Mirror Cabins total (not eight).',
      `- Deleted id **9565** (\`Mirror Cabin\` qty 4) as duplicate of id **10326** (\`South Cape Mirror Cabin\` qty 4).`,
      '',
      '## 2. Glamping Collective Glass Cabin',
      '',
      '- **Decision: keep `unit_type = Cabin`** on ids 10490, 10491, 11600.',
      '- View-glass wall product, not mirrored cladding / ÖÖD.',
      '',
      '## 3. Street / geo enrichment',
      '',
      `| id | Property | Address | lat | lon |`,
      `|----|----------|---------|-----|-----|`,
      `| 13089 | Cameron Ranch Coldspring | 360 England Ln (existing) | ${coldspringGeo.lat} | ${coldspringGeo.lng} |`,
      `| 13096 | SkyEagle Ridge | 44 Roden Mill Road, Conway AR 72032 | ${skyGeo.lat} | ${skyGeo.lng} |`,
      '',
      `SQL: \`${sqlPath}\``,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(`\nSQL: ${sqlPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
