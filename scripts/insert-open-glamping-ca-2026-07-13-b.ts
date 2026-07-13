#!/usr/bin/env npx tsx
/**
 * Insert ~25 additional open/operating Canada glamping resorts missing from all_sage_data
 * (batch B after web_research_open_glamping_ca_2026_07_13).
 * research_status = in_progress; requires website URL + city + province.
 *
 * Usage:
 *   npx tsx scripts/insert-open-glamping-ca-2026-07-13-b.ts --dry-run
 *   npx tsx scripts/insert-open-glamping-ca-2026-07-13-b.ts
 */
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_open_glamping_ca_2026_07_13_b';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

type InsertSpec = {
  property_name: string;
  city: string;
  state: string;
  url: string;
  unit_type?: string | null;
  quantity_of_units?: number | null;
  property_total_sites?: number | null;
  address?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  lat?: number | null;
  lon?: number | null;
  description: string;
};

function assertRequired(spec: InsertSpec): InsertSpec {
  const url = spec.url.trim();
  const city = spec.city.trim();
  const province = normalizeCaProvinceToCode(spec.state);
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(`${spec.property_name}: url required (http/https)`);
  }
  if (!city) {
    throw new Error(`${spec.property_name}: city required`);
  }
  if (!province) {
    throw new Error(`${spec.property_name}: valid Canada province required (got ${spec.state})`);
  }
  return { ...spec, url, city, state: province };
}

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  const gated = assertRequired(spec);
  return {
    property_name: gated.property_name,
    slug: slugify(gated.property_name),
    property_id: propertyId,
    property_type: 'Glamping',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    is_open: 'Yes',
    source: 'Sage',
    discovery_source: DISCOVERY_SOURCE,
    date_added: TODAY,
    date_updated: TODAY,
    country: 'Canada',
    land_operator_category: 'private_commercial',
    address: gated.address ?? null,
    city: gated.city,
    state: gated.state,
    zip_code: gated.zip_code ?? null,
    lat: gated.lat ?? null,
    lon: gated.lon ?? null,
    url: gated.url,
    phone_number: gated.phone_number ?? null,
    description: gated.description,
    unit_type: gated.unit_type
      ? normalizeGlampingUnitTypeForStorage(gated.unit_type)
      : null,
    quantity_of_units:
      gated.quantity_of_units != null ? String(gated.quantity_of_units) : null,
    property_total_sites:
      gated.property_total_sites != null ? String(gated.property_total_sites) : null,
    notes:
      '[2026-07-13-b] Open Canada gap-fill batch B: verify rates, amenities, and exact coordinates before publishing.',
  };
}

/** Curated open/operating Canada resorts missing from all_sage_data (2026-07-13 batch B). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'PEI Centreline Escapes',
    city: 'St. Lawrence',
    state: 'PE',
    address: '2074 Center Line Road',
    url: 'https://www.peicenterlineescapes.com/',
    phone_number: '647-335-6035',
    unit_type: 'Dome',
    description:
      'Year-round luxury geodesic dome glamping in western PEI (North Cape Coastal Drive) with private hot tubs, heated domes, and ATV trail access near St. Lawrence.',
  },
  {
    property_name: 'Rustico Resort Domes',
    city: 'Rustico',
    state: 'PE',
    address: '496 Grand Pere Point Road',
    url: 'https://rusticoresort.com/',
    phone_number: '902-393-8677',
    unit_type: 'Dome',
    quantity_of_units: 7,
    property_total_sites: 7,
    description:
      'Waterfront geodesic dome glamping on Rustico Bay, PEI, on a 178-acre golf resort with bay views, kayaks, and on-site dining at Dhalia restaurant.',
  },
  {
    property_name: 'Maytree Eco-Retreat',
    city: 'Murray Harbour North',
    state: 'PE',
    address: '164 Sunset Beach Road',
    url: 'https://www.maytreeretreat.ca/',
    phone_number: '902-326-9173',
    unit_type: 'Dome',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Couples-focused luxury geodesic eco-dome on PEI’s south-eastern shore near Murray River / Murray Harbour North, with private beach access and ocean views.',
  },
  {
    property_name: 'Foxes Glamping Domes',
    city: 'Pouch Cove',
    state: 'NL',
    url: 'https://www.foxglampingdomesinc.ca/',
    unit_type: 'Dome',
    description:
      'Four-season geodesic dome glamping in Pouch Cove, Newfoundland, with large living space and nature/river views; adjacent tent campground for traditional camping.',
  },
  {
    property_name: 'New Frontiers Retreat',
    city: 'Eganville',
    state: 'ON',
    url: 'https://newfrontiersretreat.ca/',
    unit_type: 'Dome',
    description:
      'Bonnechere River glamping near Eganville, Ontario (about 1.5 hours west of Ottawa): geodesic domes, wall tents, and tiny cabins along forested riverbanks.',
  },
  {
    property_name: 'Pit Stop 518',
    city: 'Kearney',
    state: 'ON',
    address: '1734 Highway 518',
    url: 'https://pitstop518.com/',
    phone_number: '519-831-8341',
    unit_type: 'Yurt',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Year-round authentic Mongolian yurt glamping in a flower meadow in Kearney, Ontario (Almaguin Highlands), near Algonquin and Arrowhead Provincial Parks.',
  },
  {
    property_name: 'Lungovita Beach Retreat',
    city: 'Harrow',
    state: 'ON',
    url: 'https://www.lungovita.com/',
    unit_type: 'Dome',
    description:
      'Adults-oriented Lake Erie geodesic dome glamping retreat in Harrow, Ontario, with multiple dome sizes and on-site spa / day-pass amenities.',
  },
  {
    property_name: 'Riverside Oasis Farm',
    city: 'Wellandport',
    state: 'ON',
    zip_code: 'L0R 2J0',
    address: '6696 Canborough Road',
    url: 'https://riversideoasisfarm.ca/',
    phone_number: '905-379-1860',
    unit_type: 'Yurt',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Year-round riverside Mongolian yurt farm glamping near Niagara / Wellandport, Ontario, with animal farm tours, kitchenettes, and wood-stove heat.',
  },
  {
    property_name: "Nature's Harmony Ecolodge",
    city: 'Mattawa',
    state: 'ON',
    address: '574 Snake Creek Road',
    url: 'https://naturesharmony.ca/',
    phone_number: '705-223-4340',
    unit_type: 'Yurt',
    description:
      'Off-grid ecolodge on 485 acres near Mattawa, Ontario, overlooking the Laurentian Mountains: Mongolian yurts, geodomes, and canvas tents.',
  },
  {
    property_name: 'Maynooth Station Lodge',
    city: 'Maynooth',
    state: 'ON',
    url: 'https://maynoothstationlodge.ca/',
    unit_type: 'Dome',
    description:
      'Multi-season geodesic dome glamping near Maynooth / Bancroft, Ontario (Hastings Highlands), with private hot tub, kitchen, and Algonquin Park about 35 minutes away.',
  },
  {
    property_name: 'Sunnd Eco Resort',
    city: 'Batchawana Bay',
    state: 'ON',
    address: '14904 Highway 17 North',
    url: 'https://www.sunndecoresort.com/',
    unit_type: 'Dome',
    description:
      'Scandinavian-inspired quiet-luxury eco resort glamping in Batchawana Bay, Ontario (Algoma / Lake Superior corridor north of Sault Ste. Marie).',
  },
  {
    property_name: 'Lakeview Dome',
    city: 'Haliburton',
    state: 'ON',
    zip_code: 'K0M 1S0',
    address: '4951 Haliburton County Road 21',
    url: 'https://geodome.netlify.app/',
    unit_type: 'Dome',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Four-season luxury geodesic dome stay in Haliburton, Ontario (Haliburton Highlands), marketed alongside Lakeview Motel amenities including private hot-tub positioning.',
  },
  {
    property_name: 'ReLive Retreat',
    city: 'Priceville',
    state: 'ON',
    url: 'https://reliveretreat.com/',
    phone_number: '416-456-6831',
    unit_type: 'Pod',
    description:
      'Nature retreat in Priceville / Grey Highlands, Ontario, featuring The Dream Capsule spherical glamping pod plus trails across meadows, forests, and wetlands.',
  },
  {
    property_name: 'Exode en Nature',
    city: 'Sainte-Rose-du-Nord',
    state: 'QC',
    zip_code: 'G0V 1T0',
    address: '1516 Route de Tadoussac',
    url: 'https://exodeennature.com/',
    phone_number: '418-540-1455',
    unit_type: 'Dome',
    quantity_of_units: 6,
    property_total_sites: 6,
    description:
      'Four-season insolite glamping on the Pelletier River in Sainte-Rose-du-Nord, Quebec (Saguenay Fjord): dome, yurt, pod, and tiny-house units each with private Nordic bath and sauna.',
  },
  {
    property_name: 'Wildwood Nature Escape',
    city: 'Fort-Coulonge',
    state: 'QC',
    url: 'https://wildwoodnatureescape.com/',
    unit_type: 'Dome',
    description:
      'Off-grid Coulonge River glamping near Fort-Coulonge / Mansfield, Quebec (Pontiac): geodesic domes, bunkies, and tent platforms with sauna, cold plunge, and river tubing.',
  },
  {
    property_name: '350 Farms',
    city: 'Cold Lake',
    state: 'AB',
    url: 'https://www.350farms.ca/',
    unit_type: 'Dome',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'All-inclusive chef-prepared geodesic dome glamping on a regenerative farm near Cold Lake, Alberta (MD of Bonnyville), with dark-sky stargazing and Nordic spa amenities.',
  },
  {
    property_name: 'Lakeside Luxury Domes',
    city: 'Saint Georges Channel',
    state: 'NS',
    url: 'https://lakesideluxury.ca/',
    unit_type: 'Dome',
    description:
      'Four-season lakeside geodesic dome glamping on Bras d’Or Lake, Cape Breton (near Dundee / Saint Georges Channel), with private hot tubs and en-suite bathrooms.',
  },
  {
    property_name: 'Northeast Cove Geodomes',
    city: 'Mabou',
    state: 'NS',
    zip_code: 'B0E 1X0',
    address: '355 Mabou Harbour Road',
    url: 'https://northeastcove.com/',
    phone_number: '902-984-1160',
    unit_type: 'Dome',
    quantity_of_units: 4,
    property_total_sites: 4,
    description:
      'Seasonal waterfront luxury geodomes in Mabou, Cape Breton, with kitchenettes, ensuites, decks, and complimentary kayaks / paddleboards.',
  },
  {
    property_name: 'The Blaeberry Base',
    city: 'Blaeberry',
    state: 'BC',
    url: 'https://theblaeberrybase.ca/',
    unit_type: 'Dome',
    description:
      'Mountain glamping retreat near Golden, British Columbia, with geodesic domes (including Luxe Serenity Dome and DripDōme) plus cabin inventory and shared cedar sauna.',
  },
  {
    property_name: 'StoneCircle Glamping Retreat',
    city: 'Kaleden',
    state: 'BC',
    url: 'https://stonecircleretreat.com/',
    unit_type: 'Dome',
    description:
      'Okanagan Valley geodesic dome glamping retreat in Kaleden, British Columbia, positioned for nature immersion and holistic / wellness-oriented stays.',
  },
  {
    property_name: 'MoonLight Glamping',
    city: 'Westwold',
    state: 'BC',
    url: 'https://www.moonlight-glamping.com/',
    unit_type: 'Safari Tent',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Off-grid riverfront glamping at Bella River Acres along the Salmon River in Westwold, British Columbia (about 50 minutes from Kamloops / Vernon), with stargazer tents.',
  },
  {
    property_name: 'Creston Valley Geodesic Dome',
    city: 'Creston',
    state: 'BC',
    url: 'https://offgriddome.com/',
    unit_type: 'Dome',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Private off-grid geodesic dome and camp setup in the Creston Community Forest, British Columbia (Kootenays), with mountain views, solar power, and outdoor kitchen.',
  },
  {
    property_name: 'Fraser Canyon Riverside Domes',
    city: 'Hope',
    state: 'BC',
    url: 'https://www.thefraservalley.ca/fc-riverside-domes/',
    phone_number: '604-792-3544',
    unit_type: 'Dome',
    quantity_of_units: 2,
    property_total_sites: 2,
    description:
      'Seasonal Fraser River waterfront geodesic domes north of Hope, British Columbia (Gold Rush Trail / Fraser Canyon), hosted with Great River Fishing Adventures; wood-fired cedar hot tub.',
  },
  {
    property_name: 'Marmora Retreat',
    city: 'Marmora',
    state: 'ON',
    url: 'https://www.marmoraretreat.ca/glamping-domes',
    unit_type: 'Dome',
    description:
      'Year-round geodesic dome glamping on private acres in Marmora, Ontario (Kawarthas), including Sky-View and Boho-Luxe dome products with hot tubs and stargazing; about two hours from Toronto.',
  },
  {
    property_name: 'Raptor Ridge Geodomes',
    city: 'Drumheller',
    state: 'AB',
    url: 'https://www.raptorridge.ca/',
    unit_type: 'Dome',
    description:
      'Family-friendly geodesic dome glamping at Raptor Ridge Campground in Drumheller, Alberta (Canadian Badlands), with raised-deck river views and multiple dome sizes.',
  },
];

async function propertyExists(name: string, city: string, province: string): Promise<boolean> {
  const { data: byName } = await supabase
    .from(TABLE)
    .select('id, city, state, country')
    .ilike('property_name', name)
    .limit(5);
  if (byName?.length) {
    const sameCountry = byName.some((r) => {
      const c = String(r.country ?? '').trim().toLowerCase();
      return c === 'canada' || c === 'ca' || c === '';
    });
    if (sameCountry) return true;
  }

  const { data: byPlace } = await supabase
    .from(TABLE)
    .select('id')
    .eq('country', 'Canada')
    .ilike('city', city)
    .eq('state', province)
    .ilike('property_name', name)
    .limit(1);
  return Boolean(byPlace?.length);
}

async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}`);
  console.log(`Candidates: ${NEW_PROPERTIES.length}\n`);

  const validated = NEW_PROPERTIES.map((s) => assertRequired(s));
  console.log(`Hard gates passed for ${validated.length} properties (url + city + province).\n`);

  let insertedProperties = 0;
  let skipped = 0;

  for (const spec of validated) {
    if (await propertyExists(spec.property_name, spec.city, spec.state)) {
      console.log(`SKIP ${spec.property_name} — already exists`);
      skipped += 1;
      continue;
    }

    const propertyId = randomUUID();
    const row = baseRow(spec, propertyId);
    console.log(
      `INSERT ${spec.property_name} (${spec.city}, ${spec.state}) → ${spec.url}`
    );

    if (DRY_RUN) {
      insertedProperties += 1;
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) throw new Error(`Insert ${spec.property_name}: ${error.message}`);
    insertedProperties += 1;
  }

  console.log(
    `\nSummary: ${insertedProperties} propert(ies) ${
      DRY_RUN ? 'would be' : 'were'
    } inserted; ${skipped} skipped as duplicates.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
