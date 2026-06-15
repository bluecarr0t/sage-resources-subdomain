#!/usr/bin/env npx tsx
/**
 * Backfill Under Construction glamping properties with researched unit counts,
 * projected/published rates, and metadata corrections (2026-06-15 UC research).
 *
 * Usage:
 *   npx tsx scripts/apply-uc-units-rates-research-2026-06-15.ts
 *   npx tsx scripts/apply-uc-units-rates-research-2026-06-15.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const RESEARCH_TAG = 'uc_units_rates_research_2026_06_15';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type RatePatch = {
  rate_avg_retail_daily_rate?: number | null;
  rate_summer_weekday?: number | null;
  rate_summer_weekend?: number | null;
};

type PropertyPatch = {
  property_name: string;
  state?: string;
  quantity_of_units?: number | null;
  property_total_sites?: number | null;
  url?: string | null;
  description?: string | null;
  note?: string;
  rates?: RatePatch;
  /** When true, set qty only on lowest-id row; clear qty on sibling rows. */
  primaryRowUnitsOnly?: boolean;
  /** Override site count for primary-row-only multi-SKU properties. */
  primaryRowQuantity?: number;
};

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

function researchNote(detail: string): string {
  return `${RESEARCH_TAG}: ${detail}`;
}

const PROPERTY_PATCHES: PropertyPatch[] = [
  {
    property_name: 'Under Canvas White Mountains',
    state: 'NH',
    quantity_of_units: 45,
    property_total_sites: 45,
    note: researchNote(
      '45 safari tents (Under Canvas press/booking, Jun 2026). Published rates ~$251–$296+/night seasonal.'
    ),
    rates: {
      rate_summer_weekday: 251,
      rate_summer_weekend: 296,
    },
  },
  {
    property_name: 'AutoCamp Hill Country',
    state: 'TX',
    quantity_of_units: 120,
    property_total_sites: 120,
    url: 'https://autocamp.com/location/hill-country/',
    description:
      'AutoCamp Hill Country is a 120-unit glamping resort under development in Fredericksburg, Texas Hill Country (7041 N State Hwy 16). Planned inventory: 75 Airstream suites, 15 X Suites, 20 BaseCamp tents, and 10 Mini suites—the largest AutoCamp property to date. Target opening Q2 2026; will join Hilton AutoCamp Stays when operational.',
    note: researchNote(
      '120 units per AutoCamp/Teneo expansion materials (75 Airstream + 15 X Suite + 20 BaseCamp + 10 Mini). URL corrected from luckyarrowretreat.com.'
    ),
  },
  {
    property_name: 'Talaz',
    state: 'NV',
    quantity_of_units: 53,
    property_total_sites: 53,
    note: researchNote('53 canvas tents per developer materials / TRPA filing (Stateline, NV).'),
  },
  {
    property_name: 'Contentment on Beaver Lake',
    state: 'AR',
    quantity_of_units: 52,
    property_total_sites: 52,
    note: researchNote(
      '52 glamping units per Benton County approved site plan: 40 upscale tents + 12 covered wagons.'
    ),
  },
  {
    property_name: 'Wildhaven Lake Berryessa',
    state: 'CA',
    quantity_of_units: 60,
    property_total_sites: 60,
    note: researchNote(
      '60 glamping tents per Napa County Spanish Flat negotiation materials (May 2026); prior DB count of 40 corrected. Master plan also includes 40 cabins.'
    ),
  },
  {
    property_name: 'Entrada Moab',
    state: 'UT',
    quantity_of_units: 16,
    property_total_sites: 16,
    note: researchNote(
      '16 luxury tent sites per Grand County OAO approval. Developer projects ~$2,000 ADR (not published booking rates).'
    ),
    rates: {
      rate_avg_retail_daily_rate: 2000,
    },
  },
  {
    property_name: 'Eastwind Lushna Nature Retreat',
    state: 'NY',
    property_total_sites: 26,
    note: researchNote('26 Lushna cabins. Published booking range ~$159–$353/night (Eastwind/OTA, Jun 2026).'),
    rates: {
      rate_summer_weekday: 159,
      rate_summer_weekend: 353,
      rate_avg_retail_daily_rate: 256,
    },
  },
  {
    property_name: 'Highwood Retreat',
    state: 'VT',
    quantity_of_units: 3,
    note: researchNote('3 safari tents (Highwood Retreat ResNexus). Published from ~$195/night.'),
    rates: {
      rate_avg_retail_daily_rate: 195,
    },
  },
  {
    property_name: 'Echo Valley Micro-Resort',
    state: 'VA',
    primaryRowUnitsOnly: true,
    primaryRowQuantity: 15,
    note: researchNote('15 geodesic dome micro-units per operator site (pipeline_research).'),
  },
  {
    property_name: 'Riverbend Glamping Getaway',
    state: 'MT',
    property_total_sites: 58,
    note: researchNote('~58 glamping units per operator/marketing materials.'),
  },
  // Firecrawl follow-up (2026-06-15) — remaining UC gaps
  {
    property_name: 'Pilot Mountain Glamping Resort',
    state: 'NC',
    note: researchNote(
      '5 European Fdomes (operator site). Early-bird promo $300/2 nights (~$150/night); published range not fully live pre-open.'
    ),
    rates: {
      rate_summer_weekday: 150,
      rate_summer_weekend: 400,
      rate_avg_retail_daily_rate: 275,
    },
  },
  {
    property_name: 'Dwell RV Resort & Casita Cabins',
    state: 'AZ',
    quantity_of_units: 20,
    property_total_sites: 20,
    note: researchNote(
      '20 Casita Cabins (park-model glamping) per Modern Campground interview with Dwell Outdoor Hospitality (Apr 2026); 164 RV sites separate.'
    ),
  },
  {
    property_name: 'Camp Ferncrest - Ocoee',
    state: 'TN',
    quantity_of_units: 9,
    property_total_sites: 12,
    note: researchNote(
      '9 geodesic domes + 3 modern cabins per founders.findingpromisedland.com/ocoee (Jun 2026 Firecrawl). Glamping row counts domes only.'
    ),
    rates: {
      rate_summer_weekday: 200,
      rate_summer_weekend: 400,
      rate_avg_retail_daily_rate: 300,
    },
  },
  {
    property_name: 'Camp Ferncrest - Bryson City',
    state: 'NC',
    note: researchNote(
      'Founder page cites ~$200–$400+/night typical range; dome count not published yet (Jun 2026 Firecrawl).'
    ),
    rates: {
      rate_summer_weekday: 200,
      rate_summer_weekend: 400,
      rate_avg_retail_daily_rate: 300,
    },
  },
  {
    property_name: 'Treasure Bay Resort',
    state: 'OR',
    quantity_of_units: 8,
    property_total_sites: 8,
    note: researchNote(
      '8 geodesic glamping domes per Waldport/Yachats community press + exploretreasurebay.com (Jun 2026 Firecrawl).'
    ),
  },
];

const TIMBERLINE_PA_SITES: Record<string, number> = {
  'Timberline Glamping at French Creek': 9,
  'Timberline Glamping at Codorus': 8,
  'Timberline Glamping at Hickory Run': 8,
  'Timberline Glamping at Hills Creek': 8,
  'Timberline Glamping at Laurel Hill': 8,
  'Timberline Glamping at Promised Land': 8,
  'Timberline Glamping at Pymatuning': 8,
};

const TIMBERLINE_NOTE = researchNote(
  'PA DCNR/Timberline: 61 glamping sites across eight parks (spring 2026); per-park counts estimated ~8–9 tents. Published ~$185/night (CBS Pittsburgh, Oct 2025).'
);

function buildRowPatch(
  spec: PropertyPatch,
  row: { id: number; notes: string | null },
  opts: { isPrimary: boolean; quantity: number | null | undefined }
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    date_updated: TODAY,
  };

  if (opts.quantity !== undefined) {
    patch.quantity_of_units = opts.quantity != null ? String(opts.quantity) : null;
  } else if (spec.quantity_of_units !== undefined) {
    patch.quantity_of_units =
      spec.quantity_of_units != null ? String(spec.quantity_of_units) : null;
  }

  if (spec.property_total_sites !== undefined) {
    patch.property_total_sites =
      spec.property_total_sites != null ? String(spec.property_total_sites) : null;
  }

  if (spec.url !== undefined) patch.url = spec.url;
  if (spec.description !== undefined) patch.description = spec.description;

  if (spec.note) {
    patch.notes = appendNote(row.notes, spec.note);
  }

  if (spec.rates) {
    const { rates } = spec;
    if (rates.rate_avg_retail_daily_rate !== undefined) {
      patch.rate_avg_retail_daily_rate =
        rates.rate_avg_retail_daily_rate != null
          ? String(rates.rate_avg_retail_daily_rate)
          : null;
    }
    if (rates.rate_summer_weekday !== undefined) {
      patch.rate_summer_weekday =
        rates.rate_summer_weekday != null ? String(rates.rate_summer_weekday) : null;
    }
    if (rates.rate_summer_weekend !== undefined) {
      patch.rate_summer_weekend =
        rates.rate_summer_weekend != null ? String(rates.rate_summer_weekend) : null;
    }
  }

  return patch;
}

async function applyPropertyPatch(spec: PropertyPatch): Promise<void> {
  let query = supabase
    .from(TABLE)
    .select('id,property_name,notes,quantity_of_units,property_total_sites,url,description,rate_avg_retail_daily_rate')
    .eq('property_name', spec.property_name)
    .eq('is_open', 'Under Construction');

  if (spec.state) query = query.eq('state', spec.state);

  const { data: rows, error } = await query.order('id');
  if (error) throw new Error(`${spec.property_name}: ${error.message}`);
  if (!rows?.length) {
    console.log(`SKIP ${spec.property_name} — no UC rows`);
    return;
  }

  const primaryId = rows[0]!.id;

  for (const row of rows) {
    const isPrimary = row.id === primaryId;
    let quantity: number | null | undefined;

    if (spec.primaryRowUnitsOnly) {
      quantity = isPrimary ? (spec.primaryRowQuantity ?? null) : null;
    } else if (spec.quantity_of_units !== undefined) {
      quantity = spec.quantity_of_units;
    }

    const patch = buildRowPatch(spec, row, {
      isPrimary,
      quantity,
    });

    const unchanged =
      (patch.quantity_of_units === undefined ||
        String(row.quantity_of_units ?? '') === String(patch.quantity_of_units ?? '')) &&
      (spec.url === undefined || row.url === spec.url) &&
      (spec.description === undefined || row.description === spec.description);

    if (unchanged && !spec.rates && !spec.note) {
      continue;
    }

    console.log(
      `PATCH ${spec.property_name} id=${row.id}${isPrimary ? ' (primary)' : ''}`,
      JSON.stringify(patch)
    );

    if (DRY_RUN) continue;

    const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (updateError) throw new Error(`Update ${spec.property_name} id=${row.id}: ${updateError.message}`);
  }
}

async function applyTimberlinePaUnits(): Promise<void> {
  console.log('\n=== Timberline PA unit counts & rates ===');

  for (const [property_name, siteCount] of Object.entries(TIMBERLINE_PA_SITES)) {
    const { data: rows, error } = await supabase
      .from(TABLE)
      .select('id,notes,quantity_of_units,rate_avg_retail_daily_rate')
      .eq('property_name', property_name)
      .eq('state', 'PA')
      .order('id');

    if (error) throw new Error(`${property_name}: ${error.message}`);
    if (!rows?.length) {
      console.log(`SKIP ${property_name} — no rows`);
      continue;
    }

    const primaryId = rows[0]!.id;

    for (const row of rows) {
      const isPrimary = row.id === primaryId;
      const patch: Record<string, unknown> = {
        date_updated: TODAY,
        quantity_of_units: isPrimary ? String(siteCount) : null,
        notes: appendNote(row.notes, TIMBERLINE_NOTE),
        rate_avg_retail_daily_rate: '185',
      };

      console.log(`PATCH ${property_name} id=${row.id}`, JSON.stringify(patch));
      if (DRY_RUN) continue;

      const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
      if (updateError) throw new Error(`Update ${property_name}: ${updateError.message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`UC units/rates backfill${DRY_RUN ? ' (DRY RUN)' : ''}`);

  console.log('\n=== Property patches ===');
  for (const spec of PROPERTY_PATCHES) {
    await applyPropertyPatch(spec);
  }

  await applyTimberlinePaUnits();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
