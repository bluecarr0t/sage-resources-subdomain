#!/usr/bin/env npx tsx
/**
 * Web research round 2 (Jul 2026): additional USA cancelled glamping resort
 * pipeline rows as research_status = in_progress for admin review.
 *
 * Usage:
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-round2-2026-07-08.ts
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-round2-2026-07-08.ts --dry-run
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '../lib/cancelled-project-reason';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_2026_07_usa_cancelled_pipeline_round2';
const RESEARCH_TAG = 'usa_cancelled_glamping_research_round2_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type CancelledInsert = {
  property_name: string;
  slug: string;
  property_type?: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lon: number;
  url: string;
  unit_type: string;
  quantity_of_units: number;
  property_total_sites: number;
  cancelled_year: number;
  cancelled_reason: CancelledProjectReason;
  cancelled_reason_notes: string;
  description: string;
  notes: string;
};

const NEW_CANCELLED: CancelledInsert[] = [
  {
    property_name: 'Teakettle Mountain Glamping Resort',
    slug: 'teakettle-mountain-glamping-resort-mt',
    city: 'Blankenship',
    state: 'MT',
    address:
      'Teakettle Mountain Road, Blankenship, MT (~80 acres east of Teakettle Mountain; resort abandoned, parcel listed for sale)',
    lat: 48.412,
    lon: -114.089,
    url: 'https://hungryhorsenews.com/news/2025/sep/03/teakettle-suit-formally-dropped/',
    unit_type: 'Cabin',
    quantity_of_units: 30,
    property_total_sites: 30,
    cancelled_year: 2025,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'Glass View Glacier LLC abandoned a planned 30-cabin mirrored-glass “luxury glamping” resort on ~80 acres off private Teakettle Mountain Road after neighbor lawsuit (May 2025) alleging violation of prescriptive easement limiting road use to lower-traffic residential uses. Owners listed the parcel for sale (~$2.8M) and suit was dismissed as moot Sept 2025—project will not proceed.',
    description:
      'Teakettle Mountain Glamping Resort (Glass View Glacier LLC) was a proposed luxury glamping resort of ~30 mirrored glass cabins on roughly 80 acres on the east side of Teakettle Mountain near Blankenship/Columbia Falls, Montana—not an operating property. Marketing positioned the cabins as immersive forest and sky-view glamping with construction financing secured, but Blankenship neighbors sued in May 2025 claiming the commercial resort violated a longstanding Teakettle Road easement. Glass View Glacier opted to sell the land instead of building; the lawsuit was dismissed without prejudice in September 2025. Distinct from operating Highland Ranch glamping near Kalispell.',
    notes: `${RESEARCH_TAG}: Abandoned 2025 after easement lawsuit; 30 glass cabins planned. Sources: Hungry Horse News, Daily Inter Lake. REVIEW before publishing.`,
  },
  {
    property_name: 'Wonder Inn Resort',
    slug: 'wonder-inn-resort-wonder-valley-ca',
    property_type: 'Outdoor Resort',
    city: 'Wonder Valley',
    state: 'CA',
    address:
      '78201 Amboy Road, Wonder Valley, CA (24-acre resort core on ~223-acre parcel; appeal withdrawn)',
    lat: 34.123,
    lon: -115.719,
    url: 'https://z1077fm.com/wonder-inn-appeal-withdrawn-plans-for-resort-declared-dead/',
    unit_type: 'Cabin',
    quantity_of_units: 106,
    property_total_sites: 106,
    cancelled_year: 2024,
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes:
      'San Bernardino County Planning Commission unanimously denied the Wonder Inn hotel/resort CUP and rural-to-commercial rezoning in March 2023 (inadequate fire/EMS/law enforcement services; incompatible with Wonder Valley rural character). Developers Jason Landver and Alan Greenberg withdrew their Board of Supervisors appeal in February 2024—the 106-room desert resort proposal is dead in present form.',
    description:
      'Wonder Inn Resort was a proposed 106-room desert hotel and event resort at the landmark “pink building” on Amboy Road in Wonder Valley, California—not an operating property. Developers sought conditional use permits and commercial rezoning on ~24 acres within a 223-acre holding for a restaurant, spa/wellness center, conference and event space, Olympic-scale pool, and 205 parking spaces. After 47+ opponents testified at a March 2023 planning commission hearing, commissioners denied the project over public-service gaps and rural incompatibility; Stop Wonder Inn organized basin-wide opposition. Developers withdrew their supervisor appeal in February 2024. Often discussed alongside Morongo Basin glamping pipeline fights (Flamingo Heights 640, Ofland) though this proposal was hotel-forward.',
    notes: `${RESEARCH_TAG}: Appeal withdrawn Feb 2024; PC denied Mar 2023. Sources: Z107.7, SB County Sentinel, stopwonderinn.org. REVIEW before publishing.`,
  },
  {
    property_name: 'Nicholas Beaver Lake Glamping Resort',
    slug: 'nicholas-beaver-lake-glamping-resort-ar',
    city: 'Rogers',
    state: 'AR',
    address:
      'Beaver Lake area, Benton County, AR (~4 miles from Beaver Water District intake; planning denial)',
    lat: 36.332,
    lon: -93.892,
    url: 'https://woodallscm.com/ark-officials-deny-request-to-develop-glamping-park/',
    unit_type: 'Safari Tent',
    quantity_of_units: 40,
    property_total_sites: 52,
    cancelled_year: 2022,
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes:
      'Benton County Planning Board voted 5-0 (Sept 21, 2022) to deny Gene and Candia Nicholas’ Beaver Lake glamping proposal over wastewater impacts on Beaver Lake and Beaver Water District intake compatibility concerns (~4 miles from intake). Planned 40 glamping tents, 12 covered wagons, lodge, pool, and pavilions—distinct from later approved Contentment on Beaver Lake pipeline.',
    description:
      'Nicholas Beaver Lake Glamping Resort was a proposed high-amenity glamping and cabin resort near Beaver Lake in Benton County, Arkansas—not an operating property. Property owners Gene and Candia Nicholas sought approval for 40 glamping tents, 12 covered wagons, lodges, pool/spa, pavilions, and bathhouses; neighbors and Beaver Water District raised drinking-water and wastewater risks. The Benton County Planning Board unanimously denied the application in September 2022 after tabling failed. This is a separate, earlier proposal from the later Contentment on Beaver Lake development that advanced through county site-plan review.',
    notes: `${RESEARCH_TAG}: Benton County denied Sept 2022 (Nicholas proposal). Sources: Arkansas Democrat-Gazette, Woodall's. Distinct from Contentment on Beaver Lake. REVIEW before publishing.`,
  },
  {
    property_name: 'Bayocean Park Resort',
    slug: 'bayocean-park-resort-or',
    city: 'Bay City',
    state: 'OR',
    address:
      'Bayocean Spit, Tillamook County, OR (53-acre private beachfront parcel; planning denial)',
    lat: 45.521,
    lon: -123.972,
    url: 'https://www.tillamookheadlightherald.com/news_paid/bayocean-park-resort-public-hearing-delayed-due-to-property-owner-s-absence/article_5cb4ee74-6c39-11e4-b024-f790719a3631.html',
    unit_type: 'Safari Tent',
    quantity_of_units: 50,
    property_total_sites: 50,
    cancelled_year: 2015,
    cancelled_reason: 'regulatory_denial',
    cancelled_reason_notes:
      'Tillamook County Planning Commission denied Dale Bernards’ Bayocean Park Resort ecotourism proposal in January 2015 after hearings on luxury glamping units, marina, gardens, and research facilities on 53 Bayocean Spit acres. Denial followed capacity hearings and developer absence from a scheduled November 2014 session; project did not advance.',
    description:
      'Bayocean Park Resort was a proposed ecotourism and luxury glamping destination on a 53-acre private beachfront and bayside parcel on the Bayocean Spit near Bay City, Oregon—not an operating property. Developer Dale Bernards pitched luxury camping accommodations plus equestrian areas, edible gardens, marina concepts, wildlife preserve, and research facilities on the sensitive spit adjoining Bayocean Peninsula State Park. Tillamook County Planning Commission denied the resort proposal in January 2015 following packed public hearings and procedural issues including the owner’s absence from a November 2014 hearing.',
    notes: `${RESEARCH_TAG}: Tillamook County denied Jan 2015. Source: Tillamook Headlight Herald. REVIEW before publishing.`,
  },
];

const EVERGREEN_UPDATE = {
  property_name: 'Evergreen Resort',
  cancelled_year: 2022,
  cancelled_reason: 'regulatory_denial' as CancelledProjectReason,
  cancelled_reason_notes:
    'Clam Lake Township Planning Commission unanimously denied Karl Thomas / Evergreen Resort’s rezoning from agricultural-residential to forest recreational needed for a proposed 32-site luxury glamping campground and future 4–5 story hotel on undeveloped 41 Road frontage (July 2022 public hearing). Commissioners cited master plan mismatch, traffic, and neighborhood character—rezoning cannot be reconsidered for at least one year per township rules.',
  description:
    'Evergreen Resort (41 Road expansion) was a proposed phased glamping and hotel expansion on undeveloped Evergreen Resort acreage along 41 Road in Clam Lake Township near Cadillac, Michigan—not the separate operating Evergreen hotel inventory alone. Owner Karl Thomas sought rezoning for Stage 1: 32 full-hookup luxury glamping sites with bathhouse and pavilion; Stage 2: a ~$10M 4–5 story hotel with rooftop restaurant overlooking Lake Cadillac. The Clam Lake Township Planning Commission unanimously denied the rezoning in July 2022 after community opposition over noise, pollution, and agricultural-residential character. The expansion pipeline stalled. Distinct from The Haven of Cadillac, a separate approved glamping resort proposal nearby.',
  notes: `${RESEARCH_TAG}: Clam Lake Township denied rezoning July 2022 (32 glamping sites + hotel vision). Sources: Cadillac News, Modern Campground. REVIEW before publishing.`,
  url: 'https://moderncampground.com/usa/michigan/evergreen-resorts-10m-glamping-hotel-development-project-faces-opposition/',
};

function buildInsertRow(spec: CancelledInsert): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    slug: spec.slug,
    property_id: randomUUID(),
    property_type: spec.property_type ?? 'Glamping Resort',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: 'Cancelled',
    cancelled_year: spec.cancelled_year,
    cancelled_reason: spec.cancelled_reason,
    cancelled_reason_notes: spec.cancelled_reason_notes,
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'United States',
    land_operator_category: 'private_commercial',
    address: spec.address,
    city: spec.city,
    state: spec.state,
    lat: spec.lat,
    lon: spec.lon,
    url: spec.url,
    description: spec.description,
    notes: spec.notes,
    unit_type: normalizeGlampingUnitTypeForStorage(spec.unit_type),
    quantity_of_units: String(spec.quantity_of_units),
    property_total_sites: String(spec.property_total_sites),
    rate_avg_retail_daily_rate: null,
    planned_open_date: null,
    year_site_opened: null,
  };
}

async function propertyExists(name: string): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .limit(1);
  return Boolean(data?.length);
}

function appendNote(existing: string | null | undefined, note: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${note}` : note;
}

async function insertCancelledProperties(): Promise<void> {
  console.log('\n=== Insert cancelled pipeline properties (round 2) ===');
  for (const spec of NEW_CANCELLED) {
    if (await propertyExists(spec.property_name)) {
      console.log(`SKIP ${spec.property_name} — already exists`);
      continue;
    }

    const row = buildInsertRow(spec);
    console.log(
      `INSERT ${spec.property_name} (${spec.cancelled_year}, ${spec.cancelled_reason})`
    );
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(`Insert ${spec.property_name}: ${error.message}`);
  }
}

async function enrichEvergreenResort(): Promise<void> {
  console.log('\n=== Enrich Evergreen Resort cancellation metadata ===');

  const { data: row, error } = await supabase
    .from(TABLE)
    .select('id,notes,research_status')
    .eq('property_name', EVERGREEN_UPDATE.property_name)
    .eq('is_open', 'Cancelled')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) {
    console.log('SKIP Evergreen Resort — no cancelled row');
    return;
  }

  const patch = {
    research_status: 'in_progress',
    cancelled_year: EVERGREEN_UPDATE.cancelled_year,
    cancelled_reason: EVERGREEN_UPDATE.cancelled_reason,
    cancelled_reason_notes: EVERGREEN_UPDATE.cancelled_reason_notes,
    description: EVERGREEN_UPDATE.description,
    notes: appendNote(row.notes, EVERGREEN_UPDATE.notes),
    url: EVERGREEN_UPDATE.url,
    quantity_of_units: '32',
    property_total_sites: '32',
    address:
      '41 Road corridor, Clam Lake Township, Wexford County, MI (undeveloped Evergreen expansion parcel; rezoning denied)',
    date_updated: TODAY,
  };

  console.log(`PATCH Evergreen Resort id=${row.id}`);
  if (DRY_RUN) {
    console.log(JSON.stringify(patch, null, 2));
    return;
  }

  const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
  if (updateError) throw new Error(updateError.message);
}

async function main(): Promise<void> {
  await insertCancelledProperties();
  await enrichEvergreenResort();
  console.log(
    DRY_RUN ? '\nDry run complete.' : '\nUSA cancelled glamping research round 2 applied.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
