#!/usr/bin/env npx tsx
/**
 * Test script: Collect 10 campsites and add to database
 * This verifies the collection process works before running the full collection
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createRIDBClient } from '../lib/ridb-api';
import {
  RIDBCampsite,
  RIDBFacility,
  RIDBRecArea,
  RIDBCampsiteRecord,
} from '../lib/types/ridb';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const ridbApiKey = process.env.RIDB_API_KEY;

if (!supabaseUrl || !secretKey || !ridbApiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const CAMPSITES_TABLE = 'ridb_campsites';
const MAX_CAMPSITES = 10;

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ridbClient = createRIDBClient();

// Camping facility type keywords
const CAMPING_FACILITY_KEYWORDS = [
  'campground',
  'camping',
  'rv',
  'tent',
  'campsite',
  'backcountry',
  'primitive',
  'group camp',
];

function isCampingFacility(facility: RIDBFacility): boolean {
  const facilityType = (facility.FacilityTypeDescription || '').toLowerCase();
  const facilityName = (facility.FacilityName || '').toLowerCase();
  
  return CAMPING_FACILITY_KEYWORDS.some(keyword => 
    facilityType.includes(keyword) || facilityName.includes(keyword)
  );
}

function calculateCompletenessScore(campsite: RIDBCampsiteRecord): number {
  const fields = [
    'name',
    'campsite_type',
    'campsite_use_type',
    'loop',
    'site',
    'campsite_accessible',
    'latitude',
    'longitude',
    'created_date',
    'last_updated_date',
    'facility_name',
    'facility_address',
    'facility_city',
    'facility_state',
    'facility_reservation_url',
    'facility_use_fee_description',
    'facility_website_url',
    'campsite_reservable',
    'campsite_booking_url',
    'recarea_name',
    'organization_name',
    'attributes',
    'permitted_equipment',
    'media',
    'entity_media',
  ];

  let score = 0;
  fields.forEach(field => {
    const value = campsite[field as keyof RIDBCampsiteRecord];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) score += 1;
      } else {
        score += 1;
      }
    }
  });

  return Math.round((score / fields.length) * 100);
}

async function convertCampsiteToRecord(
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  recArea: RIDBRecArea | null,
  organizationName: string | null
): Promise<RIDBCampsiteRecord> {
  const primaryAddress = facility?.FacilityAddresses?.[0];
  
  // Extract website URL from facility LINK array if available
  const facilityLinks = (facility as any)?.LINK || [];
  const websiteLink = facilityLinks.find((link: any) => 
    link?.LinkType?.toLowerCase().includes('website') || 
    link?.LinkType?.toLowerCase().includes('official')
  );
  const facilityWebsiteUrl = websiteLink?.URL || null;
  
  const record: RIDBCampsiteRecord = {
    ridb_campsite_id: campsite.CampsiteID,
    name: campsite.CampsiteName || 'Unnamed Campsite',
    campsite_type: campsite.CampsiteType || null,
    campsite_use_type: campsite.TypeOfUse || null,
    loop: campsite.Loop || null,
    site: campsite.Site || null,
    site_access: campsite.SiteAccess || null,
    campsite_accessible: campsite.CampsiteAccessible ?? null,
    campsite_reservable: campsite.CampsiteReservable ?? (campsite as any).CAMPSITERESERVABLE ?? null,
    campsite_booking_url: campsite.CampsiteID ? `https://www.recreation.gov/camping/campsites/${campsite.CampsiteID}` : null,
    // Handle coordinates: 0,0 means no coordinates (use null), otherwise use the value
    latitude: campsite.CampsiteLatitude && campsite.CampsiteLatitude !== 0 ? campsite.CampsiteLatitude : null,
    longitude: campsite.CampsiteLongitude && campsite.CampsiteLongitude !== 0 ? campsite.CampsiteLongitude : null,
    description: null,
    created_date: campsite.CreatedDate || null,
    last_updated_date: campsite.LastUpdatedDate || null,
    facility_id: campsite.FacilityID || null,
    facility_name: facility?.FacilityName || null,
    facility_type: facility?.FacilityTypeDescription || null,
    facility_latitude: facility?.FacilityLatitude || null,
    facility_longitude: facility?.FacilityLongitude || null,
    facility_address: primaryAddress?.FacilityStreetAddress1 || null,
    facility_city: primaryAddress?.City || null,
    facility_state: primaryAddress?.AddressStateCode || null,
    facility_postal_code: primaryAddress?.PostalCode || null,
    facility_reservable: facility?.Reservable || null,
    facility_reservation_url: facility?.FacilityReservationURL || null,
    facility_use_fee_description: facility?.FacilityUseFeeDescription || (facility as any)?.FacilityUseFeeDescription || null,
    facility_website_url: facilityWebsiteUrl,
    facility_phone: facility?.FacilityPhone || null,
    facility_email: facility?.FacilityEmail || null,
    recarea_id: facility?.RecAreaID || facility?.ParentRecAreaID || null,
    recarea_name: recArea?.RecAreaName || facility?.RecAreaName || facility?.ParentRecAreaName || null,
    recarea_latitude: recArea?.RecAreaLatitude || null,
    recarea_longitude: recArea?.RecAreaLongitude || null,
    organization_id: facility?.OrganizationID || null,
    organization_name: organizationName || null,
    // Handle both PascalCase (from types) and UPPERCASE (from API) field names
    attributes: campsite.Attributes || (campsite as any).ATTRIBUTES || null,
    permitted_equipment: campsite.PermittedEquipment || (campsite as any).PERMITTEDEQUIPMENT || null,
    media: campsite.Media || (campsite as any).MEDIA || null,
    entity_media: campsite.EntityMedia || (campsite as any).ENTITYMEDIA || null,
    last_synced_at: new Date().toISOString(),
    data_completeness_score: null,
  };

  record.data_completeness_score = calculateCompletenessScore(record);
  return record;
}

async function enrichCampsite(
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  organizationName: string | null
): Promise<RIDBCampsiteRecord> {
  // Fetch full facility details to get LINK array and FacilityUseFeeDescription
  let fullFacility = facility;
  if (facility?.FacilityID && (!(facility as any).LINK || !facility.FacilityUseFeeDescription)) {
    const fetchedFacility = await ridbClient.getFacility(facility.FacilityID);
    if (fetchedFacility) {
      fullFacility = fetchedFacility;
    }
  }
  
  const [attributes, media, recArea] = await Promise.all([
    ridbClient.getCampsiteAttributes(campsite.CampsiteID),
    ridbClient.getCampsiteMedia(campsite.CampsiteID),
    fullFacility?.RecAreaID || fullFacility?.ParentRecAreaID
      ? ridbClient.getRecArea(fullFacility.RecAreaID || fullFacility.ParentRecAreaID || '')
      : Promise.resolve(null),
  ]);

  // Handle both PascalCase (from types) and UPPERCASE (from API) field names
  const apiCampsite = campsite as any;
  const enrichedCampsite: RIDBCampsite = {
    ...campsite,
    Attributes: campsite.Attributes || apiCampsite.ATTRIBUTES || (attributes.length > 0 ? attributes : undefined),
    Media: campsite.Media || apiCampsite.MEDIA || (media.length > 0 ? media : undefined),
    PermittedEquipment: campsite.PermittedEquipment || apiCampsite.PERMITTEDEQUIPMENT || undefined,
    EntityMedia: campsite.EntityMedia || apiCampsite.ENTITYMEDIA || undefined,
  };

  return convertCampsiteToRecord(enrichedCampsite, fullFacility, recArea, organizationName);
}

async function testCollection() {
  console.log('='.repeat(70));
  console.log('Test: Collect 10 Campsites');
  console.log('='.repeat(70));
  console.log('');

  try {
    // Step 1: Fetch first page of facilities
    console.log('📥 Fetching facilities (first page only)...');
    const response = await fetch(
      'https://ridb.recreation.gov/api/v1/facilities?limit=50&offset=0',
      {
        headers: {
          'apikey': ridbApiKey,
          'Accept': 'application/json',
        },
      }
    );
    const data = await response.json();
    const facilities = data.RECDATA || [];
    console.log(`✅ Fetched ${facilities.length} facilities\n`);

    // Step 2: Filter for camping facilities
    console.log('🔍 Filtering for camping facilities...');
    const campingFacilities = facilities.filter(isCampingFacility);
    console.log(`✅ Found ${campingFacilities.length} camping facilities\n`);

    if (campingFacilities.length === 0) {
      console.log('❌ No camping facilities found in first page. Try fetching more pages.');
      return;
    }

    // Step 3: Collect campsites from first few camping facilities
    console.log('📥 Collecting campsites...');
    const campsiteRecords: RIDBCampsiteRecord[] = [];
    let facilitiesChecked = 0;

    for (const facility of campingFacilities) {
      if (campsiteRecords.length >= MAX_CAMPSITES) break;

      facilitiesChecked++;
      console.log(`   Checking facility ${facilitiesChecked}: ${facility.FacilityName}...`);

      try {
        // Fetch organization
        let organizationName: string | null = null;
        if (facility.OrganizationID) {
          const org = await ridbClient.getOrganization(facility.OrganizationID);
          organizationName = org?.OrganizationName || null;
        }

        // Fetch campsites for this facility
        const campsites = await ridbClient.getFacilityCampsites(facility.FacilityID);
        console.log(`      Found ${campsites.length} campsites`);

        // Process campsites (limit to what we need)
        const needed = MAX_CAMPSITES - campsiteRecords.length;
        const campsitesToProcess = campsites.slice(0, needed);

        for (const campsite of campsitesToProcess) {
          const enriched = await enrichCampsite(campsite, facility, organizationName);
          campsiteRecords.push(enriched);
          console.log(`      ✅ Processed: ${enriched.name}`);
        }
      } catch (error) {
        console.error(`      ❌ Error processing facility:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`\n✅ Collected ${campsiteRecords.length} campsites\n`);

    if (campsiteRecords.length === 0) {
      console.log('❌ No campsites collected. Check API connection and facility filtering.');
      return;
    }

    // Step 4: Insert into database
    console.log('💾 Inserting campsites into database...');
    const { error, data: insertedData } = await supabase
      .from(CAMPSITES_TABLE)
      .upsert(campsiteRecords, { onConflict: 'ridb_campsite_id' })
      .select();

    if (error) {
      console.error('❌ Error inserting campsites:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted ${insertedData?.length || campsiteRecords.length} campsites\n`);

    // Step 5: Display summary
    console.log('='.repeat(70));
    console.log('Test Results Summary');
    console.log('='.repeat(70));
    console.log(`Total campsites collected: ${campsiteRecords.length}`);
    console.log(`Total campsites inserted: ${insertedData?.length || campsiteRecords.length}`);
    console.log('');

    // Show sample data
    if (campsiteRecords.length > 0) {
      const sample = campsiteRecords[0];
      console.log('Sample campsite data:');
      console.log(`  ID: ${sample.ridb_campsite_id}`);
      console.log(`  Name: ${sample.name}`);
      console.log(`  Type: ${sample.campsite_type}`);
      console.log(`  Use Type: ${sample.campsite_use_type}`);
      console.log(`  Loop: ${sample.loop || 'N/A'}`);
      console.log(`  Site: ${sample.site || 'N/A'}`);
      console.log(`  Accessible: ${sample.campsite_accessible ?? 'N/A'}`);
      console.log(`  Coordinates: (${sample.latitude}, ${sample.longitude})`);
      console.log(`  Facility: ${sample.facility_name || 'N/A'}`);
      console.log(`  State: ${sample.facility_state || 'N/A'}`);
      console.log(`  Reservable: ${sample.campsite_reservable ?? 'N/A'}`);
      console.log(`  Booking URL: ${sample.campsite_booking_url || 'N/A'}`);
      console.log(`  Facility Rate: ${sample.facility_use_fee_description ? sample.facility_use_fee_description.replace(/<[^>]*>/g, '').substring(0, 50) + '...' : 'N/A'}`);
      console.log(`  Facility Website: ${sample.facility_website_url || 'N/A'}`);
      console.log(`  Attributes: ${sample.attributes?.length || 0} items`);
      console.log(`  Permitted Equipment: ${sample.permitted_equipment?.length || 0} items`);
      console.log(`  Media: ${sample.media?.length || 0} items`);
      console.log(`  Entity Media: ${sample.entity_media?.length || 0} items`);
      console.log(`  Completeness Score: ${sample.data_completeness_score}%`);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('   You can now run the full collection script:');
    console.log('   npx tsx scripts/collect-ridb-campsites.ts');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testCollection().catch(console.error);

