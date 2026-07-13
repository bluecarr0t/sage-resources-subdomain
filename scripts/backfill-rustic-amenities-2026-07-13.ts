#!/usr/bin/env npx tsx
/**
 * Backfill Amenity Impact fields for US rustic (Essential) glamping rows.
 * Fields: unit_private_bathroom, property_hot_tub, property_food_on_site, property_restaurant.
 *
 * Usage:
 *   npx tsx scripts/backfill-rustic-amenities-2026-07-13.ts --dry-run
 *   npx tsx scripts/backfill-rustic-amenities-2026-07-13.ts
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
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-rustic-amenity-review');
const DISCOVERY_TAG = 'manual_rustic_amenities_2026_07_13';

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

type AmenityPatch = {
  unit_private_bathroom?: YesNo;
  property_hot_tub?: YesNo;
  property_food_on_site?: YesNo;
  property_restaurant?: YesNo;
  allowOverwrite?: boolean;
  evidence: string;
};

/** Per-row overrides (checked before property-name rules). */
const BY_ID: Record<number, AmenityPatch> = {
  // Tarantula Bottling Room — private ensuite (Travel Nevada / Booking)
  12089: {
    unit_private_bathroom: 'Yes',
    property_hot_tub: 'No',
    property_food_on_site: 'Yes',
    property_restaurant: 'No',
    evidence:
      'Tarantula Ranch Bottling Room — private bathroom; shared bathhouse for other sites; mini-mart food, no restaurant.',
  },
  // Shady Dell — Dot's Diner is an on-site restaurant (correct prior restaurant No)
  164: {
    unit_private_bathroom: 'Yes',
    property_restaurant: 'Yes',
    allowOverwrite: true,
    evidence:
      'Shady Dell — trailers have private toilet/sink (FAQ); Dot’s Diner on-site restaurant + food. Correct restaurant No→Yes.',
  },
  // Doe Bay yurt — bathhouse; Doe Bay Café
  9584: {
    unit_private_bathroom: 'No',
    property_food_on_site: 'Yes',
    property_restaurant: 'Yes',
    evidence:
      'Doe Bay yurt — no water in yurt; bathhouse walk; Doe Bay Café (seed-to-table) on site.',
  },
};

/** Property-name prefix / exact rules applied to remaining blank fields. */
const BY_PROPERTY: Array<{ match: RegExp; patch: AmenityPatch }> = [
  {
    match: /^Wander Camp/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Wander Camp brand — shared bathroom facilities with flushing toilets/showers; no private bath, hot tub, or restaurant (thewandercamp.com).',
    },
  },
  {
    match: /^Timberline Glamping/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Timberline Glamping FAQ — bathhouse short walk; guests bring own food; no restaurant (timberlineglamping.com).',
    },
  },
  {
    match: /^Tarantula Ranch$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'Yes',
      property_restaurant: 'No',
      evidence:
        'Tarantula Ranch glamping/tent/RV sites — shared bathhouse/outdoor shower; mini-mart/camp store food; no restaurant.',
    },
  },
  {
    match: /^Paddler's Village$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'Yes',
      property_restaurant: 'No',
      evidence:
        'Paddler’s Village standard yurt/safari/platform — community restrooms/showers; campground store; Duck Pond dining nearby not on-property restaurant.',
    },
  },
  {
    match: /^Boonies Farm$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Boonies Farm domes — private/shared washrooms on premises (not clear ensuite); private unit hot tubs (not property spa); brewery/pizza coming soon.',
    },
  },
  {
    match: /^Bristol Cabins$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Bristol Cabins — no property hot tub listed; food already Yes.',
    },
  },
  {
    match: /^Gorgeous Stays$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Gorgeous Stays — no property hot tub evidence; food already Yes.',
    },
  },
  {
    match: /^Hub North$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Hub North — no property hot tub; food/restaurant already No.',
    },
  },
  {
    match: /^Tobacco River Ranch/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Tobacco River Ranch — no property hot tub; food/restaurant already No.',
    },
  },
  {
    match: /^Son's Guadalupe$/i,
    patch: {
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence: 'Son’s Guadalupe — rustic tents; no on-site food/restaurant/hot tub evidence.',
    },
  },
  {
    match: /^Bear Den Cabins/i,
    patch: {
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence: 'Bear Den — shared-bath signal; no food/restaurant/hot tub evidence.',
    },
  },
  {
    match: /^Ouachita Wilde$/i,
    patch: {
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence: 'Ouachita Wilde — shared bath already No; no food/restaurant/hot tub evidence.',
    },
  },
  {
    match: /^The Arrowhead Tipi Resort$/i,
    patch: {
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence: 'Arrowhead Tipi — private bath already No; no food/restaurant/hot tub evidence.',
    },
  },
  {
    match: /^Mariaville Goat Farm$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Mariaville Goat Farm — no property hot tub; food already Yes.',
    },
  },
  {
    match: /^Lawson Adventure Park$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Lawson Adventure Park — no property hot tub; food/restaurant already Yes.',
    },
  },
  {
    match: /^Natural Gathering Grounds$/i,
    patch: {
      property_hot_tub: 'No',
      evidence: 'Natural Gathering Grounds — no property hot tub evidence.',
    },
  },
  {
    match: /^Falling Waters Adventure Resort$/i,
    patch: {
      unit_private_bathroom: 'No',
      evidence: 'Falling Waters yurts — rustic shared-facility positioning; food/restaurant already No.',
    },
  },
  {
    match: /^The Yurt Village at Frost Mountain$/i,
    patch: {
      unit_private_bathroom: 'No',
      evidence: 'Frost Mountain yurt village — rustic shared-bath inventory; food/restaurant already No.',
    },
  },
  {
    match: /^Treehouse Resort at River Road$/i,
    patch: {
      unit_private_bathroom: 'No',
      evidence: 'Treehouse Resort River Road — rustic tier; food/restaurant already No.',
    },
  },
  {
    match: /^Silver Bullet Retreats$/i,
    patch: {
      unit_private_bathroom: 'Yes',
      evidence:
        'Silver Bullet Airstream retreats — vintage trailers with in-unit bathrooms (typical Airstream plumbing).',
    },
  },
  {
    match: /^The Shady Dell$/i,
    patch: {
      unit_private_bathroom: 'Yes',
      property_restaurant: 'Yes',
      allowOverwrite: true,
      evidence:
        'Shady Dell — private toilet/sink in trailers; Dot’s Diner on-site restaurant.',
    },
  },
  {
    match: /^Downata Hot Springs$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_food_on_site: 'Yes',
      property_restaurant: 'Yes',
      evidence:
        'Downata Conestoga wagons — no inside bathroom; poolside restaurant & snack bar on site (downatahotsprings.com / Top Hot Springs).',
    },
  },
  {
    match: /^Pitch Yellowstone$/i,
    patch: {
      unit_private_bathroom: 'Yes',
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Pitch Yellowstone domes — large private modern bathroom + kitchenette; no on-site restaurant/hot tub (pitchyellowstone.com).',
    },
  },
  {
    match: /^Wolfe's Neck Oceanfront Camping/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'Yes',
      property_restaurant: 'No',
      evidence:
        'Wolfe’s Neck cabins — community shower houses / outhouses; onsite farm store food; no restaurant (freeportcamping.com).',
    },
  },
  {
    match: /^Sou'wester Lodge$/i,
    patch: {
      property_food_on_site: 'Yes',
      property_restaurant: 'No',
      evidence:
        'Sou’wester — Front Porch Market snacks/provisions; no full-service restaurant (souwesterlodge.com). Bath mixed across trailers — left blank.',
    },
  },
  {
    match: /^Arcady Ridge Ranch$/i,
    patch: {
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Arcady Ridge canvas tents — no on-site restaurant/food service evidence; property hot tub already Yes (lodge swim spa). Bath left blank (running water / facilities unclear for tent SKU).',
    },
  },
  {
    match: /^Arizona Nordic Village$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_food_on_site: 'No',
      property_restaurant: 'No',
      evidence:
        'Arizona Nordic Village yurts — typical shared bathhouse rustic inventory; no restaurant/hot tub evidence.',
    },
  },
  {
    match: /^Turner Falls Park$/i,
    patch: {
      unit_private_bathroom: 'No',
      property_hot_tub: 'No',
      property_restaurant: 'No',
      evidence:
        'Turner Falls Park covered wagons — shared park bathhouses; no restaurant. Food left blank pending concession confirmation.',
    },
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

function resolvePatch(
  id: number,
  propertyName: string | null
): AmenityPatch | null {
  if (BY_ID[id]) return BY_ID[id]!;
  const name = propertyName ?? '';
  for (const rule of BY_PROPERTY) {
    if (rule.match.test(name)) return rule.patch;
  }
  return null;
}

type Row = {
  id: number;
  property_name: string | null;
  site_name: string | null;
  unit_private_bathroom: string | null;
  property_hot_tub: string | null;
  property_food_on_site: string | null;
  property_restaurant: string | null;
  notes: string | null;
  discovery_source: string | null;
};

async function fetchRusticBlankRows(): Promise<Row[]> {
  const PAGE = 1000;
  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'id, property_name, site_name, unit_private_bathroom, property_hot_tub, property_food_on_site, property_restaurant, notes, discovery_source, quantity_of_units, rate_avg_retail_daily_rate, is_open, country, research_status, property_type, is_glamping_property, glamping_service_tier, land_operator_category, rate_basis'
      )
      .eq('research_status', 'published')
      .eq('is_glamping_property', 'Yes')
      .eq('property_type', 'Glamping')
      .eq('glamping_service_tier', 'rustic')
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

  const rows = await fetchRusticBlankRows();
  const sqlLines: string[] = [
    `-- Rustic amenity backfill (${TODAY})`,
    `-- unit_private_bathroom / property_hot_tub / property_food_on_site / property_restaurant`,
    '',
  ];
  const auditPath = join(OUT_DIR, `rustic-amenities-${TODAY}.csv`);
  writeFileSync(
    auditPath,
    'id,property_name,site_name,field,from,to,evidence\n',
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

    const fields: Array<keyof AmenityPatch> = [
      'unit_private_bathroom',
      'property_hot_tub',
      'property_food_on_site',
      'property_restaurant',
    ];
    const dbPatch: Record<string, unknown> = {};
    const changed: string[] = [];

    for (const field of fields) {
      const next = patch[field];
      if (next !== 'Yes' && next !== 'No') continue;
      const current = row[field as keyof Row] as string | null;
      if (!isEmpty(current) && !patch.allowOverwrite) continue;
      if (
        !isEmpty(current) &&
        patch.allowOverwrite &&
        String(current).toLowerCase() === next.toLowerCase()
      ) {
        continue;
      }
      if (!isEmpty(current) && !patch.allowOverwrite) continue;
      dbPatch[field] = next;
      changed.push(`${field}:${current ?? 'null'}→${next}`);
      appendFileSync(
        auditPath,
        `${row.id},${JSON.stringify(row.property_name)},${JSON.stringify(row.site_name)},${field},${JSON.stringify(current)},${next},${JSON.stringify(patch.evidence)}\n`
      );
    }

    if (changed.length === 0) {
      skipped += 1;
      continue;
    }

    dbPatch.date_updated = TODAY;
    dbPatch.discovery_source = mergeDiscovery(row.discovery_source, DISCOVERY_TAG);
    const noteLine = `[${TODAY}] Rustic amenities: ${changed.join('; ')}. ${patch.evidence}`;
    dbPatch.notes = appendNote(row.notes, noteLine);

    console.log(
      `UPDATE id=${row.id} ${row.property_name} / ${row.site_name}: ${changed.join(', ')}`
    );

    const setParts = Object.entries(dbPatch)
      .filter(([k]) => k !== 'notes' && k !== 'discovery_source')
      .map(([k, v]) => `  ${k} = '${String(v).replace(/'/g, "''")}'`);
    setParts.push(
      `  discovery_source = '${String(dbPatch.discovery_source).replace(/'/g, "''")}'`
    );
    setParts.push(
      `  notes = COALESCE(notes, '') || E'\\n\\n${noteLine.replace(/'/g, "''")}'`
    );
    sqlLines.push(
      `UPDATE public.${TABLE} SET\n${setParts.join(',\n')}\nWHERE id = ${row.id};\n`
    );

    if (!DRY_RUN) {
      const { error } = await supabase.from(TABLE).update(dbPatch).eq('id', row.id);
      if (error) throw new Error(`Update ${row.id}: ${error.message}`);
    }
    updated += 1;
  }

  const mig = join(
    process.cwd(),
    'scripts/migrations/backfill-rustic-amenities-2026-07-13.sql'
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
