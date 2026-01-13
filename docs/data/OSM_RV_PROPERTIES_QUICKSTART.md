# OSM RV Properties - Quick Start Guide

## What Was Built

A complete system to collect RV Parks and RV Resorts from OpenStreetMap across all 50 US states.

## Files Created

1. **`scripts/create-osm-rv-properties-table.sql`** - Database schema (run first)
2. **`scripts/fetch-usa-rv-properties-osm.ts`** - Main collection script
3. **`scripts/test-osm-rv-properties-table.ts`** - Verification script (optional)
4. **`docs/data/OSM_RV_PROPERTIES_IMPLEMENTATION.md`** - Full documentation

## Quick Start (3 Steps)

### 1. Create the Table
```bash
# Run in Supabase SQL Editor:
scripts/create-osm-rv-properties-table.sql
```

### 2. Test Setup (Optional)
```bash
npx tsx scripts/test-osm-rv-properties-table.ts
```

### 3. Collect Data
```bash
npx tsx scripts/fetch-usa-rv-properties-osm.ts
```

**Runtime**: 30-60 minutes  
**Expected**: ~1,000-5,000 RV Parks/Resorts

## Key Features

✅ **Name Filtered**: Only properties with "RV Park" or "RV Resort" in name  
✅ **All 50 States**: Comprehensive USA coverage (72 regions)  
✅ **Duplicate Safe**: OSM ID-based deduplication  
✅ **Resumable**: Re-run without creating duplicates  
✅ **Rate Limited**: Respectful to OpenStreetMap API  
✅ **RV-Specific Data**: Hookups, max length, generators, etc.

## What Gets Collected

- **Basic**: Name, operator, coordinates, address
- **Location**: City, county, state, postal code
- **Contact**: Website, phone, email
- **RV Features**: Hookups (full, water, electric, sewer)
- **Amenities**: Max RV length, generators, pull-through sites
- **Raw Data**: All OSM tags stored as JSONB

## Filter Logic

```typescript
// Only includes properties where:
// 1. OSM tag: tourism=camp_site
// 2. Name contains: "RV Park" OR "RV Resort"
```

## Verify Results

```sql
-- Check count
SELECT COUNT(*) FROM osm_rv_properties;

-- View samples
SELECT name, city, state FROM osm_rv_properties LIMIT 10;

-- By state
SELECT state, COUNT(*) FROM osm_rv_properties GROUP BY state;
```

## Table Name

**`osm_rv_properties`** - New dedicated table for OSM RV data

This is separate from `all_rv_properties` (which includes data from multiple sources).

## Support

- **Full Documentation**: `docs/data/OSM_RV_PROPERTIES_IMPLEMENTATION.md`
- **Test Script**: `scripts/test-osm-rv-properties-table.ts`
- **OSM Attribution**: © OpenStreetMap contributors (ODbL license)

## Next Steps

After collection completes:
1. Review data quality in Supabase
2. Consider enrichment with Google Places API
3. Optionally merge with `all_rv_properties` table
4. Set up periodic updates (quarterly recommended)

