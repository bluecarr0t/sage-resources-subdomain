#!/usr/bin/env npx tsx
/**
 * Collect campsite data from recreation.gov RIDB API
 *
 * Usage:
 *   npx tsx scripts/collect-ridb-campsites.ts
 *   npx tsx scripts/collect-ridb-campsites.ts --mode=incremental
 *   npx tsx scripts/collect-ridb-campsites.ts --reset-progress
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createRIDBClient } from '../lib/ridb-api';
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_COLLECTION_BATCH_SIZE,
  enrichCampsite,
  FACILITIES_PAGE_LIMIT,
  isCampingFacility,
  normalizeRidbTimestamp,
  parseRidbCollectCliArgs,
  type RidbSyncMode,
} from '../lib/ridb-collect';
import type { RIDBCampsiteRecord, RIDBCollectionProgress } from '../lib/types/ridb';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!process.env.RIDB_API_KEY) {
  console.error('❌ Missing RIDB_API_KEY');
  process.exit(1);
}

const CAMPSITES_TABLE = 'ridb_campsites';
const PROGRESS_TABLE = 'ridb_collection_progress';
const COLLECTION_TYPE = 'campsites';

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ridbClient = createRIDBClient();

interface ProgressUpdate {
  facilityId: string | null;
  campsiteId: string | null;
  facilitiesProcessed: number;
  campsitesProcessed: number;
  status: RIDBCollectionProgress['status'];
  facilityOffset: number;
  syncMode: RidbSyncMode;
  errorMessage?: string | null;
  markIncrementalComplete?: boolean;
}

async function loadProgress(): Promise<RIDBCollectionProgress | null> {
  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select('*')
    .eq('collection_type', COLLECTION_TYPE)
    .maybeSingle();

  if (error) {
    console.error('Error loading progress:', error);
    return null;
  }

  return data;
}

async function resetProgress(syncMode: RidbSyncMode): Promise<void> {
  const { error } = await supabase.from(PROGRESS_TABLE).upsert(
    {
      collection_type: COLLECTION_TYPE,
      last_processed_facility_id: null,
      last_processed_campsite_id: null,
      last_facility_page: 1,
      last_facility_offset: 0,
      sync_mode: syncMode,
      total_facilities_processed: 0,
      total_campsites_processed: 0,
      last_updated: new Date().toISOString(),
      status: 'paused',
      error_message: null,
    },
    { onConflict: 'collection_type' }
  );

  if (error) {
    throw new Error(`Failed to reset progress: ${error.message}`);
  }
}

async function updateProgress(update: ProgressUpdate): Promise<void> {
  const page = Math.floor(update.facilityOffset / FACILITIES_PAGE_LIMIT) + 1;
  const payload: Record<string, unknown> = {
    collection_type: COLLECTION_TYPE,
    last_processed_facility_id: update.facilityId,
    last_processed_campsite_id: update.campsiteId,
    last_facility_page: page,
    last_facility_offset: update.facilityOffset,
    sync_mode: update.syncMode,
    total_facilities_processed: update.facilitiesProcessed,
    total_campsites_processed: update.campsitesProcessed,
    last_updated: new Date().toISOString(),
    status: update.status,
    error_message: update.errorMessage ?? null,
  };

  if (update.markIncrementalComplete) {
    payload.last_incremental_sync_at = new Date().toISOString();
  }

  const { error } = await supabase.from(PROGRESS_TABLE).upsert(payload, {
    onConflict: 'collection_type',
  });

  if (error) {
    console.error('Error updating progress:', error);
  }
}

async function batchInsertCampsites(campsites: RIDBCampsiteRecord[]): Promise<number> {
  if (campsites.length === 0) {
    return 0;
  }

  const firstId = campsites[0]?.ridb_campsite_id;
  const lastId = campsites[campsites.length - 1]?.ridb_campsite_id;
  console.log(`   💾 Upserting ${campsites.length} campsites (IDs: ${firstId}...${lastId})`);

  const invalid = campsites.filter((c) => !c.ridb_campsite_id || !c.name);
  if (invalid.length > 0) {
    throw new Error(`Invalid campsite data: ${invalid.length} rows missing required fields`);
  }

  const { data, error } = await supabase
    .from(CAMPSITES_TABLE)
    .upsert(campsites, { onConflict: 'ridb_campsite_id' })
    .select('ridb_campsite_id');

  if (error) {
    throw new Error(`Failed to insert campsites: ${error.message}`);
  }

  const returnedCount = data?.length || 0;
  if (returnedCount > 0) {
    console.log(`   ✓ Upsert completed — ${returnedCount} records returned`);
  } else {
    console.warn(`   ⚠️  Upsert completed but returned 0 rows (updates may omit select)`);
  }

  return campsites.length;
}

async function loadFacilityCampsiteSyncState(
  client: SupabaseClient,
  facilityId: string
): Promise<Map<string, string | null>> {
  const { data, error } = await client
    .from(CAMPSITES_TABLE)
    .select('ridb_campsite_id, last_updated_date')
    .eq('facility_id', facilityId);

  if (error) {
    console.warn(`   ⚠️  Could not load sync state for facility ${facilityId}: ${error.message}`);
    return new Map();
  }

  const map = new Map<string, string | null>();
  for (const row of data || []) {
    map.set(row.ridb_campsite_id, normalizeRidbTimestamp(row.last_updated_date));
  }
  return map;
}

function shouldSkipIncrementalCampsite(
  mode: RidbSyncMode,
  campsiteId: string,
  apiLastUpdated: string | undefined,
  existingByCampsite: Map<string, string | null>
): boolean {
  if (mode !== 'incremental') {
    return false;
  }
  const dbUpdated = existingByCampsite.get(campsiteId);
  if (!dbUpdated) {
    return false;
  }
  const apiUpdated = normalizeRidbTimestamp(apiLastUpdated);
  return Boolean(apiUpdated && dbUpdated === apiUpdated);
}

async function collectCampsites(): Promise<void> {
  const cli = parseRidbCollectCliArgs();

  console.log('='.repeat(70));
  console.log('RIDB Campsites Data Collection');
  console.log(`   Mode: ${cli.mode}${cli.resetProgress ? ' (progress reset)' : ''}`);
  console.log('='.repeat(70));
  console.log('');

  if (cli.resetProgress) {
    await resetProgress(cli.mode);
    console.log('🔄 Progress reset — starting from facility offset 0\n');
  }

  const progress = await loadProgress();
  let facilityOffset = progress?.last_facility_offset ?? 0;
  let lastFacilityId: string | null = progress?.last_processed_facility_id ?? null;
  let lastCampsiteId: string | null = progress?.last_processed_campsite_id ?? null;
  let facilitiesProcessed = progress?.total_facilities_processed ?? 0;
  let campsitesProcessed = progress?.total_campsites_processed ?? 0;
  let skipUntilFacility = Boolean(lastFacilityId);
  let skipUntilCampsite = Boolean(lastCampsiteId);

  if (cli.resetProgress) {
    facilityOffset = 0;
    lastFacilityId = null;
    lastCampsiteId = null;
    facilitiesProcessed = 0;
    campsitesProcessed = 0;
    skipUntilFacility = false;
    skipUntilCampsite = false;
  }

  const startPage = Math.floor(facilityOffset / FACILITIES_PAGE_LIMIT) + 1;

  console.log('📊 Progress Status:');
  console.log(`   Facilities processed (counter): ${facilitiesProcessed}`);
  console.log(`   Campsites processed (counter): ${campsitesProcessed}`);
  console.log(`   Resume facility offset: ${facilityOffset} (page ~${startPage})`);
  if (lastFacilityId) console.log(`   Last facility ID: ${lastFacilityId}`);
  if (lastCampsiteId) console.log(`   Last campsite ID: ${lastCampsiteId}`);
  console.log('');
  console.log(`⚙️  Batch insert size: ${DEFAULT_BATCH_SIZE}\n`);

  await updateProgress({
    facilityId: lastFacilityId,
    campsiteId: lastCampsiteId,
    facilitiesProcessed,
    campsitesProcessed,
    status: 'in_progress',
    facilityOffset,
    syncMode: cli.mode,
  });

  let campsiteBatch: RIDBCampsiteRecord[] = [];
  let facilitiesChecked = 0;
  let totalFacilityCount = 0;

  try {
    console.log('📥 Fetching facilities via RIDB client (resumable offset)...\n');

    while (true) {
      const page = await ridbClient.getFacilitiesPage(facilityOffset, FACILITIES_PAGE_LIMIT);
      totalFacilityCount = page.totalCount;
      const facilities = page.items;

      console.log(
        `\n🔍 Facilities offset ${facilityOffset}: ${facilities.length} rows (${facilityOffset + facilities.length}/${totalFacilityCount || '?'})`
      );

      if (facilities.length === 0) {
        break;
      }

      const campingFacilities = facilities.filter(isCampingFacility);
      console.log(`   🏕️  ${campingFacilities.length} camping facilities on this page`);

      for (const facility of campingFacilities) {
        const facilityId = facility.FacilityID;

        if (skipUntilFacility && lastFacilityId && facilityId !== lastFacilityId) {
          continue;
        }
        skipUntilFacility = false;

        facilitiesChecked++;
        console.log(
          `\n[${facilitiesChecked}] Processing facility: ${facility.FacilityName} (${facilityId})`
        );

        try {
          let organizationName: string | null = null;
          if (facility.OrganizationID) {
            const org = await ridbClient.getOrganization(facility.OrganizationID);
            organizationName = org?.OrganizationName || null;
          }

          const existingByCampsite =
            cli.mode === 'incremental'
              ? await loadFacilityCampsiteSyncState(supabase, facilityId)
              : new Map<string, string | null>();

          const campsites = await ridbClient.getFacilityCampsites(facilityId);
          console.log(`   Found ${campsites.length} campsites`);

          if (campsites.length === 0) {
            facilitiesProcessed++;
            await updateProgress({
              facilityId,
              campsiteId: null,
              facilitiesProcessed,
              campsitesProcessed,
              status: 'in_progress',
              facilityOffset,
              syncMode: cli.mode,
            });
            continue;
          }

          let skipUntilThisCampsite = skipUntilCampsite && Boolean(lastCampsiteId);
          let skippedUnchanged = 0;

          for (const campsite of campsites) {
            if (skipUntilThisCampsite && campsite.CampsiteID !== lastCampsiteId) {
              continue;
            }
            skipUntilThisCampsite = false;
            skipUntilCampsite = false;

            if (
              shouldSkipIncrementalCampsite(
                cli.mode,
                campsite.CampsiteID,
                campsite.LastUpdatedDate,
                existingByCampsite
              )
            ) {
              skippedUnchanged++;
              continue;
            }

            try {
              const enrichedCampsite = await enrichCampsite(
                ridbClient,
                campsite,
                facility,
                organizationName
              );
              campsiteBatch.push(enrichedCampsite);
              campsitesProcessed++;

              if (campsitesProcessed % 10 === 0) {
                process.stdout.write(
                  `   📍 Collected ${campsitesProcessed} campsites (batch: ${campsiteBatch.length}/${DEFAULT_BATCH_SIZE})\r`
                );
              }

              if (campsiteBatch.length >= DEFAULT_BATCH_SIZE) {
                console.log(`\n   📦 Saving batch of ${campsiteBatch.length}...`);
                await batchInsertCampsites(campsiteBatch);
                await updateProgress({
                  facilityId,
                  campsiteId: campsite.CampsiteID,
                  facilitiesProcessed,
                  campsitesProcessed,
                  status: 'in_progress',
                  facilityOffset,
                  syncMode: cli.mode,
                });
                campsiteBatch = [];
              } else if (campsiteBatch.length >= DEFAULT_COLLECTION_BATCH_SIZE) {
                console.log(`\n   ⚠️  Memory guard — saving ${campsiteBatch.length} campsites...`);
                await batchInsertCampsites(campsiteBatch);
                await updateProgress({
                  facilityId,
                  campsiteId: campsite.CampsiteID,
                  facilitiesProcessed,
                  campsitesProcessed,
                  status: 'in_progress',
                  facilityOffset,
                  syncMode: cli.mode,
                });
                campsiteBatch = [];
              }
            } catch (error) {
              console.error(`   ❌ Error processing campsite ${campsite.CampsiteID}:`, error);
            }
          }

          if (skippedUnchanged > 0) {
            console.log(`   ⏭️  Skipped ${skippedUnchanged} unchanged campsites (incremental)`);
          }

          if (campsiteBatch.length > 0) {
            console.log(`\n   📦 Final facility batch (${campsiteBatch.length})...`);
            await batchInsertCampsites(campsiteBatch);
            campsiteBatch = [];
          }

          facilitiesProcessed++;
          const lastCampsiteInFacility = campsites[campsites.length - 1]?.CampsiteID ?? null;
          await updateProgress({
            facilityId,
            campsiteId: lastCampsiteInFacility,
            facilitiesProcessed,
            campsitesProcessed,
            status: 'in_progress',
            facilityOffset,
            syncMode: cli.mode,
          });
        } catch (error) {
          console.error(`❌ Error processing facility ${facilityId}:`, error);
          await updateProgress({
            facilityId,
            campsiteId: null,
            facilitiesProcessed,
            campsitesProcessed,
            status: 'error',
            facilityOffset,
            syncMode: cli.mode,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }

      facilityOffset += page.currentCount;
      lastFacilityId = null;
      lastCampsiteId = null;

      await updateProgress({
        facilityId: null,
        campsiteId: null,
        facilitiesProcessed,
        campsitesProcessed,
        status: 'in_progress',
        facilityOffset,
        syncMode: cli.mode,
      });

      if (facilityOffset >= totalFacilityCount) {
        break;
      }
    }

    if (campsiteBatch.length > 0) {
      await batchInsertCampsites(campsiteBatch);
    }

    await updateProgress({
      facilityId: null,
      campsiteId: null,
      facilitiesProcessed,
      campsitesProcessed,
      status: 'completed',
      facilityOffset,
      syncMode: cli.mode,
      markIncrementalComplete: cli.mode === 'incremental',
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ Collection Complete!');
    console.log(`   Facilities processed (counter): ${facilitiesProcessed}`);
    console.log(`   Campsites processed (counter): ${campsitesProcessed}`);
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Collection failed:', error);
    await updateProgress({
      facilityId: lastFacilityId,
      campsiteId: lastCampsiteId,
      facilitiesProcessed,
      campsitesProcessed,
      status: 'error',
      facilityOffset,
      syncMode: cli.mode,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

collectCampsites().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
