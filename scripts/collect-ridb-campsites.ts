#!/usr/bin/env npx tsx
/**
 * Collect campsite data from recreation.gov RIDB API
 * 
 * This script:
 * - Fetches all facilities and filters for camping facilities
 * - Fetches all campsites from camping facilities
 * - Enriches campsites with attributes, media, and parent data
 * - Batches inserts for performance
 * - Tracks progress to enable resume capability
 * 
 * Usage:
 *   npx tsx scripts/collect-ridb-campsites.ts
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
  RIDBCollectionProgress,
} from '../lib/types/ridb';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const ridbApiKey = process.env.RIDB_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

if (!ridbApiKey) {
  console.error('❌ Missing RIDB API key');
  console.error('Please ensure RIDB_API_KEY is set in .env.local');
  process.exit(1);
}

const CAMPSITES_TABLE = 'ridb_campsites';
const PROGRESS_TABLE = 'ridb_collection_progress';
const COLLECTION_TYPE = 'campsites';

// Configuration
const BATCH_SIZE = 25; // Number of campsites to collect before inserting to database
const COLLECTION_BATCH_SIZE = 100; // Max campsites to collect in memory before forcing insert (safety limit)

// Camping facility type keywords to filter
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

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const ridbClient = createRIDBClient();

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a facility is a camping facility
 */
function isCampingFacility(facility: RIDBFacility): boolean {
  const facilityType = (facility.FacilityTypeDescription || '').toLowerCase();
  const facilityName = (facility.FacilityName || '').toLowerCase();
  
  return CAMPING_FACILITY_KEYWORDS.some(keyword => 
    facilityType.includes(keyword) || facilityName.includes(keyword)
  );
}

/**
 * Calculate data completeness score for a campsite record
 */
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

/**
 * Convert RIDB campsite to database record
 */
async function convertCampsiteToRecord(
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  recArea: RIDBRecArea | null,
  organizationName: string | null
): Promise<RIDBCampsiteRecord> {
  // Get primary address from facility
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
    description: null, // RIDB doesn't provide campsite descriptions
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
    data_completeness_score: null, // Will be calculated after all data is set
  };

  // Calculate completeness score
  record.data_completeness_score = calculateCompletenessScore(record);

  return record;
}

/**
 * Load or create progress record
 */
async function loadProgress(): Promise<RIDBCollectionProgress | null> {
  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select('*')
    .eq('collection_type', COLLECTION_TYPE)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error loading progress:', error);
    return null;
  }

  return data || null;
}

/**
 * Update progress record
 */
async function updateProgress(
  facilityId: string | null,
  campsiteId: string | null,
  facilitiesProcessed: number,
  campsitesProcessed: number,
  status: 'in_progress' | 'completed' | 'paused' | 'error',
  errorMessage: string | null = null
): Promise<void> {
  const progress: Partial<RIDBCollectionProgress> = {
    collection_type: COLLECTION_TYPE,
    last_processed_facility_id: facilityId,
    last_processed_campsite_id: campsiteId,
    total_facilities_processed: facilitiesProcessed,
    total_campsites_processed: campsitesProcessed,
    last_updated: new Date().toISOString(),
    status,
    error_message: errorMessage,
  };

  const { error } = await supabase
    .from(PROGRESS_TABLE)
    .upsert(progress, { onConflict: 'collection_type' });

  if (error) {
    console.error('Error updating progress:', error);
  }
}

/**
 * Batch insert campsites
 */
async function batchInsertCampsites(campsites: RIDBCampsiteRecord[]): Promise<number> {
  if (campsites.length === 0) {
    console.warn(`   ⚠️  batchInsertCampsites called with empty array`);
    return 0;
  }

  // Log first and last campsite ID for debugging
  const firstId = campsites[0]?.ridb_campsite_id;
  const lastId = campsites[campsites.length - 1]?.ridb_campsite_id;
  console.log(`   💾 Upserting ${campsites.length} campsites (IDs: ${firstId}...${lastId})`);

  // Validate required fields
  const invalid = campsites.filter(c => !c.ridb_campsite_id || !c.name);
  if (invalid.length > 0) {
    console.error(`   ❌ Found ${invalid.length} campsites with missing required fields (ridb_campsite_id or name)`);
    console.error(`   Sample invalid:`, JSON.stringify(invalid[0], null, 2));
    throw new Error(`Invalid campsite data: missing required fields`);
  }

  try {
    // Insert/update campsites - simple approach like other working scripts
    const { data, error } = await supabase
      .from(CAMPSITES_TABLE)
      .upsert(campsites, { onConflict: 'ridb_campsite_id' })
      .select('ridb_campsite_id');

    if (error) {
      console.error(`❌ Database error: ${error.message}`);
      console.error(`   Attempted to insert ${campsites.length} campsites`);
      console.error(`   Error code: ${error.code}`);
      console.error(`   Error details:`, JSON.stringify(error, null, 2));
      console.error(`   First campsite sample:`, JSON.stringify(campsites[0], null, 2));
      throw new Error(`Failed to insert campsites: ${error.message}`);
    }

    // Verify we got data back
    const returnedCount = data?.length || 0;
    if (returnedCount > 0) {
      console.log(`   ✓ Upsert completed successfully - ${returnedCount} records returned`);
    } else {
      console.warn(`   ⚠️  Upsert completed but returned 0 records (this may be normal for updates)`);
    }

    return campsites.length;
  } catch (err) {
    console.error(`   ❌ Exception in batchInsertCampsites:`, err);
    throw err;
  }
}

/**
 * Fetch and enrich a single campsite
 */
async function enrichCampsite(
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  organizationName: string | null
): Promise<RIDBCampsiteRecord> {
  // Fetch full facility details to get LINK array and FacilityUseFeeDescription
  // (The facility from getAllFacilities might not include all fields)
  let fullFacility = facility;
  if (facility?.FacilityID && (!(facility as any).LINK || !facility.FacilityUseFeeDescription)) {
    const fetchedFacility = await ridbClient.getFacility(facility.FacilityID);
    if (fetchedFacility) {
      fullFacility = fetchedFacility;
    }
  }
  
  // Fetch additional campsite data
  const [attributes, media, recArea] = await Promise.all([
    ridbClient.getCampsiteAttributes(campsite.CampsiteID),
    ridbClient.getCampsiteMedia(campsite.CampsiteID),
    fullFacility?.RecAreaID || fullFacility?.ParentRecAreaID
      ? ridbClient.getRecArea(fullFacility.RecAreaID || fullFacility.ParentRecAreaID || '')
      : Promise.resolve(null),
  ]);

  // Merge attributes and media into campsite
  // Preserve all original campsite data including PermittedEquipment and EntityMedia
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

/**
 * Main collection function
 */
async function collectCampsites(): Promise<void> {
  console.log('='.repeat(70));
  console.log('RIDB Campsites Data Collection');
  console.log('='.repeat(70));
  console.log('');

  // Load progress
  const progress = await loadProgress();
  let lastFacilityId: string | null = progress?.last_processed_facility_id || null;
  let lastCampsiteId: string | null = progress?.last_processed_campsite_id || null;
  let facilitiesProcessed = progress?.total_facilities_processed || 0;
  let campsitesProcessed = progress?.total_campsites_processed || 0;
  let skipUntilFacility = lastFacilityId !== null;
  let skipUntilCampsite = lastCampsiteId !== null;

  console.log('📊 Progress Status:');
  console.log(`   Facilities processed: ${facilitiesProcessed}`);
  console.log(`   Campsites processed: ${campsitesProcessed}`);
  if (lastFacilityId) {
    console.log(`   Last facility ID: ${lastFacilityId}`);
  }
  if (lastCampsiteId) {
    console.log(`   Last campsite ID: ${lastCampsiteId}`);
  }
  console.log('');
  console.log(`⚙️  Configuration: Processing in batches of ${BATCH_SIZE} campsites`);
  console.log(`   (Campsites will be saved to database every ${BATCH_SIZE} items)\n`);

  // Update status to in_progress
  await updateProgress(lastFacilityId, lastCampsiteId, facilitiesProcessed, campsitesProcessed, 'in_progress');

  try {
    // DON'T fetch all facilities first - this takes 10+ minutes
    // Instead, fetch facilities page by page and process camping facilities immediately
    console.log('📥 Fetching facilities page by page and processing campsites as we go...\n');
    
    // Batch for collecting campsites
    let campsiteBatch: RIDBCampsiteRecord[] = [];
    let facilitiesChecked = 0;
    let page = 1;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      // Fetch one page of facilities
      console.log(`\n🔍 Fetching facilities page ${page}...`);
      const offset = (page - 1) * limit;
      
      const response = await fetch(
        `https://ridb.recreation.gov/api/v1/facilities?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'apikey': ridbApiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch facilities: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const facilities = data.RECDATA || [];
      const totalCount = data.METADATA?.RESULTS?.TOTAL_COUNT || 0;
      
      console.log(`   ✅ Found ${facilities.length} facilities on page ${page} (${offset + facilities.length}/${totalCount} total)`);

      if (facilities.length === 0) {
        hasMore = false;
        break;
      }

      // Filter for camping facilities on this page
      const campingFacilities = facilities.filter(isCampingFacility);
      console.log(`   🏕️  ${campingFacilities.length} camping facilities on this page`);

      // Process each camping facility immediately
      for (const facility of campingFacilities) {
        facilitiesChecked++;
        const facilityId = facility.FacilityID;

        // Skip if we've already processed this facility (resume logic)
        if (skipUntilFacility && lastFacilityId && facilityId !== lastFacilityId) {
          continue;
        }
        skipUntilFacility = false; // Once we find it, stop skipping

        console.log(`\n[${facilitiesChecked}] Processing facility: ${facility.FacilityName} (${facilityId})`);

        try {
          // Fetch organization name if available
          let organizationName: string | null = null;
          if (facility.OrganizationID) {
            const org = await ridbClient.getOrganization(facility.OrganizationID);
            organizationName = org?.OrganizationName || null;
          }

          // Fetch campsites for this facility
          const campsites = await ridbClient.getFacilityCampsites(facilityId);
          console.log(`   Found ${campsites.length} campsites`);

          if (campsites.length === 0) {
            facilitiesProcessed++;
            await updateProgress(facilityId, null, facilitiesProcessed, campsitesProcessed, 'in_progress');
            continue;
          }

        // Process each campsite
        let skipUntilThisCampsite = skipUntilCampsite && lastCampsiteId !== null;
        
        for (const campsite of campsites) {
          // Skip until we reach the last processed campsite
          if (skipUntilThisCampsite && campsite.CampsiteID !== lastCampsiteId) {
            continue;
          }
          skipUntilThisCampsite = false; // Once we find it, stop skipping
          skipUntilCampsite = false;

          try {
            // Enrich campsite with additional data
            const enrichedCampsite = await enrichCampsite(campsite, facility, organizationName);
            campsiteBatch.push(enrichedCampsite);
            campsitesProcessed++;
            
            // Show progress every 10 campsites
            if (campsitesProcessed % 10 === 0) {
              process.stdout.write(`   📍 Collected ${campsitesProcessed} campsites (batch: ${campsiteBatch.length}/${BATCH_SIZE})\r`);
            }

            // Insert batch if it reaches the batch size (25 campsites)
            if (campsiteBatch.length >= BATCH_SIZE) {
              console.log(`\n   📦 Batch of ${campsiteBatch.length} campsites ready - saving to database...`);
              try {
                const inserted = await batchInsertCampsites(campsiteBatch);
                if (inserted > 0) {
                  console.log(`   ✅ Successfully saved ${inserted} campsites to database (Total: ${campsitesProcessed} processed)`);
                  
                  // Update progress after each batch
                  await updateProgress(
                    facilityId,
                    campsite.CampsiteID,
                    facilitiesProcessed,
                    campsitesProcessed,
                    'in_progress'
                  );

                  campsiteBatch = []; // Clear batch only after successful insert
                  console.log(`   🔄 Continuing collection...\n`);
                } else {
                  console.error(`   ❌ Failed: batchInsertCampsites returned 0`);
                  throw new Error('Batch insert returned 0');
                }
              } catch (error) {
                console.error(`   ❌ Error saving batch to database:`, error);
                console.error(`   ⚠️  Batch will be retried on next save attempt`);
                // Don't clear the batch - let it retry
                throw error; // Re-throw to be caught by outer try-catch
              }
            }

            // Prevent memory issues - force insert if batch gets too large
            if (campsiteBatch.length >= COLLECTION_BATCH_SIZE) {
              console.log(`   ⚠️  Batch size limit reached, forcing insert...`);
              const inserted = await batchInsertCampsites(campsiteBatch);
              console.log(`   ✅ Inserted ${inserted} campsites`);
              
              await updateProgress(
                facilityId,
                campsite.CampsiteID,
                facilitiesProcessed,
                campsitesProcessed,
                'in_progress'
              );

              campsiteBatch = [];
            }
          } catch (error) {
            console.error(`   ❌ Error processing campsite ${campsite.CampsiteID}:`, error);
            // Continue with next campsite
          }
        }

        // Insert any remaining campsites in batch
        if (campsiteBatch.length > 0) {
          console.log(`\n   📦 Final batch of ${campsiteBatch.length} campsites - saving to database...`);
          try {
            const inserted = await batchInsertCampsites(campsiteBatch);
            if (inserted > 0) {
              console.log(`   ✅ Successfully saved ${inserted} campsites to database`);
              campsiteBatch = [];
            } else {
              console.error(`   ❌ Failed to save final batch - no records inserted!`);
            }
          } catch (error) {
            console.error(`   ❌ Error saving final batch:`, error);
            // Don't clear batch so it can be retried
          }
        }

        facilitiesProcessed++;
        await updateProgress(
          facilityId,
          campsites.length > 0 ? campsites[campsites.length - 1].CampsiteID : null,
          facilitiesProcessed,
          campsitesProcessed,
          'in_progress'
        );
      } catch (error) {
        console.error(`❌ Error processing facility ${facilityId}:`, error);
        // Update progress with error
        await updateProgress(
          facilityId,
          null,
          facilitiesProcessed,
          campsitesProcessed,
          'error',
          error instanceof Error ? error.message : String(error)
        );
        // Continue with next facility
      }
    }

    // Check if we should fetch more pages
    hasMore = offset + facilities.length < totalCount;
    page++;
    
    // Rate limit between pages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Insert any remaining campsites in final batch
    await updateProgress(
      null,
      null,
      facilitiesProcessed,
      campsitesProcessed,
      'completed'
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ Collection Complete!');
    console.log(`   Total facilities processed: ${facilitiesProcessed}`);
    console.log(`   Total campsites processed: ${campsitesProcessed}`);
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Collection failed:', error);
    await updateProgress(
      lastFacilityId,
      lastCampsiteId,
      facilitiesProcessed,
      campsitesProcessed,
      'error',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the collection
collectCampsites().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

