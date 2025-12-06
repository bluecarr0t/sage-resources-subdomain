# National Parks Individual Pages Implementation

## Overview

National parks now have individual pages using the same `/property/[slug]` route structure as glamping properties. Each national park can be accessed via `/{locale}/property/{slug}`.

## Implementation Steps

### 1. ✅ Database Schema Update

Add the `slug` column to the `national-parks` table:

**Run this SQL in Supabase SQL Editor:**

```sql
-- Add slug column to national-parks table
ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_national_parks_slug ON "national-parks" (slug) WHERE slug IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "national-parks".slug IS 'URL-safe slug for the national park, generated from the name field';
```

The SQL file is available at: `scripts/add-national-parks-slug-column.sql`

### 2. ⚠️ Generate Slugs for Existing Parks

After adding the slug column, run the slug generation script:

```bash
npx tsx scripts/add-slug-to-national-parks.ts
```

This script will:
- Generate URL-safe slugs from park names
- Handle duplicate slugs by appending numbers
- Update all parks in the database

### 3. ✅ Code Implementation

All code changes have been completed:

#### Files Created/Modified:

1. **`lib/national-parks.ts`** - Utility functions for national parks:
   - `getAllNationalParkSlugs()` - Get all slugs for static generation
   - `getNationalParkBySlug()` - Fetch park by slug
   - `getSlugType()` - Determine if slug belongs to park or property

2. **`components/NationalParkDetailTemplate.tsx`** - Component to display national park details
   - Similar structure to PropertyDetailTemplate
   - Shows park information, photos (from Google Places), ratings, etc.

3. **`app/[locale]/property/[slug]/page.tsx`** - Updated to handle both types:
   - Checks slug type (national park vs glamping property)
   - Routes to appropriate template component
   - Generates appropriate metadata for each type

4. **`lib/types/national-parks.ts`** - Updated to include `slug` field

5. **`scripts/add-slug-to-national-parks.ts`** - Script to generate slugs

## How It Works

### Route Structure

- **National Parks:** `/{locale}/property/{park-slug}`
- **Glamping Properties:** `/{locale}/property/{property-slug}`

Both use the same route, but the page determines which type based on the slug.

### Example URLs

- `https://resources.sageoutdooradvisory.com/en/property/yellowstone`
- `https://resources.sageoutdooradvisory.com/en/property/yosemite`
- `https://resources.sageoutdooradvisory.com/en/property/grand-canyon`

### Page Features

Each national park page includes:

- ✅ Park name and location
- ✅ Google Places API integration (photos, ratings, reviews, website)
- ✅ Park details (date established, area, visitors, park code)
- ✅ Description (from Google Places or database)
- ✅ Map link to view park location
- ✅ Responsive photo gallery
- ✅ SEO-optimized metadata

## Next Steps

1. **Run the SQL** to add the slug column
2. **Run the script** to generate slugs for all parks
3. **Test** a few park pages to ensure they're working correctly
4. **Rebuild** the site to generate static pages for all parks

## Verification

After completing the steps above, you can verify:

1. Check that all parks have slugs:
   ```sql
   SELECT name, slug FROM "national-parks" WHERE slug IS NULL;
   ```

2. Test a park page:
   - Visit `/en/property/yellowstone` (or any park slug)
   - Should display the national park details page

3. Check static generation:
   - During build, `generateStaticParams` should include both property and park slugs
   - All pages should be pre-generated at build time

## Notes

- Slugs are generated using the same `slugifyPropertyName()` function used for glamping properties
- If a park name changes, the slug will need to be regenerated
- Google Places API data is fetched at request time (not stored) to comply with Google's Terms of Service
- National park pages use the same SEO optimization as property pages
