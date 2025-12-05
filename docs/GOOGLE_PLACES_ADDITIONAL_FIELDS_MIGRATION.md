# Google Places Additional Fields Migration Guide

## Overview
This migration adds additional Google Places API fields to the `sage-glamping-data` table to enrich property data, especially for expanding to RV Resorts, RV Parks, Marinas, and Campgrounds.

## New Fields Added

### 1. Business Status
- `google_business_status` (TEXT) - OPERATIONAL, CLOSED_TEMPORARILY, or CLOSED_PERMANENTLY

### 2. Opening Hours
- `google_opening_hours` (JSONB) - Regular opening hours
- `google_current_opening_hours` (JSONB) - Current/today's opening hours

### 3. Parking Options
- `google_parking_options` (JSONB) - Parking details (parkingLot, parkingFree, etc.)

### 4. Price Level
- `google_price_level` (INTEGER) - 0-4 scale (FREE to VERY_EXPENSIVE)

### 5. Payment Options
- `google_payment_options` (JSONB) - Accepted payment methods

### 6. Accessibility Options
- `google_wheelchair_accessible_parking` (BOOLEAN)
- `google_wheelchair_accessible_entrance` (BOOLEAN)
- `google_wheelchair_accessible_restroom` (BOOLEAN)
- `google_wheelchair_accessible_seating` (BOOLEAN)

### 7. Allows Dogs
- `google_allows_dogs` (BOOLEAN)

## Steps

### Step 1: Run SQL Migration

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/add-google-places-additional-fields.sql`
4. Click **Run** to execute the migration

This will:
- Add all new columns to the table
- Create indexes on frequently queried fields
- Add documentation comments

### Step 2: Populate Data

Run the Python script to fetch and populate data for all existing properties:

```bash
python3 scripts/fetch_google_places_extended.py --update-all
```

**Options:**
- `--update-all` - Update ALL properties, including those with existing Google data (overwrites)
- `--skip-existing` - Only update properties without existing Google data
- `--limit N` - Limit to first N properties (for testing)
- `--delay 0.15` - Delay between API calls in seconds (default: 0.15)

**Example (update all properties):**
```bash
python3 scripts/fetch_google_places_extended.py --update-all --delay 0.15
```

**Example (test with 10 properties):**
```bash
python3 scripts/fetch_google_places_extended.py --update-all --limit 10
```

### Step 3: Verify Results

Check that data was populated correctly:

```sql
-- Check business status distribution
SELECT 
  google_business_status,
  COUNT(*) as count
FROM "sage-glamping-data"
WHERE google_business_status IS NOT NULL
GROUP BY google_business_status;

-- Check price level distribution
SELECT 
  google_price_level,
  COUNT(*) as count
FROM "sage-glamping-data"
WHERE google_price_level IS NOT NULL
GROUP BY google_price_level
ORDER BY google_price_level;

-- Check allows dogs
SELECT 
  google_allows_dogs,
  COUNT(*) as count
FROM "sage-glamping-data"
WHERE google_allows_dogs IS NOT NULL
GROUP BY google_allows_dogs;

-- Check coverage (how many properties have the new fields)
SELECT 
  COUNT(*) as total_properties,
  COUNT(google_business_status) as with_business_status,
  COUNT(google_opening_hours) as with_opening_hours,
  COUNT(google_parking_options) as with_parking_options,
  COUNT(google_price_level) as with_price_level,
  COUNT(google_payment_options) as with_payment_options,
  COUNT(google_allows_dogs) as with_allows_dogs
FROM "sage-glamping-data";
```

## What Gets Updated

The script will:
1. Fetch all properties from Supabase (or filter based on flags)
2. Search Google Places API for each property
3. Fetch detailed place information including all new fields
4. Update the database with the new Google Places data

## Notes

- **API Costs:** Additional fields may increase API costs slightly, but most are included in the base Place Details call
- **Rate Limiting:** The script includes a delay between API calls (default 0.15s) to respect rate limits
- **Missing Data:** Not all properties will have all fields - some properties may not be in Google Places or may not have certain attributes
- **Overwriting:** Using `--update-all` will overwrite existing Google data. Use `--skip-existing` to only update properties without existing data.

## Next Steps

After migration:
1. Update TypeScript types (already done in `lib/types/sage.ts`)
2. Update map/components to display new fields
3. Add filters for new fields (business status, price level, allows dogs, etc.)
4. Use parking options to validate/enhance RV-specific fields
