# RIDB Campsites Data Collection

## Overview

This document describes the data collection system for campsite data from recreation.gov's RIDB (Recreation Information Database) API. The system collects comprehensive campsite data from federal recreational properties including national parks, national forests, BLM lands, and other federal recreation areas.

## Data Source

**RIDB API**: https://ridb.recreation.gov/api/v1

The RIDB API provides access to recreational opportunities on federal lands managed by agencies including:
- National Park Service (NPS)
- U.S. Forest Service (USFS)
- Bureau of Land Management (BLM)
- U.S. Army Corps of Engineers
- Bureau of Reclamation
- And other federal agencies

## Database Schema

### Table: `ridb_campsites`

Stores all campsite data with related facility and recreation area information.

#### Core Campsite Fields
- `ridb_campsite_id` (TEXT UNIQUE) - Original RIDB Campsite ID
- `name` (TEXT NOT NULL) - Campsite name
- `campsite_type` (TEXT) - Type of campsite
- `campsite_use_type` (TEXT) - Use type (RV, Tent, etc.)
- `latitude` (NUMERIC) - Campsite latitude
- `longitude` (NUMERIC) - Campsite longitude
- `description` (TEXT) - Campsite description

#### Parent Facility (Campground) Info
- `facility_id` (TEXT) - RIDB Facility ID
- `facility_name` (TEXT) - Campground/facility name
- `facility_type` (TEXT) - Facility type
- `facility_latitude` (NUMERIC)
- `facility_longitude` (NUMERIC)
- `facility_address` (TEXT)
- `facility_city` (TEXT)
- `facility_state` (TEXT)
- `facility_postal_code` (TEXT)
- `facility_reservable` (BOOLEAN)
- `facility_reservation_url` (TEXT)
- `facility_phone` (TEXT)
- `facility_email` (TEXT)

#### Parent Recreation Area Info
- `recarea_id` (TEXT) - RIDB RecArea ID (if facility has parent)
- `recarea_name` (TEXT) - Recreation area name
- `recarea_latitude` (NUMERIC)
- `recarea_longitude` (NUMERIC)

#### Organization
- `organization_id` (TEXT) - Federal agency managing the property
- `organization_name` (TEXT) - Agency name (NPS, BLM, USFS, etc.)

#### Related Data (JSONB)
- `attributes` (JSONB) - Array of attribute objects (hookups, max length, site type, etc.)
- `media` (JSONB) - Array of media objects (images/videos)

#### Metadata
- `created_at` (TIMESTAMP) - Record creation timestamp
- `updated_at` (TIMESTAMP) - Record last update timestamp
- `last_synced_at` (TIMESTAMP) - Last sync with RIDB API
- `data_completeness_score` (NUMERIC) - Data completeness score (0-100)

### Table: `ridb_collection_progress`

Tracks collection progress to enable resume capability.

- `id` (BIGSERIAL PRIMARY KEY)
- `collection_type` (TEXT) - 'campsites'
- `last_processed_facility_id` (TEXT) - Last facility ID processed
- `last_processed_campsite_id` (TEXT) - Last campsite ID processed
- `total_facilities_processed` (INTEGER) - Count of facilities processed
- `total_campsites_processed` (INTEGER) - Count of campsites processed
- `last_updated` (TIMESTAMP) - Last progress update
- `status` (TEXT) - 'in_progress', 'completed', 'paused', 'error'
- `error_message` (TEXT) - Last error if status is 'error'

## Collection Process

### Step 1: Setup

1. **Get RIDB API Key**
   - Sign up at https://ridb.recreation.gov
   - Obtain API key from your account dashboard
   - Add to `.env.local`: `RIDB_API_KEY=your_api_key_here`

2. **Create Database Tables**
   - Run `scripts/create-ridb-campsites-table.sql` in Supabase SQL Editor
   - This creates both `ridb_campsites` and `ridb_collection_progress` tables

### Step 2: Run Collection Script

```bash
npx tsx scripts/collect-ridb-campsites.ts
```

### Collection Workflow

1. **Load Progress** - Checks `ridb_collection_progress` table to resume from last position
2. **Fetch All Facilities** - Gets all facilities from RIDB API (with pagination)
3. **Filter Camping Facilities** - Filters facilities by type to only process camping-related facilities:
   - Facility types: "Campground", "Camping", "RV Campground", "Tent Camping", etc.
   - Skips non-camping facilities (trails, visitor centers, etc.)
4. **Fetch Campsites** - For each camping facility, fetches all campsites (with pagination)
5. **Enrich Campsites** - For each campsite, fetches:
   - Attributes (detailed campsite attributes)
   - Media (images/videos)
   - Parent Facility data (if not already fetched)
   - Parent RecArea data (if facility has parent)
6. **Batch Insert** - Collects campsites in batches (200 at a time) and inserts using batch upsert
7. **Update Progress** - After each batch, updates `ridb_collection_progress` table

## Features

### Batching

- **Collection Batch**: Collects 100-500 campsites in memory before inserting
- **Insert Batch**: Inserts 100-200 campsites per database operation
- **Memory Management**: Clears batches after successful insert to manage memory

### Progress Tracking

- Progress is saved after each successful batch insert
- Tracks:
  - Last processed facility ID
  - Last processed campsite ID
  - Total counts (facilities and campsites)
  - Current status and any error messages

### Resume Capability

- On script start, checks progress table
- If progress exists and status is 'in_progress' or 'error', resumes from last position
- Skips all facilities/campsites already processed
- Continues from next unprocessed item

### Error Handling

- **Network Errors**: Retry with exponential backoff (3 attempts)
- **API Errors**: Log and skip problematic records, continue processing
- **Data Validation**: Validates coordinates, required fields before batch insert
- **Progress Saving**: Saves progress after each successful batch insert
- **Resume on Failure**: On script restart, automatically resumes from last saved position

### Rate Limiting

- Implements 1 second delay between API requests
- Handles 429 (rate limit) responses with automatic retry
- Respects API rate limits to avoid being blocked

### Data Completeness Scoring

Each campsite record includes a `data_completeness_score` (0-100) calculated based on:
- Core fields (name, type, coordinates)
- Facility information
- Recreation area information
- Attributes and media availability

## Estimated Data Volume

Based on RIDB scope (campsites only):
- **Camping Facilities**: ~5,000-15,000 (filtered from all facilities)
- **Campsites**: ~100,000-500,000+ individual campsites

**Estimated Runtime**: 10-50 hours depending on API rate limits and data volume

## Usage

### Initial Collection

Run the script to start collecting data:

```bash
npx tsx scripts/collect-ridb-campsites.ts
```

The script will:
- Fetch all facilities
- Filter for camping facilities
- Collect all campsites with enrichment
- Insert in batches
- Track progress throughout

### Resume After Interruption

If the script is interrupted (network error, API error, etc.), simply run it again:

```bash
npx tsx scripts/collect-ridb-campsites.ts
```

The script will automatically:
- Load progress from database
- Skip already-processed facilities and campsites
- Resume from the exact last position

### Check Progress

Query the progress table:

```sql
SELECT * FROM ridb_collection_progress WHERE collection_type = 'campsites';
```

### Check Collection Status

Query campsite counts:

```sql
SELECT 
  COUNT(*) as total_campsites,
  COUNT(DISTINCT facility_id) as total_facilities,
  AVG(data_completeness_score) as avg_completeness
FROM ridb_campsites;
```

## Data Quality

### Completeness Score

The `data_completeness_score` field provides a 0-100 score indicating how complete the data is for each campsite. Higher scores indicate more complete data.

### Data Validation

The script validates:
- Required fields (ridb_campsite_id, name)
- Coordinate validity (latitude/longitude ranges)
- Data types and formats

### Error Handling

- Individual campsite errors are logged but don't stop the collection
- Facility errors are logged and the script continues to the next facility
- Progress is saved after each batch to prevent data loss

## API Rate Limits

The RIDB API has rate limits. The script implements:
- 1 second delay between requests
- Automatic retry on rate limit errors (429)
- Exponential backoff for network errors

## Maintenance

### Updating Data

To refresh/update existing data, you can:
1. Delete specific campsites and re-run collection
2. Modify the script to check `last_synced_at` and only update stale records
3. Run full collection again (will upsert based on `ridb_campsite_id`)

### Monitoring

Monitor collection progress:
- Check `ridb_collection_progress` table for current status
- Review error messages if status is 'error'
- Check logs for detailed progress information

## Troubleshooting

### Script Fails to Start

- Check that `RIDB_API_KEY` is set in `.env.local`
- Verify Supabase credentials are set
- Ensure database tables are created

### API Rate Limit Errors

- The script automatically handles rate limits
- If persistent, increase delay in `lib/ridb-api.ts` (DEFAULT_RATE_LIMIT_DELAY_MS)

### Memory Issues

- Reduce `COLLECTION_BATCH_SIZE` in the script
- Reduce `BATCH_SIZE` for inserts
- Script automatically forces inserts if batch gets too large

### Resume Not Working

- Check `ridb_collection_progress` table has correct data
- Verify `last_processed_facility_id` and `last_processed_campsite_id` are valid
- Check status is 'in_progress' or 'error' (not 'completed')

## Files

- `scripts/create-ridb-campsites-table.sql` - Database schema
- `scripts/collect-ridb-campsites.ts` - Main collection script
- `lib/types/ridb.ts` - TypeScript type definitions
- `lib/ridb-api.ts` - RIDB API client utility

## Success Criteria

- All camping facilities identified and processed
- All campsites from camping facilities collected with full data
- All campsite attributes and media collected
- Parent facility and recreation area data included
- Data stored in normalized format in Supabase
- Batch inserts working efficiently (100-200 campsites per operation)
- Progress tracking saves position after each batch
- Script can resume from exact last position on restart
- Script handles errors gracefully and continues processing
- Data completeness scores calculated for all campsites

