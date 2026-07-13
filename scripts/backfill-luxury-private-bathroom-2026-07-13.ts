#!/usr/bin/env npx tsx
/**
 * Correct unit_private_bathroom for US luxury Amenity Impact rows.
 *
 * Luxury does NOT always mean ensuite — Treebones yurts, Zion Ponderosa tents,
 * Camp Olowalu tentalows/cabins, El Capitan safari/yurt use shared baths.
 * Several No/blank tags were wrong (cabins with ensuite, Onera, etc.).
 *
 * Usage:
 *   npx tsx scripts/backfill-luxury-private-bathroom-2026-07-13.ts --dry-run
 *   npx tsx scripts/backfill-luxury-private-bathroom-2026-07-13.ts
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
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-luxury-bathroom-review');
const DISCOVERY_TAG = 'manual_luxury_private_bathroom_2026_07_13';

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

type YesNo = 'Yes' | 'No';

type Patch = {
  value: YesNo;
  allowOverwrite?: boolean;
  evidence: string;
};

/** Explicit per-id patches (site-level exceptions within a property). */
const BY_ID: Record<number, Patch> = {
  // El Capitan — cedar cabins have ensuite; safari/yurt use bathhouse
  10422: {
    value: 'Yes',
    allowOverwrite: true,
    evidence:
      'El Capitan Canyon cabins — private ensuite bathroom (elcapitancanyon.com). Corrected No→Yes.',
  },
  9561: {
    value: 'Yes',
    evidence:
      'El Capitan Canyon Cedar Cabin — private bathroom in cabin (elcapitancanyon.com).',
  },
  9559: {
    value: 'No',
    evidence:
      'El Capitan Canyon Safari Tent — shared bathroom/shower buildings (site amenity list).',
  },
  9560: {
    value: 'No',
    evidence:
      'El Capitan Canyon Adventure Yurt — bathhouse nearby, not ensuite (elcapitancanyon.com).',
  },

  // Treebones — yurts shared; Autonomous Tents ensuite
  9774: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Treebones yurts — shared heated restrooms at lodge (treebonesresort.com FAQ). Keep No.',
  },
  9773: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Treebones yurts — shared heated restrooms at lodge (treebonesresort.com FAQ). Keep No.',
  },
  9554: {
    value: 'No',
    evidence:
      'Treebones yurt — shared heated restrooms; not ensuite (treebonesresort.com).',
  },
  10312: {
    value: 'No',
    allowOverwrite: true,
    evidence: 'Treebones campsite with hut — shared restrooms (treebonesresort.com).',
  },
  10311: {
    value: 'Yes',
    allowOverwrite: true,
    evidence:
      'Treebones Autonomous Tent — en suite bathroom (treebonesresort.com). Corrected No→Yes.',
  },
  9555: {
    value: 'Yes',
    evidence:
      'Treebones Autonomous Tent — en suite bathroom (treebonesresort.com).',
  },

  // Lakedale Canvas Cottage — ensuite (Canvas Cabins are the shared-bath SKU)
  10302: {
    value: 'Yes',
    allowOverwrite: true,
    evidence:
      'Lakedale Canvas Cottage — private bathroom with shower (lakedale.com). Corrected No→Yes.',
  },

  // Sonoma Zipline treehouses — composting toilet + sink in unit
  9865: {
    value: 'Yes',
    allowOverwrite: true,
    evidence:
      'Sonoma Zipline / Treehouse Adventures — in-unit composting toilet + sink (sonomacounty.com). Corrected No→Yes.',
  },

  // Westgate — Luxury Glamping ensuite; standard Glamping assigned bathhouse
  12059: {
    value: 'Yes',
    allowOverwrite: true,
    evidence:
      'Westgate River Ranch Luxury Glamping — full private bathroom with walk-in shower (westgateresorts.com). Corrected No→Yes.',
  },
  12060: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Westgate standard Glamping — assigned locked bathhouse bathroom, not ensuite on unit.',
  },

  // Camp Olowalu — keep No (semi-private / shared facilities)
  10135: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Camp Olowalu Standard Tentalow — private outdoor shower; toilets shared 1–2 units (campolowalu.com). Keep No.',
  },
  10134: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Camp Olowalu Family Tentalow — private outdoor shower; toilets shared (campolowalu.com). Keep No.',
  },
  10449: {
    value: 'No',
    allowOverwrite: true,
    evidence:
      'Camp Olowalu group cabins — his/hers bathrooms separate from sleeping cabins (campolowalu.com). Keep No.',
  },

  // Zion Ponderosa — glamping tents shared shower house; tiny home ensuite
  10626: {
    value: 'No',
    evidence:
      'Zion Ponderosa glamping tents — shared shower house / restrooms near tents (zionponderosa.com).',
  },
  10075: {
    value: 'Yes',
    evidence:
      'Zion Ponderosa Tiny Home — private bathroom in unit (vacation-home listing).',
  },

  // Alpenglow — shared facilities
  9572: {
    value: 'No',
    evidence:
      'Alpenglow Luxury Camping Glacier View Tent — shared showers/flush toilets common area.',
  },
  9573: {
    value: 'No',
    evidence:
      'Alpenglow Luxury Camping Mountain View Tent — shared showers/flush toilets common area.',
  },
};

/** Property-level fill for remaining blanks (only when blank unless allowOverwrite). */
const BY_PROPERTY: Array<{ match: RegExp; patch: Patch }> = [
  {
    match: /^The Glamping Collective$/i,
    patch: {
      value: 'Yes',
      evidence:
        'The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).',
    },
  },
  {
    match: /^Onera Fredericksburg$/i,
    patch: {
      value: 'Yes',
      evidence:
        'Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).',
    },
  },
  {
    match: /^Borealis Basecamp$/i,
    patch: {
      value: 'Yes',
      evidence:
        'Borealis Basecamp igloos/cubes — en suite full baths (borealisbasecamp.net FAQ).',
    },
  },
  {
    match: /^Orca Island Cabins$/i,
    patch: {
      value: 'Yes',
      evidence:
        'Orca Island Cabins luxury yurts — ensuite private bathroom with hot shower (orcaislandcabins.com).',
    },
  },
  {
    match: /^Rimrock Ranch$/i,
    patch: {
      value: 'Yes',
      evidence: 'Rimrock Ranch Airstream — in-unit private bathroom (luxury Airstream inventory).',
    },
  },
  {
    match: /^The Green O$/i,
    patch: {
      value: 'Yes',
      evidence: 'The Green O — ultra-luxury lodging with private bathrooms.',
    },
  },
  {
    match: /^Treehouse Utopia$/i,
    patch: {
      value: 'Yes',
      evidence: 'Treehouse Utopia — luxury treehouses with private bathrooms.',
    },
  },
  {
    match: /^Lost Horizon$/i,
    patch: {
      value: 'Yes',
      evidence: 'Lost Horizon safari tent — luxury inventory with private bathroom.',
    },
  },
];

type Row = {
  id: number;
  property_name: string | null;
  site_name: string | null;
  unit_private_bathroom: string | null;
  notes: string | null;
  discovery_source: string | null;
};

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

function resolvePatch(id: number, propertyName: string | null): Patch | null {
  if (BY_ID[id]) return BY_ID[id]!;
  const name = propertyName ?? '';
  for (const rule of BY_PROPERTY) {
    if (rule.match.test(name)) return rule.patch;
  }
  return null;
}

async function fetchLuxuryUsRows(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, property_name, site_name, unit_private_bathroom, notes, discovery_source'
      )
      .eq('research_status', 'published')
      .eq('is_glamping_property', 'Yes')
      .eq('property_type', 'Glamping')
      .eq('glamping_service_tier', 'luxury')
      .in('country', ['United States', 'US', 'USA', 'United States of America'])
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const rows = await fetchLuxuryUsRows();
  const sqlLines: string[] = [
    `-- Luxury unit_private_bathroom corrections (${TODAY})`,
    '',
  ];
  const auditPath = join(OUT_DIR, `luxury-private-bathroom-${TODAY}.csv`);
  writeFileSync(
    auditPath,
    'id,property_name,site_name,from,to,evidence\n',
    'utf-8'
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const patch = resolvePatch(row.id, row.property_name);
    if (!patch) {
      skipped += 1;
      continue;
    }

    const current = row.unit_private_bathroom;
    const same =
      !isEmpty(current) &&
      String(current).toLowerCase() === patch.value.toLowerCase();
    if (same) {
      skipped += 1;
      continue;
    }
    if (!isEmpty(current) && !patch.allowOverwrite) {
      skipped += 1;
      continue;
    }

    const noteLine = `[${TODAY}] unit_private_bathroom: ${current ?? 'null'}→${patch.value}. ${patch.evidence}`;
    const dbPatch = {
      unit_private_bathroom: patch.value,
      date_updated: TODAY,
      discovery_source: mergeDiscovery(row.discovery_source, DISCOVERY_TAG),
      notes: appendNote(row.notes, noteLine),
    };

    console.log(
      `UPDATE id=${row.id} ${row.property_name} / ${row.site_name}: ${current ?? 'null'}→${patch.value}`
    );
    appendFileSync(
      auditPath,
      `${row.id},${JSON.stringify(row.property_name)},${JSON.stringify(row.site_name)},${JSON.stringify(current)},${patch.value},${JSON.stringify(patch.evidence)}\n`
    );

    sqlLines.push(
      `UPDATE public.${TABLE} SET\n` +
        `  unit_private_bathroom = '${patch.value}',\n` +
        `  date_updated = '${TODAY}',\n` +
        `  discovery_source = '${String(dbPatch.discovery_source).replace(/'/g, "''")}',\n` +
        `  notes = COALESCE(notes, '') || E'\\n\\n${noteLine.replace(/'/g, "''")}'\n` +
        `WHERE id = ${row.id};\n`
    );

    if (!DRY_RUN) {
      const { error } = await supabase.from(TABLE).update(dbPatch).eq('id', row.id);
      if (error) throw new Error(`Update ${row.id}: ${error.message}`);
    }
    updated += 1;
  }

  const mig = join(
    process.cwd(),
    'scripts/migrations/backfill-luxury-private-bathroom-2026-07-13.sql'
  );
  writeFileSync(mig, sqlLines.join('\n') + '\n', 'utf-8');
  console.log(`\nSummary: rows updated=${updated}, skipped=${skipped}`);
  console.log(`Migration: ${mig}`);
  console.log(`Audit: ${auditPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
