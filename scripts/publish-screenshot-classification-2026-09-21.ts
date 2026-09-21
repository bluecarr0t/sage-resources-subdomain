#!/usr/bin/env npx tsx
/**
 * Property-type and site rows for the 21 Sep 2026 in-progress screenshot.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '../lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATED = '2026-09-21';
const SOURCE = 'web_research_screenshot_classification_2026_09_21';

const NO_RATE = {
  rate_avg_retail_daily_rate: null,
  rate_summer_weekday: null,
  rate_summer_weekend: null,
  rate_fall_weekday: null,
  rate_fall_weekend: null,
  rate_winter_weekday: null,
  rate_winter_weekend: null,
  rate_spring_weekday: null,
  rate_spring_weekend: null,
  rate_basis: null,
  rate_basis_notes: null,
} as const;

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Patch = Record<string, unknown>;

function unit(raw: string | null): string | null {
  return normalizeGlampingUnitTypeForStorage(raw);
}

async function patchRow(id: number, patch: Patch): Promise<void> {
  const payload = { ...patch, date_updated: UPDATED, discovery_source: SOURCE };
  console.log(`${DRY_RUN ? 'would update' : 'update'} id ${id}`);
  if (DRY_RUN) return;
  const { error } = await supabase.from(ALL_SAGE_DATA_TABLE).update(payload).eq('id', id);
  if (error) throw new Error(`update ${id}: ${error.message}`);
}

async function insertSibling(sourceId: number, siteName: string, patch: Patch): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .select('id')
    .eq('property_name', patch.property_name as string)
    .eq('site_name', siteName)
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) {
    await patchRow(existing[0]!.id as number, patch);
    return;
  }
  const { data, error } = await supabase.from(ALL_SAGE_DATA_TABLE).select('*').eq('id', sourceId).single();
  if (error || !data) throw new Error(`load ${sourceId}: ${error?.message ?? 'missing'}`);
  const { id: _id, ...rest } = data as Patch & { id: number };
  const row = {
    ...rest,
    ...NO_RATE,
    ...patch,
    site_name: siteName,
    date_updated: UPDATED,
    date_added: UPDATED,
    discovery_source: SOURCE,
    research_status: patch.research_status ?? 'published',
  };
  console.log(`${DRY_RUN ? 'would insert' : 'insert'} ${String(patch.property_name)} / ${siteName}`);
  if (DRY_RUN) return;
  const { error: insertError } = await supabase.from(ALL_SAGE_DATA_TABLE).insert(row);
  if (insertError) throw new Error(`insert ${siteName}: ${insertError.message}`);
}

async function main(): Promise<void> {
  const princeNote =
    'Proposed RV campground, not glamping. Prince George County special exception SC-25-0004, heard 25 Sep 2025: 205 seasonal RV sites on 258 acres at Lebanon Road on Lake Lebanon. The mix is 110 park-model sites, 41 pull-through sites, and 54 back-in sites. Season would be 1 Apr through 30 Nov. The Planning Commission did not vote at that meeting. No nightly rate was published.';

  await patchRow(13142, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'RV Park',
    is_glamping_property: 'No',
    is_open: 'Proposed Development',
    site_name: 'Park model site',
    unit_type: unit('Park Model'),
    quantity_of_units: 110,
    address: 'Lebanon Road',
    state: 'VA',
    url: 'https://princegeorgecountyva.new.swagit.com/videos/356724',
    description: princeNote,
    unit_description: '110 permanent park-model RV sites in the 205-site proposal.',
  });
  await insertSibling(13142, 'Pull-through RV site', {
    property_name: 'Prince George County RV Campground',
    site_name: 'Pull-through RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 41,
    property_type: 'RV Park',
    is_glamping_property: 'No',
    is_open: 'Proposed Development',
    state: 'VA',
    address: 'Lebanon Road',
    url: 'https://princegeorgecountyva.new.swagit.com/videos/356724',
    description: princeNote,
    unit_description: '41 pull-through RV sites.',
  });
  await insertSibling(13142, 'Back-in RV site', {
    property_name: 'Prince George County RV Campground',
    site_name: 'Back-in RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 54,
    property_type: 'RV Park',
    is_glamping_property: 'No',
    is_open: 'Proposed Development',
    state: 'VA',
    address: 'Lebanon Road',
    url: 'https://princegeorgecountyva.new.swagit.com/videos/356724',
    description: princeNote,
    unit_description: '54 back-in RV sites.',
  });

  await patchRow(13031, {
    ...NO_RATE,
    research_status: 'published',
    property_type: 'Campground',
    is_glamping_property: 'No',
    is_open: 'Proposed Development',
    site_name: 'RV site',
    unit_type: unit('RV Site'),
    quantity_of_units: 51,
    city: 'Phelps',
    state: 'NY',
    address: 'Toll Road',
    url: 'https://moderncampground.com/usa/new-york/phelps-planning-board-clears-heritage-lake-campground-for-development/',
    description:
      'Proposed campground, not a glamping resort. The Town of Phelps Planning Board issued a SEQRA negative declaration in February 2026 for redeveloping the former Camp Dittmer on Toll Road. The plan is 51 RV sites plus boutique camping, new roads, renovated buildings, bathhouses, and cabins. Cabin and boutique-camping counts were not published, so only the 51 RV sites were stored. The earlier count of 20 was removed. No nightly rate was published.',
    unit_description: '51 RV sites in the Phelps planning record.',
  });

  await patchRow(9680, {
    research_status: 'published',
    property_type: 'Glamping',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    site_name: 'Safari tent',
    unit_type: unit('Safari Tent'),
    quantity_of_units: 8,
    unit_private_bathroom: 'No',
    url: 'https://stayedenreserve.com/',
    unit_description:
      '8 safari tents. Guests use a shared four-room bathhouse. The site publishes a tent floor plan and does not publish a nightly rate or individual tent names.',
  });

  const notGlamping = [
    13365, 13368, 13376, 13207, 13363, 13367, 13364, 13371, 13374, 13370, 13369, 13373, 13362,
  ];
  for (const id of notGlamping) {
    await patchRow(id, { is_glamping_property: 'No' });
  }

  console.log(DRY_RUN ? 'dry run complete' : 'writes complete');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
