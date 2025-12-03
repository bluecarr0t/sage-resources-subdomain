# Google Places Extended Fields Migration Guide

This guide explains how to add and populate the extended Google Places API fields to the `sage-glamping-data` table.

## Overview

This migration adds the following data from Google Places API (New):

### Contact Information
- `google_phone_number` - International phone number
- `google_website_uri` - Official website URL

### Amenities & Services
- `google_dine_in` - Restaurant/dining availability
- `google_takeout` - Food takeout availability
- `google_delivery` - Food delivery services
- `google_serves_breakfast` - Breakfast service
- `google_serves_lunch` - Lunch service
- `google_serves_dinner` - Dinner service
- `google_serves_brunch` - Brunch service
- `google_outdoor_seating` - Outdoor seating availability
- `google_live_music` - Live music entertainment
- `google_menu_uri` - Link to menu if available

### Categorization
- `google_place_types` - Array of place categories (JSONB)
- `google_primary_type` - Main category
- `google_primary_type_display_name` - Human-readable category name

### Media
- `google_photos` - Top 5 photos with metadata (JSONB array)
- `google_icon_uri` - Place icon URI
- `google_icon_background_color` - Icon background color

### Reservation & Booking
- `google_reservable` - Whether reservations are accepted

## Steps

### 1. Add the Columns

Run the SQL migration script in your Supabase SQL Editor:

```sql
-- Run scripts/add-google-places-fields.sql
```

Or manually execute the SQL from `scripts/add-google-places-fields.sql`.

This will:
- Add all the new columns to the `sage-glamping-data` table
- Create indexes on frequently queried fields (phone, website, primary_type)
- Add column comments for documentation

### 2. Install Python Dependencies

The script requires the `supabase-py` library:

```bash
pip install supabase python-dotenv requests
```

### 3. Set Up Environment Variables

Ensure your `.env.local` or `.env` file has:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Run the Data Fetch Script

Fetch and populate the Google Places data:

```bash
# Process all properties
python3 scripts/fetch_google_places_extended.py

# Or limit to first 10 properties for testing
python3 scripts/fetch_google_places_extended.py --limit 10

# Adjust delay between API calls (default: 0.1 seconds)
python3 scripts/fetch_google_places_extended.py --delay 0.2
```

The script will:
1. Fetch properties from Supabase
2. Search for each property using Google Places API Text Search
3. Get detailed place information using Place Details API
4. Update the database with the fetched data

### 5. Verify the Results

Check that the columns were populated:

```sql
-- Check how many properties have Google data
SELECT 
  COUNT(*) FILTER (WHERE google_phone_number IS NOT NULL) as with_phone,
  COUNT(*) FILTER (WHERE google_website_uri IS NOT NULL) as with_website,
  COUNT(*) FILTER (WHERE google_photos IS NOT NULL) as with_photos,
  COUNT(*) FILTER (WHERE google_place_types IS NOT NULL) as with_types,
  COUNT(*) as total
FROM "sage-glamping-data";

-- Sample some populated data
SELECT 
  property_name,
  google_phone_number,
  google_website_uri,
  google_primary_type,
  google_reservable,
  jsonb_array_length(google_photos) as photo_count
FROM "sage-glamping-data"
WHERE google_phone_number IS NOT NULL
LIMIT 10;
```

## Field Details

### Contact Information

**google_phone_number** (TEXT)
- International format phone number
- Example: "+1 555-123-4567"
- Can be used for direct booking calls

**google_website_uri** (TEXT)
- Official website URL from Google
- Can validate/update existing `url` field
- Example: "https://example.com"

### Amenities & Services

All boolean fields indicate availability of specific services:
- `google_dine_in` - Validates `sage_p_amenity_restaurant`
- `google_serves_breakfast/lunch/dinner/brunch` - Meal service details
- `google_outdoor_seating` - Relevant for glamping sites
- `google_live_music` - Entertainment amenity
- `google_menu_uri` - Link to menu if available

### Categorization

**google_place_types** (JSONB)
- Array of place categories
- Example: `["lodging", "campground", "rv_park"]`
- Can be queried using JSONB operators:
  ```sql
  SELECT * FROM "sage-glamping-data"
  WHERE google_place_types @> '["campground"]'::jsonb;
  ```

**google_primary_type** (TEXT)
- Main category identifier
- Example: "lodging"

**google_primary_type_display_name** (TEXT)
- Human-readable category name
- Example: "Lodging"

### Media

**google_photos** (JSONB)
- Top 5 photos stored as JSONB array
- Each photo includes:
  - `name` - Photo resource name
  - `widthPx` - Photo width
  - `heightPx` - Photo height
  - `authorAttributions` - Photo attribution info
- Example structure:
  ```json
  [
    {
      "name": "places/ChIJ.../photos/...",
      "widthPx": 1920,
      "heightPx": 1080,
      "authorAttributions": [...]
    }
  ]
  ```

**google_icon_uri** (TEXT)
- Place icon URI for map markers

**google_icon_background_color** (TEXT)
- Icon background color (hex format)

### Reservation & Booking

**google_reservable** (BOOLEAN)
- Indicates if the place accepts reservations
- Useful for filtering properties by booking capability

## Usage Examples

### Query Properties with Photos

```sql
SELECT 
  property_name,
  google_photos
FROM "sage-glamping-data"
WHERE google_photos IS NOT NULL
  AND jsonb_array_length(google_photos) > 0;
```

### Find Properties with Specific Amenities

```sql
SELECT 
  property_name,
  google_dine_in,
  google_serves_breakfast,
  google_outdoor_seating
FROM "sage-glamping-data"
WHERE google_dine_in = true
  AND google_outdoor_seating = true;
```

### Filter by Place Type

```sql
SELECT 
  property_name,
  google_primary_type,
  google_primary_type_display_name
FROM "sage-glamping-data"
WHERE google_primary_type = 'campground'
  OR google_place_types @> '["rv_park"]'::jsonb;
```

### Find Reservable Properties

```sql
SELECT 
  property_name,
  google_reservable,
  google_phone_number
FROM "sage-glamping-data"
WHERE google_reservable = true;
```

## Cost Considerations

- **Text Search API**: Charged per request (used to find place_id)
- **Place Details API**: Charged per request with field mask
- **Field Mask**: Only requested fields are returned and charged
- **Rate Limiting**: Default delay of 0.1s between requests (adjustable)

To minimize costs:
- Use `--limit` flag for testing
- Adjust `--delay` to respect rate limits
- Only run on properties that need updating

## Troubleshooting

### No properties found
- Check that Supabase credentials are correct
- Verify table name is `sage-glamping-data`

### API errors
- Verify Google Maps API key is valid
- Check API key has Places API enabled
- Ensure billing is set up for Google Cloud project

### Update failures
- Check that columns exist in database (run migration first)
- Verify service role key has write permissions
- Check Supabase logs for detailed error messages

## Next Steps

1. **Update TypeScript types** - Already done in `lib/types/sage.ts`
2. **Update map components** - Display new data where relevant
3. **Create validation scripts** - Compare Google data with existing fields
4. **Add filtering** - Use new fields in map/filter components

