#!/usr/bin/env npx tsx
/**
 * Enrich Del Rio Ranch (all_sage_data) with Atascadero City Council approved
 * master plan details: acreage, unit mix, amenities, and development status.
 *
 * Usage:
 *   npx tsx scripts/apply-del-rio-ranch-enrichment-2026-07-08.ts
 *   npx tsx scripts/apply-del-rio-ranch-enrichment-2026-07-08.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const PROPERTY_NAME = 'Del Rio Ranch';
const RESEARCH_TAG = 'del_rio_ranch_master_plan_2026_07_08';
const TODAY = '2026-07-08';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const DESCRIPTION = `Del Rio Ranch is an approved 26-acre outdoor glamping, hotel, and RV resort at 2055 El Camino Real in Atascadero, California—on the southeast corner of Del Rio Road and El Camino Real (a vacant parcel formerly slated for a Walmart). Developed by Cal Coast Communities, the destination received final unanimous design approvals from the Atascadero City Council after more than a decade of entitlement review. The master-planned layout blends high-end outdoor lodging with commercial and community amenities: 70 glamping accommodations (custom safari cabanas, standalone cabins, and retro Airstream trailers, with select premium sites offering private hot tubs), 98 premium RV spaces with full electric/sewer/water hookups plus barbecue pits and fire zones, and an 18-room boutique hotel in a three-story Mediterranean-style building above a ground-floor commercial plaza (~22,000 sq ft retail). Resort amenities include a central clubhouse and recreation center, a membership-based public pool, a private guest-only pool, dedicated spa buildings, an outdoor event lawn, open-air amphitheater, and central restaurant. Design and environmental approvals are finalized; construction on commercial plazas and camp infrastructure is proceeding. The resort sits directly across the intersection from the anticipated Del Rio Marketplace development—verify construction progress and opening before publishing live booking data.`;

const ADDRESS =
  '2055 El Camino Real, southeast corner Del Rio Road & El Camino Real, Atascadero, CA (26 acres; former Walmart site)';

const AMENITIES_RAW =
  'Approved master plan (Atascadero City Council, Jan 2025): 26-acre Cal Coast Communities resort; 70 glamping (safari cabanas, cabins, Airstream trailers; select premium sites w/ private hot tubs); 98 full-hookup RV sites w/ BBQ/fire zones; 18 boutique hotel rooms over ~22,000 sf commercial plaza; clubhouse/recreation center; public membership pool + private guest pool; spa buildings; event lawn; amphitheater; restaurant; across from Del Rio Marketplace.';

const URL = 'https://calcoastalcommunities.com/del-rio-ranch/';

const SHARED_AMENITY_PATCH = {
  property_pool: 'Yes',
  property_sauna: 'Yes',
  property_restaurant: 'Yes',
  property_clubhouse: 'Yes',
  property_food_on_site: 'Yes',
  property_alcohol_available: 'Yes',
  property_family_friendly: 'Yes',
  activities_swimming: 'Yes',
  unit_campfires: 'Yes',
  setting_ranch: 'Yes',
  setting_suburban: 'Yes',
  amenities_raw: AMENITIES_RAW,
  land_operator_category: 'private_commercial',
};

const SHARED_PROPERTY_PATCH = {
  ...SHARED_AMENITY_PATCH,
  property_type: 'Glamping Resort',
  address: ADDRESS,
  url: URL,
  description: DESCRIPTION,
  property_total_sites: '70',
  year_site_opened: null,
  planned_open_date: '2027-06-01',
  date_updated: TODAY,
};

function appendNote(existing: string | null | undefined, addition: string): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}

const RESEARCH_NOTE = `${RESEARCH_TAG}: Atascadero council approved master plan — 26 acres, 70 glamping (cabanas/cabins/Airstream), 98 RV sites, 18 hotel rooms, ~22k sf retail, clubhouse/pools/spa/amphitheater/restaurant; per-SKU glamping counts TBD.`;

type UnitSkuSpec = {
  unit_type: string;
  site_name: string;
  quantity_of_units: string | null;
  is_primary: boolean;
};

const GLAMPING_SKUS: UnitSkuSpec[] = [
  {
    unit_type: 'Safari Tent',
    site_name: 'Custom safari cabana',
    quantity_of_units: '70',
    is_primary: true,
  },
  {
    unit_type: 'Cabin',
    site_name: 'Standalone cabin',
    quantity_of_units: null,
    is_primary: false,
  },
  {
    unit_type: 'Airstream',
    site_name: 'Retro Airstream trailer',
    quantity_of_units: null,
    is_primary: false,
  },
];

async function main(): Promise<void> {
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id,property_name,site_name,unit_type,quantity_of_units,property_total_sites,notes,property_id,slug,state,city,lat,lon,is_open')
    .eq('property_name', PROPERTY_NAME)
    .order('id');

  if (error) throw new Error(error.message);
  if (!rows?.length) throw new Error(`No rows found for ${PROPERTY_NAME}`);

  const anchor = rows[0]!;
  const propertyId = anchor.property_id;
  const slug = anchor.slug ?? 'del-rio-ranch';
  const isOpen = anchor.is_open ?? 'Proposed Development';

  for (const sku of GLAMPING_SKUS) {
    const normalizedType = normalizeGlampingUnitTypeForStorage(sku.unit_type);
    const existing = rows.find((r) => r.unit_type === normalizedType);

    const rowPatch = {
      ...SHARED_PROPERTY_PATCH,
      site_name: sku.site_name,
      unit_type: normalizedType,
      quantity_of_units: sku.quantity_of_units,
      notes: appendNote(existing?.notes, RESEARCH_NOTE),
    };

    if (existing) {
      console.log(`PATCH ${normalizedType} row id=${existing.id}`, JSON.stringify(rowPatch, null, 2));
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from(TABLE)
          .update(rowPatch)
          .eq('id', existing.id);
        if (updateError) throw new Error(`${normalizedType} update: ${updateError.message}`);
      }
      continue;
    }

    const insertRow = {
      research_status: 'in_progress',
      is_glamping_property: 'Yes',
      is_open: isOpen,
      property_name: PROPERTY_NAME,
      site_name: sku.site_name,
      slug,
      property_id: propertyId,
      property_type: 'Glamping Resort',
      unit_type: normalizedType,
      source: 'Sage',
      discovery_source: RESEARCH_TAG,
      country: 'United States',
      state: anchor.state ?? 'CA',
      city: anchor.city ?? 'Atascadero',
      zip_code: '93422',
      address: ADDRESS,
      lat: anchor.lat ?? 35.513216,
      lon: anchor.lon ?? -120.696384,
      url: URL,
      description: DESCRIPTION,
      quantity_of_units: sku.quantity_of_units,
      property_total_sites: '70',
      planned_open_date: '2027-06-01',
      date_added: TODAY,
      date_updated: TODAY,
      land_operator_category: 'private_commercial',
      notes: RESEARCH_NOTE,
      ...SHARED_AMENITY_PATCH,
    };

    console.log(`INSERT ${normalizedType} sibling row`, JSON.stringify(insertRow, null, 2));
    if (!DRY_RUN) {
      const { error: insertError } = await supabase.from(TABLE).insert(insertRow);
      if (insertError) throw new Error(`${normalizedType} insert: ${insertError.message}`);
    }
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nDel Rio Ranch enrichment applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
