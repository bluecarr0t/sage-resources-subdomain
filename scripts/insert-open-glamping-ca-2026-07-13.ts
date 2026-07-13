#!/usr/bin/env npx tsx
/**
 * Insert ~25 open/operating Canada glamping resorts missing from all_sage_data.
 * research_status = in_progress; requires website URL + city + province.
 *
 * Usage:
 *   npx tsx scripts/insert-open-glamping-ca-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-open-glamping-ca-2026-07-13.ts
 */
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DISCOVERY_SOURCE = 'web_research_open_glamping_ca_2026_07_13';
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
      '[2026-07-13] Open Canada gap-fill: verify rates, amenities, and exact coordinates before publishing.',
  };
}

/** Curated open/operating Canada resorts missing from all_sage_data (2026-07-13 research). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Island Beach Hideaways',
    city: 'Monks Head',
    state: 'NS',
    zip_code: 'B2G 2L4',
    address: '259 Pomquet Beach Road',
    url: 'https://www.islandbeachhideaways.ca/',
    phone_number: '902-200-4200',
    unit_type: 'Dome',
    lat: 45.6454,
    lon: -61.8268,
    description:
      'Adults-only four-season geodesic dome glamping on the Northumberland Shore near Antigonish, Nova Scotia, with waterfront views of St. George’s Bay and Pomquet Beach Provincial Park nearby.',
  },
  {
    property_name: 'Nova Glamping',
    city: 'West Dover',
    state: 'NS',
    address: '159 West Dover Road',
    url: 'https://www.novaglamping.ca/',
    unit_type: 'Dome',
    description:
      'Boat-access private-island glamping near Peggy’s Cove / West Dover, Nova Scotia: geodesic domes and a wood cabin with wood-fired hot tubs and cedar sauna, about 35 minutes from Halifax.',
  },
  {
    property_name: 'Mill Lake Retreat',
    city: 'Hubbards',
    state: 'NS',
    url: 'https://milllakeretreat.ca/',
    unit_type: 'Dome',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Seasonal geodesic dome glamping on Mill Lake near Hubbards, Nova Scotia (about 45 minutes from Halifax), with kitchen, bath, BBQ, and firepit amenities; typically open May–October.',
  },
  {
    property_name: 'Quisibis Domes',
    city: 'Rivière-Verte',
    state: 'NB',
    url: 'https://quisibisdomes.com/en/',
    unit_type: 'Dome',
    description:
      'Year-round geodesic dome glamping along the Quisibis River near Rivière-Verte / Edmundston, New Brunswick, with private hot tubs, full kitchens, and bathrooms.',
  },
  {
    property_name: 'Balsam Ridge Forest Domes',
    city: 'Portage Vale',
    state: 'NB',
    zip_code: 'E4Z 3C9',
    address: '330 Route 895',
    url: 'https://balsamridgeforestdomes.ca/',
    phone_number: '506-340-3663',
    unit_type: 'Dome',
    description:
      'Five-star Canada Select geodesic dome retreat in Portage Vale, New Brunswick (about 35 minutes from Moncton), with private hot tubs, trails, and four-season forest stays.',
  },
  {
    property_name: 'Cielo Glamping Maritime',
    city: 'Haut-Shippagan',
    state: 'NB',
    address: '232 Chemin des Huîtres',
    url: 'https://www.glampingcielo.com/en',
    unit_type: 'Dome',
    quantity_of_units: 5,
    property_total_sites: 5,
    description:
      'Four-season eco-luxury dome glamping on Baie St-Simon in Haut-Shippagan, New Brunswick, with five “Perles” domes, kitchens, bathrooms, and year-round hot tubs.',
  },
  {
    property_name: 'EKÖ Nature Glamping',
    city: 'Lac Baker',
    state: 'NB',
    url: 'https://www.ekonatureglamping.com/',
    unit_type: 'Dome',
    quantity_of_units: 4,
    property_total_sites: 6,
    description:
      'Mountainside four-season dome and chalet glamping overlooking Lac Baker in northwestern New Brunswick, with private spas and panoramic Appalachian views.',
  },
  {
    property_name: 'Forest Lane Domes',
    city: 'Bloomfield',
    state: 'NB',
    address: '396 Guthrie Road',
    url: 'https://www.forestlanedomes.com/',
    unit_type: 'Dome',
    description:
      'Geodesic dome glamping near the Bay of Fundy in Bloomfield, New Brunswick, with private hot tubs, kitchenettes, and dog-friendly units.',
  },
  {
    property_name: 'Bear Island Kingdome',
    city: 'Queensbury',
    state: 'NB',
    url: 'https://www.bearislandkingdome.ca/',
    unit_type: 'Dome',
    description:
      'Luxury geodesic dome glamping on private woodland near the Saint John River in Queensbury Parish, New Brunswick, with private hot tubs and lake access; about 40 minutes from Fredericton.',
  },
  {
    property_name: 'Still Water Glamping',
    city: 'Hayman Hill',
    state: 'NB',
    address: '739 Route 740',
    url: 'https://stillwaterglamping.com/',
    unit_type: 'Dome',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Year-round private-lake geodesic dome glamping at Hayman Hill, New Brunswick (near St. Andrews / St. Stephen), with stargazer skylights and private hot tubs.',
  },
  {
    property_name: 'Cove Dome Glamping',
    city: 'Moncton Parish',
    state: 'NB',
    address: '229 Cove Road',
    url: 'https://covedomeglamping.com/',
    unit_type: 'Dome',
    description:
      'Forest geodesic dome glamping overlooking McQuade Brook just outside Moncton, New Brunswick; four-season private retreat near city amenities.',
  },
  {
    property_name: 'OG Domes',
    city: 'Magaguadavic',
    state: 'NB',
    url: 'https://ogales.ca/domes/',
    unit_type: 'Dome',
    description:
      'Adults-oriented lakeside geodesic dome retreat on Magaguadavic Lake, New Brunswick, paired with an off-grid craft brewery; spa-style amenities and private saltwater hot tubs.',
  },
  {
    property_name: 'Appalaches Domes & Spa',
    city: 'Flatlands',
    state: 'NB',
    zip_code: 'E3N 4X2',
    address: '62 Islandview Drive',
    url: 'https://www.oldchurchcottages.com/',
    phone_number: '506-329-5444',
    unit_type: 'Dome',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Adults-only year-round geodesic dome glamping (Appalaches Domes & Spa by Old Church Cottages) in Flatlands, New Brunswick, with private spas, kitchens, and bathrooms on the Restigouche.',
  },
  {
    property_name: 'Belleisle Bayview Retreat',
    city: 'Long Point',
    state: 'NB',
    address: '25 Bell Hill Road',
    url: 'https://halassy.wixsite.com/bellislebayretreat',
    unit_type: 'Dome',
    description:
      'Wooded hillside glamping above Belleisle Bay in Long Point, New Brunswick: Lookout Dome, Star Dome, and Forest Yurt options since 2016.',
  },
  {
    property_name: 'Tides & Timber Glamping',
    city: 'Bayside',
    state: 'NB',
    url: 'https://www.tidesandtimberglamping.com/',
    unit_type: 'Dome',
    description:
      'Waterfront hillside geodesic dome glamping overlooking Passamaquoddy Bay in Bayside, New Brunswick, near St. Andrews, with private spas.',
  },
  {
    property_name: 'Blackstrap Glamping Resort',
    city: 'Dundurn',
    state: 'SK',
    url: 'https://blackstrapglampingresort.ca/',
    unit_type: 'Dome',
    quantity_of_units: 6,
    property_total_sites: 6,
    description:
      'Themed luxury geodesic dome resort in Blackstrap Provincial Park near Dundurn, Saskatchewan (about 25 minutes south of Saskatoon), with six bookable domes.',
  },
  {
    property_name: 'Prairie Ridge Resort',
    city: 'Petrofka',
    state: 'SK',
    url: 'https://www.prairieridge.ca/',
    unit_type: 'Dome',
    description:
      'Riverside glamping domes and a tiny cabin in Petrofka Valley, Saskatchewan, with cedar barrel sauna and river recreation.',
  },
  {
    property_name: 'Flora Bora',
    city: 'Christopher Lake',
    state: 'SK',
    zip_code: 'S0J 0N0',
    url: 'https://www.florabora.ca/',
    phone_number: '306-961-9554',
    unit_type: 'Yurt',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Furnished yurt forest lodging near Christopher Lake / Tuddles Lake, Saskatchewan, with kitchens and bathrooms on 30 acres of boreal forest beside Prince Albert National Park approaches.',
  },
  {
    property_name: 'Wild Skies Resort',
    city: 'River Hills',
    state: 'MB',
    zip_code: 'R0E 1T0',
    address: '71057 Brookfield Road',
    url: 'https://wildskiesresort.com/',
    unit_type: 'Dome',
    description:
      'Manitoba glamping resort on the Whitemouth River at River Hills: geo-domes, canvas tents, and cabin inventory on about 10 acres of forest and meadow.',
  },
  {
    property_name: 'Misty Oak Hollow',
    city: 'Saint Malo',
    state: 'MB',
    address: '35 Nashua Road',
    url: 'https://www.mistyoakhollow.com/',
    unit_type: 'Dome',
    description:
      'Riverside geodesic dome glamping in Saint Malo, Manitoba.',
  },
  {
    property_name: 'Expérience Equinox',
    city: 'Saint-Donat',
    state: 'QC',
    url: 'https://experienceequinox.ca/',
    unit_type: 'Dome',
    description:
      'Four-season immersive dome glamping near Saint-Donat in Lanaudière, Quebec (about 1.5 hours from Montréal), with private spas and lake/mountain views.',
  },
  {
    property_name: 'Tidal Retreat Glamping',
    city: 'Bayside',
    state: 'NB',
    url: 'https://tidalretreatglamping.ca/',
    unit_type: 'Dome',
    quantity_of_units: 2,
    property_total_sites: 2,
    description:
      'Four-season pet-friendly geodesic dome glamping on the Waweig River near Bayside / St. Andrews, New Brunswick, with private hot tubs and Fundy tidal views.',
  },
  {
    property_name: "Water's Edge Glamping",
    city: 'Lake George',
    state: 'NB',
    address: '33 Loon Lane',
    url: 'https://www.watersedgeglamping.com/',
    phone_number: '506-429-8177',
    unit_type: 'Dome',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Year-round waterfront geodesic dome on Pokiok Stream near Lake George, New Brunswick (about 25 minutes from Fredericton), with private hot tub, sauna, and cold plunge.',
  },
  {
    property_name: 'Creekside RNR',
    city: 'Cocagne',
    state: 'NB',
    address: '4865 NB-134',
    url: 'https://creeksidernr.com/',
    unit_type: 'Dome',
    description:
      'Year-round romantic geodesic dome glamping with Nordic spa at Creekside RnR in Cocagne, New Brunswick.',
  },
  {
    property_name: 'Bel Air Tremblant Domes',
    city: 'Mont-Tremblant',
    state: 'QC',
    url: 'https://belairtremblant.com/rentals/domes/',
    phone_number: '819-774-0203',
    unit_type: 'Dome',
    description:
      'Luxury geodesic / glass dome hotel collection at Bel Air Resort in Mont-Tremblant, Quebec — private nature-set units with oversized windows and romantic glamping positioning.',
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

  // Validate all specs before any DB writes
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
