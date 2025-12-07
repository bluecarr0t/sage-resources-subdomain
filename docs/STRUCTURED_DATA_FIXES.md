# Structured Data Validation Fixes

## Summary
Fixed 212 structured data validation errors identified by Semrush audit on `resources.sageoutdooradvisory.com`.

## Issues Identified and Fixed

### 1. ❌ LocalBusiness Schema on Guide Pages
**Problem:** Guide pages (`/de/guides/...`) were incorrectly including `LocalBusiness` schema. Guide pages are articles/educational content, not local businesses, causing validation errors because they lack required LocalBusiness fields (address, telephone, etc.).

**Fix:** Removed `LocalBusiness` schema from `PillarPageTemplate.tsx` component. Guide pages now only include:
- Organization schema
- Breadcrumb schema
- Article schema
- FAQ schema (if applicable)
- Course schema (for comprehensive guides)
- Speakable schema (if applicable)

**Files Changed:**
- `components/PillarPageTemplate.tsx`

### 2. ❌ ItemList Schema Missing URLs for Carousel
**Problem:** Homepage (`/de`) was generating an `ItemList` schema without URLs for each list item. Google requires URLs in `ListItem` elements for carousel eligibility, causing validation errors.

**Fix:** 
- Created new `generateItemListSchemaWithUrls()` function that includes URLs for each list item
- Updated homepage to use the new function with proper guide URLs

**Files Changed:**
- `lib/schema.ts` - Added `generateItemListSchemaWithUrls()` function
- `app/[locale]/page.tsx` - Updated to use new function with guide URLs

### 3. ❌ MapItemListSchema Using Object Instead of Array
**Problem:** `generateMapItemListSchema()` was using a single object for `itemListElement` instead of an array, causing validation errors.

**Fix:** Changed `itemListElement` to be an array containing the list item object, and added proper `item` URL property.

**Files Changed:**
- `lib/schema.ts` - Fixed `generateMapItemListSchema()` function

### 4. ⚠️ Course Schema learningResourceType Format
**Problem:** Course schema was using a plain string for `learningResourceType`, which should be either `Text` or a `DefinedTerm` object according to Schema.org specifications.

**Fix:** Updated `learningResourceType` to use a proper `DefinedTerm` object structure.

**Files Changed:**
- `lib/schema.ts` - Updated `generateCourseSchema()` function

## Validation Results Expected

After these fixes, the structured data should validate correctly:

- ✅ **Guide Pages**: No longer include inappropriate LocalBusiness schema
- ✅ **Homepage Carousel**: ItemList now includes URLs for proper carousel recognition
- ✅ **Map Page**: ItemList uses proper array format
- ✅ **Course Schema**: Uses correct DefinedTerm format for learningResourceType

## Testing Recommendations

1. **Google Rich Results Test**: Test key pages to verify structured data validation
   - Homepage: `/de`
   - Guide pages: `/de/guides/feasibility-studies-complete-guide`
   - Map page: `/de/map`

2. **Semrush Re-audit**: Run a new audit after deployment to verify all 212 errors are resolved

3. **Schema.org Validator**: Use https://validator.schema.org/ to validate JSON-LD markup

## Files Modified

1. `components/PillarPageTemplate.tsx`
   - Removed LocalBusiness schema generation and import
   - Removed LocalBusiness script tag

2. `lib/schema.ts`
   - Added `generateItemListSchemaWithUrls()` function
   - Fixed `generateMapItemListSchema()` to use array format
   - Fixed `generateCourseSchema()` to use DefinedTerm for learningResourceType

3. `app/[locale]/page.tsx`
   - Updated to use `generateItemListSchemaWithUrls()` with guide URLs

## Next Steps

1. Deploy changes to production
2. Wait for Google to re-crawl pages (typically 1-7 days)
3. Re-run Semrush audit to verify fixes
4. Monitor Google Search Console for structured data errors

## Notes

- Landing pages still include LocalBusiness schema, which is appropriate for service pages
- The Course schema is only generated for comprehensive guides (ending in "-complete-guide")
- All fixes maintain backward compatibility and don't break existing functionality
