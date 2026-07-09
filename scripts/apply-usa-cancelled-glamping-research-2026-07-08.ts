#!/usr/bin/env npx tsx
/**
 * Web research (Jul 2026): insert USA cancelled glamping resort pipeline rows
 * as research_status = in_progress for admin review.
 *
 * Usage:
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-2026-07-08.ts
 *   npx tsx scripts/apply-usa-cancelled-glamping-research-2026-07-08.ts --dry-run
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { CancelledProjectReason } from '../lib/cancelled-project-reason';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_2026_07_usa_cancelled_pipeline';
const RESEARCH_TAG = 'usa_cancelled_glamping_research_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const TERRAMOR_BRAND_ID = '090c7464-a96e-4b16-832d-d9a144331480';
const UNDER_CANVAS_BRAND_ID = '2a78831f-3c15-4b52-b5a3-6c249f6a86a3';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

type CancelledInsert = {
  property_name: string;
  slug: string;
  brand_id?: string | null;
  city: string;
  state: string;
  address: string;
  lat: number;
  lon: number;
  url: string;
  unit_type: string;
  quantity_of_units: number;
  property_total_sites: number;
  cancelled_reason: CancelledProjectReason;
  cancelled_reason_notes: string;
  description: string;
  notes: string;
};

const NEW_CANCELLED: CancelledInsert[] = [
  {
    property_name: 'Terramor Outdoor Resort - Saugerties',
    slug: 'terramor-outdoor-resort-saugerties-ny',
    brand_id: TERRAMOR_BRAND_ID,
    city: 'Saugerties',
    state: 'NY',
    address:
      'Route 212, West Saugerties, NY (77-acre KOA/Terramor parcel on Woodstock town line; application withdrawn)',
    lat: 42.061,
    lon: -74.064,
    url: 'https://www.dailyfreeman.com/2023/02/08/terramor-withdraws-controversial-saugerties-glamping-plan/',
    unit_type: 'Safari Tent',
    quantity_of_units: 75,
    property_total_sites: 75,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'KOA/Terramor formally withdrew site plan, special use permit, and subdivision applications in February 2023 after Citizens Against Terramor mobilized 180+ attendees at planning hearings and opposition from Woodstock and Saugerties over traffic, noise, lighting, and wetlands. Company cited internal business decision / benchmarks not met; stated no intention to resubmit at that time while retaining the 77-acre site.',
    description:
      'Terramor Outdoor Resort - Saugerties was a proposed 75-tent luxury glamping resort by Kampgrounds of America (Terramor brand) on 77 acres along Route 212 at the Saugerties–Woodstock border in New York—not an operating property. Plans included luxury tent accommodations, a 4,000 sq ft restaurant/events center, Olympic pool, wellness center, staff dormitory, and dog park. After a year of contentious hearings and organized opposition (Citizens Against Terramor, Catskill Mountainkeeper, Woodstock Land Conservancy), Terramor withdrew all applications in February 2023 citing internal business benchmarks. The project will not proceed in its proposed form. Distinct from operating Terramor Bar Harbor (ME) and other Terramor pipeline sites.',
    notes: `${RESEARCH_TAG}: KOA/Terramor withdrew Feb 2023 (75 tents, Route 212). Sources: Daily Freeman, Hudson Valley One, Mid Hudson News, Modern Campground. REVIEW before publishing.`,
  },
  {
    property_name: 'Fox Hollow Campground',
    slug: 'fox-hollow-campground-deer-isle-me',
    city: 'Deer Isle',
    state: 'ME',
    address:
      'Crockett Cove, Deer Isle, ME (48-acre Fox Hollow parcel overlooking Crockett Cove; permits revoked)',
    lat: 44.219,
    lon: -68.678,
    url: 'https://moderncampground.com/usa/maine/glamping-project-halted-as-developers-revoke-permits-on-deer-isle/',
    unit_type: 'Cabin',
    quantity_of_units: 12,
    property_total_sites: 17,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'Fox Hollow Partners voluntarily revoked development permits and future development rights in a Feb 12, 2025 letter to the Deer Isle Select Board after years of opposition (Friends of Crockett Cove petition), a resident lawsuit over the Jan 2024 permit, and listing the property for sale amid “entrenched resistance.” Planned 12 cabins, 5 tent sites, bathhouse—not proceeding.',
    description:
      'Fox Hollow Campground was a proposed high-end glamping and cabin campground on a 48-acre Crockett Cove parcel in Deer Isle, Maine—not an operating property. Developer Addison Godine / Fox Hollow Partners proposed 12 cabins, five tent sites, and a bathhouse with barn renovations (~$2M total investment). The project faced organized opposition from Friends of Crockett Cove over rural character, septic impacts on the saltwater cove, boat traffic, and planning capacity. Despite a January 2024 town permit, six residents sued to rescind it. Developers voluntarily revoked all permits in February 2025 and abandoned development rights; the parcel had been listed for sale in 2024 without a buyer.',
    notes: `${RESEARCH_TAG}: Permits revoked Feb 2025 (12 cabins + 5 tents). Sources: Bangor Daily News, Modern Campground (Feb 2025). REVIEW before publishing.`,
  },
  {
    property_name: 'Dream Away Lodge Glamping Resort',
    slug: 'dream-away-lodge-glamping-becket-ma',
    city: 'Becket',
    state: 'MA',
    address:
      'County Road, Becket, MA (48 acres adjoining Dream Away Lodge; zoning application withdrawn)',
    lat: 42.284,
    lon: -73.051,
    url: 'https://www.berkshireeagle.com/news/southern_berkshires/becket-planning-board-glamping-project-drops-application/article_2708534a-f35b-11ec-8810-9be1cc4e59a9.html',
    unit_type: 'Safari Tent',
    quantity_of_units: 100,
    property_total_sites: 100,
    cancelled_reason: 'developer_withdrawal',
    cancelled_reason_notes:
      'Hit the Road RV LLC withdrew its Becket special permit application in June 2022 after a contentious public hearing; managing partner cited the planning board’s inability to reach a decisive decision. Proposed 100-site “glamping” mix of tents and cabins beside the Dream Away Lodge on 48 acres—application dead before board action.',
    description:
      'Dream Away Lodge Glamping Resort (Hit the Road RV LLC) was a proposed 100-site luxury glamping facility on 48 acres off County Road in Becket, Massachusetts, adjacent to the storied Dream Away Lodge—not an operating property. The mix of tents and cabins faced local pushback at a June 2022 Becket Planning Board hearing; developer Daniel I. Weinstein withdrew the special permit application, stating the board could not make a decisive decision on the proposal. The glamping plan did not advance. Distinct from any future hospitality use of the Dream Away Lodge property itself.',
    notes: `${RESEARCH_TAG}: Hit the Road withdrew application June 2022 (100 sites). Source: Berkshire Eagle. REVIEW before publishing.`,
  },
  {
    property_name: 'Oculis Lodge',
    slug: 'oculis-lodge-glacier-wa',
    city: 'Glacier',
    state: 'WA',
    address:
      'Old Mount Baker Highway, Glacier, WA (2.16-acre dome glamping site near Mount Baker; project shut down)',
    lat: 48.892,
    lon: -121.945,
    url: 'https://moderncampground.com/usa/washington/crowdfunded-glamping-venture-near-mount-baker-closes-leaving-backers-uncertain/',
    unit_type: 'Dome',
    quantity_of_units: 35,
    property_total_sites: 35,
    cancelled_reason: 'financing_failure',
    cancelled_reason_notes:
      'Crowdfunded dome glamping venture ($1.2M Indiegogo, 2022) shut down in 2025 after years of permitting delays and missed deadlines; only one dome ever completed. Founder Youri Benoiston cited insurmountable challenges; property listed for sale/auction with foreclosure filings. Planned 35 stargazing domes with saunas and skylights—project abandoned.',
    description:
      'Oculis Lodge was a crowdfunded luxury dome glamping resort proposed near Mount Baker in Glacier, Washington—not a completed resort. Founder Youri Benoiston raised ~$1.2M on Indiegogo (2022) for 35 geodesic domes with skylights, saunas, and firepits on 2.16 acres along Old Mount Baker Highway. Repeated permitting delays and missed opening deadlines frustrated backers; only one dome was ever completed and briefly hosted guests in 2024. Benoiston formally shut down the project in 2025 and listed the property for sale (~$725k), with foreclosure proceedings filed in 2025. Treat as cancelled failed pipeline—not bookable multi-unit inventory.',
    notes: `${RESEARCH_TAG}: Project closed 2025; 1 of 35 domes built. Sources: Seattle Times, Cascadia Daily News, Modern Campground. REVIEW before publishing.`,
  },
];

const UNDER_CANVAS_MANCOS_UPDATE = {
  property_name: 'Under Canvas Mancos',
  cancelled_reason: 'developer_withdrawal' as CancelledProjectReason,
  cancelled_reason_notes:
    'Under Canvas Inc. withdrew its Montezuma County high-impact/special-use and planned unit development application on May 1, 2025 before a BOCC hearing, after Planning & Zoning recommended denial (March 13, 2025, 3–2) amid 530+ petition signatures and Protect Mancos opposition over ag-residential zoning, dark skies, and Mesa Verde area impacts. Proposed seasonal luxury tents on ~346 acres north of Mancos—application withdrawn, project abandoned.',
  description:
    'Under Canvas Mancos was a proposed seasonal luxury glamping resort on a 346-acre ag-residential parcel north of Highway 184 near Mancos, Colorado—not an operating property. Under Canvas sought high-impact/special-use and planned unit development permits for concentrated tent operations (reporting cited ~75 units on a fraction of the site). Montezuma County Planning & Zoning recommended denial in March 2025 after standing-room-only opposition (Protect Mancos petition, dark-sky and land-use concerns). Under Canvas withdrew the application May 1, 2025 before Board of County Commissioners action—the project will not proceed. Distinct from operating Under Canvas locations.',
  notes: `${RESEARCH_TAG}: Application withdrawn May 1, 2025. Sources: Montezuma County BOCC minutes, Durango Herald, Modern Campground. REVIEW before publishing.`,
  url: 'https://moderncampground.com/usa/colorado/under-canvas-faces-setback-in-bid-for-luxury-camping-development-in-mancos/',
};

function buildInsertRow(spec: CancelledInsert): Record<string, unknown> {
  return {
    property_name: spec.property_name,
    slug: spec.slug,
    property_id: randomUUID(),
    property_type: 'Glamping Resort',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: 'Cancelled',
    cancelled_reason: spec.cancelled_reason,
    cancelled_reason_notes: spec.cancelled_reason_notes,
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'United States',
    land_operator_category: 'private_commercial',
    brand_id: spec.brand_id ?? null,
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

async function insertCancelledProperties(): Promise<void> {
  console.log('\n=== Insert cancelled pipeline properties (in_progress) ===');
  for (const spec of NEW_CANCELLED) {
    if (await propertyExists(spec.property_name)) {
      console.log(`SKIP ${spec.property_name} — already exists`);
      continue;
    }

    const row = buildInsertRow(spec);
    console.log(`INSERT ${spec.property_name} (${spec.cancelled_reason})`);
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(`Insert ${spec.property_name}: ${error.message}`);
  }
}

function appendNote(existing: string | null | undefined, note: string): string {
  const base = (existing ?? '').trim();
  if (base.includes(RESEARCH_TAG.slice(0, 32))) return base;
  return base ? `${base}\n\n${note}` : note;
}

async function updateUnderCanvasMancos(): Promise<void> {
  console.log('\n=== Reclassify Under Canvas Mancos → Cancelled (in_progress) ===');

  const { data: row, error } = await supabase
    .from(TABLE)
    .select('id,notes')
    .eq('property_name', UNDER_CANVAS_MANCOS_UPDATE.property_name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) {
    console.log('SKIP Under Canvas Mancos — no row');
    return;
  }

  const patch = {
    research_status: 'in_progress',
    is_open: 'Cancelled',
    brand_id: UNDER_CANVAS_BRAND_ID,
    cancelled_reason: UNDER_CANVAS_MANCOS_UPDATE.cancelled_reason,
    cancelled_reason_notes: UNDER_CANVAS_MANCOS_UPDATE.cancelled_reason_notes,
    description: UNDER_CANVAS_MANCOS_UPDATE.description,
    notes: appendNote(row.notes, UNDER_CANVAS_MANCOS_UPDATE.notes),
    url: UNDER_CANVAS_MANCOS_UPDATE.url,
    quantity_of_units: '75',
    property_total_sites: '75',
    address:
      '12695 Road 40, Mancos, CO (346-acre Windy Ridge Ranch parcel; application withdrawn May 2025)',
    rate_avg_retail_daily_rate: null,
    planned_open_date: null,
    year_site_opened: null,
    date_updated: TODAY,
  };

  console.log(`PATCH Under Canvas Mancos id=${row.id}`);
  if (DRY_RUN) {
    console.log(JSON.stringify(patch, null, 2));
    return;
  }

  const { error: updateError } = await supabase.from(TABLE).update(patch).eq('id', row.id);
  if (updateError) throw new Error(updateError.message);
}

async function main(): Promise<void> {
  await insertCancelledProperties();
  await updateUnderCanvasMancos();
  console.log(DRY_RUN ? '\nDry run complete.' : '\nUSA cancelled glamping research rows applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
