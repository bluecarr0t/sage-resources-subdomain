#!/usr/bin/env npx tsx
/**
 * Insert verified USA A-Frame properties / siblings into all_sage_data.
 * research_status = in_progress (review/publish separately).
 *
 * Usage:
 *   npx tsx scripts/insert-a-frame-us-2026-07-13.ts --dry-run
 *   npx tsx scripts/insert-a-frame-us-2026-07-13.ts
 */

import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = ALL_SAGE_DATA_TABLE;
const DISCOVERY_SOURCE = 'web_research_a_frame_us_2026_07_13';
const TODAY = new Date().toISOString().split('T')[0];
const DRY_RUN = process.argv.includes('--dry-run');
const OUT_DIR = resolve(process.cwd(), 'scripts/.tmp-a-frame-review');
const CANONICAL = normalizeGlampingUnitTypeForStorage('A-Frame') ?? 'A-Frame';

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
  site_name?: string | null;
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
  notes?: string | null;
  /** Reuse existing property_id for sibling inserts */
  existing_property_id?: string;
};

function assertRequired(spec: InsertSpec): InsertSpec {
  const url = spec.url.trim();
  const city = spec.city.trim();
  const state = spec.state.trim().toUpperCase();
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(`${spec.property_name}: url required (http/https)`);
  }
  if (!city) {
    throw new Error(`${spec.property_name}: city required`);
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error(
      `${spec.property_name}: 2-letter US state required (got ${spec.state})`
    );
  }
  return { ...spec, url, city, state };
}

function baseRow(spec: InsertSpec, propertyId: string): Record<string, unknown> {
  const gated = assertRequired(spec);
  return {
    property_name: gated.property_name,
    site_name: gated.site_name ?? 'A-Frame',
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
    country: 'United States',
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
    unit_type: normalizeGlampingUnitTypeForStorage(
      gated.unit_type ?? CANONICAL
    ),
    quantity_of_units:
      gated.quantity_of_units != null ? String(gated.quantity_of_units) : null,
    property_total_sites:
      gated.property_total_sites != null
        ? String(gated.property_total_sites)
        : null,
    notes:
      gated.notes ??
      `[${TODAY}] A-Frame US discovery: verify rates, amenities, and exact coordinates before publishing.`,
  };
}

/** Verified net-new USA A-Frame properties (web + Hipcamp, 2026-07-13). */
const NEW_PROPERTIES: InsertSpec[] = [
  {
    property_name: 'Callicoon Hills',
    site_name: 'A-Frame Cabins',
    city: 'Callicoon Center',
    state: 'NY',
    zip_code: '12724',
    address: '1 Hills Resort Rd',
    url: 'https://callicoonhills.com/stay/a-frames/',
    unit_type: 'A-Frame',
    quantity_of_units: 6,
    property_total_sites: 6,
    description:
      'Historic Catskills resort (~2 hours from NYC) with a grove of seasonal A-frame glamping cabins on 23 acres. A-frames feature floor-to-ceiling windows, queen beds, Wi-Fi/electricity, and a shared bathhouse; open May–October. Covered by Travel + Leisure and callicoonhills.com.',
    notes:
      '[2026-07-13] Verified A-Frame product on callicoonhills.com/stay/a-frames. Confirm exact A-frame count and ADR before publishing.',
  },
  {
    property_name: 'The Charmadillo',
    site_name: 'A-Frame Cabins',
    city: 'Center Point',
    state: 'TX',
    url: 'https://www.thecharmadillo.com/lodging',
    unit_type: 'A-Frame',
    quantity_of_units: 7,
    property_total_sites: 7,
    description:
      'Nature-based glamping resort on 44 acres between Center Point and Camp Verde, TX. Seven private 180 sq ft temperature-controlled A-frame cabins with decks; shared bathroom, shower house, kitchen, sauna, and stock-tank pools. Also offers bell tent / RV / tent sites.',
    notes:
      '[2026-07-13] Verified 7 A-frames on thecharmadillo.com. Shared baths — confirm amenity flags before publishing.',
  },
  {
    property_name: 'Punkin Hollow Resort',
    site_name: 'A-Frame Cabins',
    city: 'Stanton',
    state: 'KY',
    zip_code: '40380',
    url: 'https://www.hipcamp.com/en-US/land/kentucky-punkin-hollow-resort-ex9h5q6d',
    unit_type: 'A-Frame',
    quantity_of_units: 5,
    property_total_sites: 5,
    description:
      'Glamping at Punkin Hollow Resort near Red River Gorge / Stanton, KY. Five private A-frame cabins with decks on ~340 acres with trails, ponds, and creeks; shared clubhouse kitchen and bathrooms. Listed on Hipcamp as A Frame lodging.',
    notes:
      '[2026-07-13] Verified via Hipcamp + Glamping Hub. Prefer official booking URL if found before publishing.',
  },
  {
    property_name: 'Nolla A-Frames Near Yosemite',
    site_name: 'Nolla A-Frame',
    city: 'Colfax Springs',
    state: 'CA',
    url: 'https://nollacabins.com/destinations/yosemite',
    unit_type: 'A-Frame',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Off-grid Finnish Nolla A-frame cabins near Highway 120 / Yosemite west entrance (Colfax Springs / Groveland area). Three minimalist insulated A-frames with solar charging, linens, and composting toilets; hot showers at sister property. Booked via Hipcamp / nollacabins.com.',
    notes:
      '[2026-07-13] Verified via nollacabins.com + Hipcamp. City listed as Colfax Springs on Hipcamp; confirm pin vs Groveland.',
  },
  {
    property_name: 'Bentonville Bike Camp',
    site_name: 'Mini A-Frames',
    city: 'Bentonville',
    state: 'AR',
    zip_code: '72712',
    address: '8658 Spanker Creek Rd',
    url: 'https://bentonvillebikecamp.com',
    unit_type: 'A-Frame',
    quantity_of_units: 3,
    property_total_sites: 3,
    description:
      'Bike-oriented campground near Bentonville, AR trail systems with mini A-frame glamping units (e.g. Lucky 1, The StingRay, The Penny Farthing) plus RV/tent sites. Indoor bathrooms, hot showers, bike wash. Book direct or via Hipcamp/Campspot.',
    notes:
      '[2026-07-13] Verified mini A-frames on Hipcamp + Campspot. Confirm exact A-frame count on site before publishing.',
  },
  {
    property_name: 'Bear Woods Resort and Campground',
    site_name: 'A-Frame Cabins',
    city: 'Bear Lake',
    state: 'MI',
    zip_code: '49614',
    address: '9061 13 Mile Road',
    url: 'https://www.hipcamp.com/en-US/land/michigan-bear-woods-resort-and-campground-6p0hq505',
    unit_type: 'A-Frame',
    quantity_of_units: 4,
    property_total_sites: 4,
    description:
      'Northern Michigan resort/campground on ~65 acres near Bear Lake with modern A-frame cabins (king bed, pull-out, kitchenette, AC), glamping tents, and RV sites. Shared bathhouse with private shower suites. Marketed as A-frame lodging on Hipcamp/RoverPass.',
    notes:
      '[2026-07-13] Verified A-frame cabins via Hipcamp/RoverPass. Confirm official domain and exact cabin count before publishing.',
  },
  {
    property_name: '22 West Cabins & Recreation',
    site_name: 'Moose Haven A-Frame',
    city: 'Walden',
    state: 'CO',
    url: 'https://www.22west.net/',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Guest cabin resort southwest of Walden, CO at the foot of Mount Zirkel Wilderness / Routt National Forest. Moose Haven is a solar-powered A-frame cabin (sleeps ~5) with wood stove and composting toilet; trails into national forest from the property.',
    notes:
      '[2026-07-13] Verified Moose Haven A-frame via 22west.net + Hipcamp. Confirm whether additional A-frames exist on property.',
  },
  {
    property_name: 'Fall Creek Retreats',
    site_name: 'Transforming A-Frame',
    city: 'Purlear',
    state: 'NC',
    address: '2598 Fall Creek Road',
    url: 'https://fallcreekretreats.com/transforming-a-frame/',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Creek-side glamping near Boone / Purlear, NC with a Transforming A-Frame cabin (swing-open wall, deck, double bed, dry-flush toilet). Shared pavilion shower; also offers geodome and cabin products on the same property.',
    notes:
      '[2026-07-13] Verified via fallcreekretreats.com + Hipcamp. Confirm sibling Dome/Cabin rows if needed later.',
  },
  {
    property_name: 'Piney Hills Campground',
    site_name: 'A-Frame Cabins',
    city: 'Mauk',
    state: 'GA',
    zip_code: '31058',
    address: '348 Averett Rd',
    phone_number: '(478) 227-6006',
    url: 'https://pineyhillscampground.com/',
    unit_type: 'A-Frame',
    quantity_of_units: 2,
    property_total_sites: 2,
    description:
      'Farm campground on 100+ acres in Mauk, GA with two bookable A-frame cabins (XL loft A-frame sleeps 4; smaller A-frame sleeps 2), plus RV/tent sites. A/C, mini fridge, microwave; shared bathhouse nearby.',
    notes:
      '[2026-07-13] Verified 2 A-frames on pineyhillscampground.com + Hipcamp.',
  },
  {
    property_name: 'Solstice Farms',
    site_name: 'A-Frame Microcabin',
    city: 'Loomis',
    state: 'CA',
    url: 'https://www.farmstayca.com/book-a-room',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Organic citrus farm stay in Loomis, CA with an A-Frame microcabin in a eucalyptus grove (queen bed, A/C, patio, propane fire pit; shared bathroom ~120 ft). Also offers vintage Airstreams and glamping tent.',
    notes:
      '[2026-07-13] Verified A-Frame via farmstayca.com + Hipcamp. Confirm address/coords before publishing.',
  },
  {
    property_name: 'Crystal Ranch',
    site_name: 'A-Frame Cabins',
    city: 'Golden',
    state: 'CO',
    url: 'https://www.hipcamp.com/en-US/land/colorado-crystal-ranch-v1qh97yx',
    unit_type: 'A-Frame',
    quantity_of_units: 2,
    property_total_sites: 2,
    description:
      'Mountain retreat in Coal Creek Valley near Golden, CO (~8,000 ft) with two tiny A-frame cabins (Basecamp and Stargazer). Seasonal outdoor shower and porta-potty; BYO bedding. Also hosts dome/bell tent products on the sanctuary campus.',
    notes:
      '[2026-07-13] Verified 2 A-frames via Hipcamp + selahmind.com/crystal-ranch. Prefer official booking URL before publishing.',
  },
  {
    property_name: 'The Ridge at Stanley Gap',
    site_name: 'A-Frame',
    city: 'Blue Ridge',
    state: 'GA',
    url: 'https://www.hipcamp.com/en-GB/land/georgia-the-ridge-at-stanley-gap-9mxhzddj',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Hipcamp lodging near Blue Ridge, GA listed as A Frame at The Ridge at Stanley Gap. Mountain setting in North Georgia; verify official website and amenities before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL, qty, and ADR before publishing.',
  },
  {
    property_name: 'Happy Hollow Homestead',
    site_name: 'A-Frame',
    city: 'Marengo',
    state: 'IN',
    url: 'https://www.hipcamp.com/en-GB/land/indiana-happy-hollow-homestead-3pw1hmxd',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Hipcamp A Frame lodging at Happy Hollow Homestead in Marengo, IN. Homestead/glamping setting; verify official website, unit count, and rates before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL and amenities before publishing.',
  },
  {
    property_name: 'Noble Pine Campground',
    site_name: 'A-Frame',
    city: 'Mammoth Cave',
    state: 'KY',
    url: 'https://www.hipcamp.com/en-GB/land/kentucky-noble-pine-campground-2ejhzln8',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Campground near Mammoth Cave, KY with Hipcamp A Frame lodging. Verify official website, exact A-frame count, and rates before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL and amenities before publishing.',
  },
  {
    property_name: 'Good Creek Meadows',
    site_name: 'A-Frame',
    city: 'Olney',
    state: 'MT',
    url: 'https://www.hipcamp.com/en-GB/land/montana-good-creek-meadows-2ejhzmq1',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Hipcamp A Frame lodging at Good Creek Meadows near Olney, MT. Verify official website, unit count, and rates before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL and amenities before publishing.',
  },
  {
    property_name: 'Maine Guide Company',
    site_name: 'A-Frame',
    city: 'Carmel',
    state: 'ME',
    url: 'https://www.hipcamp.com/en-GB/land/maine-maine-guide-company-2ejh6own',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Hipcamp A Frame lodging associated with Maine Guide Company in Carmel, ME. Verify official website, unit count, and rates before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL and amenities before publishing.',
  },
  {
    property_name: 'Willenborg Woods',
    site_name: 'A-Frame',
    city: 'Charleston',
    state: 'IL',
    url: 'https://www.hipcamp.com/en-GB/land/illinois-willenborg-woods-y0zhqem8',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 1,
    description:
      'Hipcamp A Frame lodging at Willenborg Woods in Charleston, IL. Verify official website, unit count, and rates before publishing.',
    notes:
      '[2026-07-13] Seeded from Hipcamp A Frame gap queue. Confirm official URL and amenities before publishing.',
  },
];

/** Sibling A-Frame row at existing Sage property. */
const SIBLING_INSERTS: InsertSpec[] = [
  {
    property_name: 'The Hohnstead Glamping Cabins',
    site_name: 'Transforming A-Frame',
    city: 'Bonner',
    state: 'MT',
    zip_code: '59823',
    address: '7012 Anarchy Ave',
    url: 'https://www.thehohnstead.com/transforming-aframe-cabin-missoula',
    unit_type: 'A-Frame',
    quantity_of_units: 1,
    property_total_sites: 5,
    lat: 46.936375,
    lon: -113.6875034,
    existing_property_id: 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6',
    description:
      'The Hohnstead near Missoula, MT — hand-built off-grid Transforming A-Frame cabin with rope-operated open wall for forest/mountain views. Shared commons (kitchen, Wi-Fi, showers) and hot tub; seasonal June–September. Sibling to existing Cabin inventory row.',
    notes:
      '[2026-07-13] Sibling insert: property already in Sage as Cabin (id 9610). A-Frame is a distinct product on thehohnstead.com.',
  },
];

async function propertyExists(
  name: string,
  city: string,
  state: string
): Promise<boolean> {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('property_name', name)
    .eq('city', city)
    .eq('state', state)
    .limit(1);
  return Boolean(data?.length);
}

async function propertyHasAFrame(propertyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, unit_type')
    .eq('property_id', propertyId);
  if (error) throw new Error(`A-Frame check ${propertyId}: ${error.message}`);
  return (data ?? []).some(
    (r) => String(r.unit_type ?? '') === CANONICAL
  );
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Discovery source: ${DISCOVERY_SOURCE}\n`);

  const sqlLines: string[] = [
    `-- USA A-Frame curated inserts (${TODAY})`,
    `-- discovery_source: ${DISCOVERY_SOURCE}`,
    `-- Applied via scripts/insert-a-frame-us-2026-07-13.ts`,
    '',
  ];

  let insertedProperties = 0;
  let insertedRows = 0;
  let skipped = 0;

  console.log('A) Net-new A-Frame properties');
  console.log('-'.repeat(60));
  for (const spec of NEW_PROPERTIES) {
    const gated = assertRequired(spec);
    if (await propertyExists(gated.property_name, gated.city, gated.state)) {
      console.log(
        `SKIP ${gated.property_name} (${gated.city}, ${gated.state}) — already exists`
      );
      skipped += 1;
      continue;
    }
    const propertyId = randomUUID();
    const row = baseRow(gated, propertyId);
    console.log(
      `INSERT ${gated.property_name} (${gated.city}, ${gated.state}) qty=${gated.quantity_of_units ?? '?'}`
    );
    sqlLines.push(
      `-- INSERT ${gated.property_name} (${gated.city}, ${gated.state}) property_id=${propertyId}`
    );
    insertedProperties += 1;
    insertedRows += 1;
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert ${gated.property_name}: ${error.message}`);
    }
  }

  console.log('\nB) Sibling A-Frame inserts');
  console.log('-'.repeat(60));
  for (const spec of SIBLING_INSERTS) {
    const gated = assertRequired(spec);
    const propertyId = gated.existing_property_id;
    if (!propertyId) {
      console.log(`SKIP ${gated.property_name} — missing existing_property_id`);
      skipped += 1;
      continue;
    }
    if (await propertyHasAFrame(propertyId)) {
      console.log(`SKIP ${gated.property_name} — already has A-Frame row`);
      skipped += 1;
      continue;
    }
    const row = baseRow(gated, propertyId);
    console.log(
      `INSERT sibling ${gated.property_name} / ${gated.site_name} (property_id=${propertyId})`
    );
    sqlLines.push(
      `-- INSERT sibling ${gated.property_name} / ${gated.site_name} property_id=${propertyId}`
    );
    insertedRows += 1;
    if (DRY_RUN) {
      console.log(JSON.stringify(row, null, 2));
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) throw new Error(`Insert sibling ${gated.property_name}: ${error.message}`);
    }
  }

  const sqlPath = join(OUT_DIR, `insert-a-frame-us-${TODAY}.sql`);
  writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf-8');

  const migrationPath = resolve(
    process.cwd(),
    `scripts/migrations/insert-a-frame-us-${TODAY}.sql`
  );
  writeFileSync(
    migrationPath,
    [
      `-- USA A-Frame curated inserts (${TODAY})`,
      `-- discovery_source: ${DISCOVERY_SOURCE}`,
      `-- Rows applied via TypeScript insert script (UUID property_ids generated at runtime).`,
      `-- Net-new properties: ${NEW_PROPERTIES.length}`,
      `-- Sibling inserts: ${SIBLING_INSERTS.length}`,
      `-- See scripts/.tmp-a-frame-review/insert-a-frame-us-${TODAY}.sql for run log.`,
      '',
      ...sqlLines,
      '',
    ].join('\n'),
    'utf-8'
  );

  console.log(
    `\nSummary: ${insertedProperties} new propert(ies), ${insertedRows} row(s), skipped=${skipped} (${DRY_RUN ? 'would be' : 'were'} inserted)`
  );
  console.log(`SQL log: ${sqlPath}`);
  console.log(`Migration: ${migrationPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
