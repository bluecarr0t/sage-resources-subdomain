# Google Description Field Addition

## Overview
This update adds the `google_description` column to the `sage-glamping-data` table and populates it with the Google Business profile description from the Google Places API.

## Changes Made

### 1. SQL Migration
- **File**: `scripts/add-google-description-field.sql`
- **Action**: Adds `google_description` TEXT column to `sage-glamping-data` table
- **Index**: Creates an index on the column for efficient queries
- **Comment**: Documents the column purpose

### 2. Python Fetch Script Update
- **File**: `scripts/fetch_google_places_extended.py`
- **Changes**:
  - Added `editorialSummary` to the field mask in `get_place_details()`
  - Extracts description from `editorialSummary.text` field
  - Includes `google_description` in the update data dictionary
  - Updated function documentation

### 3. TypeScript Types Update
- **File**: `lib/types/sage.ts`
- **Changes**: Added `google_description: string | null;` to the `SageProperty` interface

## Steps to Deploy

### Step 1: Run SQL Migration
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/add-google-description-field.sql`
4. Click **Run** to execute the migration

This will:
- Add the `google_description` column to the table
- Create an index on the column
- Add documentation comment

### Step 2: Populate Data
Run the Python script to fetch and populate description data for all properties:

```bash
python3 scripts/fetch_google_places_extended.py --update-all --delay 0.15
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

**Example (test with first 10 properties):**
```bash
python3 scripts/fetch_google_places_extended.py --update-all --limit 10 --delay 0.15
```

## Field Details

### `google_description` (TEXT)
- **Source**: Google Places API `editorialSummary.text` field
- **Content**: The business description from the Google Business profile (editable by business owners)
- **Nullable**: Yes (not all businesses have descriptions)
- **Indexed**: Yes (for efficient queries)

## Verification

After running the script, verify the data was populated:

```sql
-- Check how many properties have descriptions
SELECT 
  COUNT(*) as total_properties,
  COUNT(google_description) as with_description,
  COUNT(*) FILTER (WHERE google_description IS NOT NULL AND google_description != '') as with_non_empty_description
FROM "sage-glamping-data";
```

## Notes

- The `editorialSummary` field may not be available for all places
- Some businesses may not have filled out their Google Business profile description
- The description is the text that business owners can edit in their Google Business Profile
- This field is separate from AI-generated summaries (`generativeSummary`) which are also available in the API
