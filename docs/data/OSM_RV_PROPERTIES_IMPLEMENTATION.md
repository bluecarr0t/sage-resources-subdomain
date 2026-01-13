# OSM RV Properties Collection - Implementation Documentation

## Overview

This implementation provides a complete system for collecting RV Parks and RV Resorts from OpenStreetMap across all 50 US states and storing them in a dedicated Supabase table.

## Files Created

### 1. Database Schema
**File**: `scripts/create-osm-rv-properties-table.sql`

Creates the `osm_rv_properties` table with:
- OSM tracking fields (osm_id, osm_type)
- Core property information (name, state, slug, operator)
- Location data (latitude, longitude, address, city, county)
- Contact information (website, phone, email)
- RV-specific features (hookups, max RV length, generators)
- Metadata (osm_tags as JSONB, timestamps)
- Unique constraint on (osm_id, osm_type) for duplicate prevention
- Comprehensive indexes for performance
- Row Level Security policies for public read access

### 2. Collection Script
**File**: `scripts/fetch-usa-rv-properties-osm.ts`

Main data collection script that:
- Queries OpenStreetMap Overpass API for all campgrounds (tourism=camp_site)
- **Filters by name**: Only includes properties with "RV Park" or "RV Resort" in the name
- Covers all 50 US states (72 regions to avoid API timeouts)
- Extracts RV-specific data from OSM tags
- Implements duplicate detection using OSM IDs
- Includes retry logic and rate limiting
- Provides detailed progress tracking and statistics

### 3. Test Script
**File**: `scripts/test-osm-rv-properties-table.ts`

Verification script that:
- Tests table accessibility
- Verifies insert capability
- Tests duplicate detection (unique constraint)
- Cleans up test data

## Key Features

### Name Filtering Logic
The script specifically filters for properties where the name contains:
- "RV Park" (case-insensitive)
- "RV Resort" (case-insensitive)

This ensures we only collect properties that are explicitly identified as RV-focused facilities.

```typescript
function isRVParkOrResort(feature: OSMFeature): boolean {
  const name = (tags.name || tags['name:en'] || '').toLowerCase();
  const rvParkKeywords = ['rv park', 'rv resort'];
  const hasRVKeyword = rvParkKeywords.some(keyword => name.includes(keyword));
  return tags.tourism === 'camp_site' && hasRVKeyword;
}
```

### Duplicate Prevention
- Uses unique constraint on (osm_id, osm_type)
- Checks for existing records before insert
- Tracks seen IDs across regions to handle boundary overlaps
- Script is fully resumable - can be re-run without creating duplicates

### Regional Coverage
72 regions covering all 50 US states:
- Large states (CA, TX, FL, AK) split into multiple regions
- Each region queries independently to avoid API timeouts
- 2-second delay between region queries (respectful to OSM API)
- 180-second timeout per region query
- 3 retry attempts with 5-second delays on failures

### Data Extraction
Extracts from OSM tags:
- Basic info: name, operator, coordinates
- Location: address, city, county, postal code
- Contact: website, phone, email
- RV features: max RV length, hookups (full, water, electric, sewer)
- Amenities: generator policy, pull-through sites, back-in sites
- Raw OSM tags stored as JSONB for future enrichment

## Usage Instructions

### Step 1: Create the Database Table

Run the SQL script in your Supabase SQL Editor:

```bash
# Copy and paste contents of:
scripts/create-osm-rv-properties-table.sql

# Or upload the file directly to Supabase SQL Editor
```

### Step 2: Test Table Setup (Optional but Recommended)

```bash
npx tsx scripts/test-osm-rv-properties-table.ts
```

Expected output:
```
🧪 Testing osm_rv_properties table...

Test 1: Checking table accessibility...
✅ Table exists and is accessible
   Current row count: 0

Test 2: Testing insert capability...
✅ Insert successful: [{ id: 1, name: 'Test RV Park' }]

Test 3: Testing duplicate detection...
✅ Duplicate detection working (unique constraint enforced)

Cleaning up test data...
✅ Cleanup complete

============================================================
✅ All tests passed! Ready to run fetch-usa-rv-properties-osm.ts
============================================================
```

### Step 3: Run the Collection Script

```bash
npx tsx scripts/fetch-usa-rv-properties-osm.ts
```

**Estimated Runtime**: 30-60 minutes (72 region queries + processing)

**Expected Output**:
```
================================================================================
🚀 Starting USA RV Parks and Resorts Discovery from OpenStreetMap
================================================================================

📋 Scope: All 50 US States
🔍 Filter: Properties with "RV Park" or "RV Resort" in name
📊 Target Table: osm_rv_properties

🌐 Querying OpenStreetMap Overpass API for RV Parks and Resorts in all US states...

🌐 Querying OpenStreetMap Overpass API for Northern California...
  ✅ Found 45 RV Parks/Resorts in Northern California (out of 523 campgrounds)

[... continues for all 72 regions ...]

✅ Total unique RV Parks/Resorts found: 2,847

📊 Processing 2,847 RV Parks/Resorts...

[1/2847] Processing: Sunset RV Park (CA)
  📍 Location: Sacramento, CA
  ✅ Full hookup available
  ✅ Inserted successfully

[... progress continues ...]

================================================================================
📊 Processing Summary
================================================================================
Total RV Parks/Resorts found:  2847
Processed:                      2847
Inserted:                       2723
Skipped:                        98
Failed:                         26
================================================================================

✅ Successfully discovered and inserted 2,723 RV Parks/Resorts!
```

### Step 4: Verify Results

Query the table in Supabase:

```sql
-- Check total count
SELECT COUNT(*) FROM osm_rv_properties;

-- View sample records
SELECT name, city, state, latitude, longitude 
FROM osm_rv_properties 
LIMIT 10;

-- Check by state
SELECT state, COUNT(*) as count 
FROM osm_rv_properties 
GROUP BY state 
ORDER BY count DESC;

-- Check hookup availability
SELECT 
  COUNT(*) FILTER (WHERE full_hook_up = true) as full_hookup_count,
  COUNT(*) FILTER (WHERE water_hookup = true) as water_hookup_count,
  COUNT(*) FILTER (WHERE electrical_hook_up = true) as electrical_hookup_count
FROM osm_rv_properties;
```

## Expected Results

### Target Numbers
- **Estimated Properties**: 1,000 - 5,000 RV Parks/Resorts
- **Success Rate**: 80%+ successful inserts
- **Failure Rate**: <5% failures
- **Coverage**: All 50 US states

### Data Quality
- ✅ All entries have "RV Park" or "RV Resort" in name
- ✅ All entries sourced from OpenStreetMap (community-verified)
- ✅ Coordinates validated (required for insert)
- ✅ Unique by OSM ID (no duplicates)
- ✅ State information included for all entries

### Common Skip Reasons
- Missing name (rare in OSM)
- Missing coordinates (rare in OSM)
- Already exists in database (on re-runs)

### Common Failure Reasons
- Network timeout (handled with retries)
- Invalid coordinate format (skipped)
- Database connection issues (check credentials)

## Differences from `all_rv_properties` Table

This `osm_rv_properties` table is distinct from the existing `all_rv_properties` table:

| Feature | osm_rv_properties | all_rv_properties |
|---------|-------------------|-------------------|
| **Source** | OpenStreetMap only | Multiple sources (OSM, directories, manual) |
| **Filter** | Name contains "RV Park" or "RV Resort" | Broader RV-related criteria |
| **Purpose** | OSM-specific name-filtered dataset | Comprehensive RV property database |
| **Size** | ~1,000-5,000 properties | ~10,000-20,000 properties |
| **Data Quality** | Community-verified from OSM | Mixed quality from multiple sources |

## Rate Limiting & API Respect

The script implements several measures to be respectful to OpenStreetMap's Overpass API:

1. **Regional Queries**: Splits USA into 72 regions to avoid overwhelming the API
2. **Delays**: 2-second delay between region queries
3. **Timeouts**: 180-second timeout per query (reasonable for API)
4. **Retries**: 3 attempts with 5-second delays on failures
5. **Processing Delays**: 100ms delay between database inserts

## Troubleshooting

### Issue: Table doesn't exist
**Solution**: Run `scripts/create-osm-rv-properties-table.sql` in Supabase SQL Editor

### Issue: API timeout errors
**Solution**: Script includes automatic retry logic (3 attempts). If region consistently fails, it will be skipped and logged.

### Issue: Duplicate constraint violation
**Solution**: This is expected behavior - the script checks for duplicates before insert. Simply indicates property already exists.

### Issue: Missing Supabase credentials
**Solution**: Ensure `.env.local` contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

## Future Enhancements

Potential improvements for future iterations:

1. **Enrichment**: Add Google Places API data for photos, ratings, reviews
2. **Validation**: Cross-reference with other RV park directories
3. **Updates**: Periodic re-runs to catch new properties and updates
4. **Analytics**: Track data quality scores and completeness
5. **Integration**: Merge with `all_rv_properties` table for unified dataset

## Technical Notes

### OSM Tags Used
- `tourism=camp_site` - Primary filter for campgrounds
- `name` or `name:en` - Property name (required for filtering)
- `operator` - Business operator information
- `addr:*` - Address components
- `website`, `phone`, `email` - Contact information
- Hookup tags: `water:hookup`, `electricity:hookup`, `sewer:hookup`
- RV-specific: `maxlength`, `generators`, `rv:pull_through`

### Coordinate Extraction
- **Nodes**: Use `lat`/`lon` directly from element
- **Ways**: Use `center.lat`/`center.lon` from Overpass response
- **Relations**: Use `center.lat`/`center.lon` from Overpass response

### Slug Generation
Format: `{property-name}-{city}-{state}`
- Example: `sunset-rv-park-sacramento-ca`
- URL-safe (lowercase, hyphens, no special characters)
- Includes state for uniqueness

## Maintenance

### Re-running the Script
The script is fully resumable:
- Existing records are detected and skipped
- New properties are added
- Updated properties can be refreshed (requires manual deletion first)

### Recommended Schedule
- **Initial Run**: Once to populate database
- **Updates**: Quarterly to catch new properties
- **Verification**: Monthly spot-checks for data quality

## Support

For issues or questions:
1. Check Supabase table exists and is accessible
2. Verify environment variables are set correctly
3. Review script output for specific error messages
4. Check OpenStreetMap Overpass API status: https://overpass-api.de/api/status

## License & Attribution

- **OpenStreetMap Data**: © OpenStreetMap contributors, ODbL license
- **Script**: Part of sage-subdomain-marketing project
- **Attribution Required**: When using OSM data, include: "© OpenStreetMap contributors"

