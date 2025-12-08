# Map Property Count Analysis

## Summary

The `/map` page is showing **460 properties** (400 USA + 60 Canada), but the analysis reveals:

- **Total unique property names in database**: 604
- **Properties with valid coordinates**: 578 unique properties
- **Properties that should be displayed on map**: 530 unique properties
  - USA: 454 properties (with valid coords + country='USA')
  - Canada: 76 properties (with valid coords + country='Canada')

## Why the Discrepancy?

The map shows **460 properties** instead of the expected **530 properties**. This is a difference of **70 properties**.

### Properties Excluded from Map Display

Properties are excluded from the map count if they don't meet ALL of these criteria:

1. ✅ **Valid coordinates** - Must have lat/lon within USA/Canada bounds (18°N-85°N, -179°W to -50°W)
2. ✅ **Country field set correctly** - Must be 'USA', 'US', 'United States', or 'United States of America' for USA, or 'Canada', 'CA', 'CAN' for Canada
3. ✅ **Unique property name** - Properties are grouped by `property_name` (case-insensitive, trimmed)

### Breakdown of Missing Properties

From the analysis:

- **24 unique properties** have invalid or missing coordinates
- **48 unique properties** have valid coordinates but country field is not set to USA/Canada
  - 65 records have null/empty country field
  - 1 record has country='78620' (likely data error)

### Expected vs Actual Counts

| Category | Expected | Actual (Map) | Difference |
|----------|----------|-------------|------------|
| USA | 454 | 400 | -54 |
| Canada | 76 | 60 | -16 |
| **Total** | **530** | **460** | **-70** |

## Possible Reasons for the 70 Property Difference

1. **Additional filters applied**: The map might have unit type, rate range, or state filters active that further reduce the count
2. **Data synchronization**: The database might have been updated since the map was last loaded
3. **Client-side filtering logic**: There may be additional client-side filtering that excludes some properties
4. **Property name normalization**: Differences in how property names are normalized/grouped between the count calculation and display

## Recommendations

1. **Check for active filters**: Verify if any unit type, rate range, or state filters are currently active on the map
2. **Verify country field values**: Ensure all properties have the correct country field set (USA/United States/US for USA, Canada/CA/CAN for Canada)
3. **Fix data issues**: 
   - Update the 65 records with null/empty country field
   - Fix the record with country='78620'
   - Verify coordinates for the 24 properties without valid coordinates
4. **Review count calculation**: Ensure the displayed count uses the same logic as the country filter counts

## Files Created

- `scripts/count-unique-property-names.ts` - Counts total unique property names
- `scripts/analyze-map-property-count.ts` - Analyzes why map shows 460 instead of 530

## Next Steps

1. Run the analysis script to see current state: `npx tsx scripts/analyze-map-property-count.ts`
2. Check the browser console on the map page for any filtering logs
3. Verify if any filters are active that might reduce the count
4. Compare the count calculation logic with the actual displayed count
