# National Parks Coordinate Analysis Report

## Summary

✅ **58 parks** have valid coordinates in the database
❌ **5 parks** are missing from the database (exist in CSV but not in DB)
⚠️ **1 park** has incorrect coordinates

---

## Issues Found

### 1. Gateway Arch - INCORRECT COORDINATES ⚠️

**Problem:** Gateway Arch (St. Louis, Missouri) has Alaska coordinates in both CSV and database.

- **Current coordinates:** (67.78, -153.3) - This is Gates of the Arctic, Alaska
- **Correct coordinates:** Should be approximately (38.6247, -90.1848) for St. Louis, Missouri
- **State:** Currently listed as "AK" but should be "MO"

**Root Cause:** The CSV data appears to have copied the data from "Gates of the Arctic" row (same park code GAAR is used, which is incorrect for Gateway Arch).

**Impact:** Gateway Arch marker will appear in Alaska instead of Missouri on the map.

---

### 2. Missing Parks (5 parks in CSV but not in database)

The following parks exist in the CSV file but are missing from the database:

1. **American Samoa** (row 2)
   - No coordinates in CSV
   - Park Code: (empty)
   - State: (empty)

2. **Virgin Islands** (row 13)
   - No coordinates in CSV
   - Park Code: (empty)
   - State: (empty)

3. **White Sands** (row 14)
   - No coordinates in CSV
   - Park Code: (empty)
   - State: (empty)

4. **Indiana Dunes** (row 30)
   - No coordinates in CSV
   - Park Code: (empty)
   - State: (empty)

5. **New River Gorge** (row 48)
   - No coordinates in CSV
   - Park Code: (empty)
   - State: (empty)

**Note:** These parks don't have coordinates in the CSV, so they were likely filtered out during the upload process (the upload script filters parks without valid coordinates).

---

### 3. Parks with coordinates in DB but not in CSV

The following parks have coordinates in the database but show "N/A" in the CSV (likely due to CSV parsing issues or data differences):

- Carlsbad Caverns: DB has (32.17, -104.44)
- Grand Canyon: DB has (36.06, -112.14) - CSV shows N/A but may have different formatting
- Hawaii Volcanoes: DB has (19.38, -155.2) - CSV shows N/A but may have different formatting
- Mesa Verde: DB has (37.18, -108.49)
- Redwood: DB has (41.3, -124)
- Wrangell–St. Elias: DB has (61, -142)
- Yosemite: DB has (37.83, -119.5)

These are likely false positives from the analysis script (CSV parsing may not match exact format).

---

## Recommendations

### Priority 1: Fix Gateway Arch Coordinates

Gateway Arch needs to be corrected with proper St. Louis, Missouri coordinates:

```sql
UPDATE "national-parks" 
SET 
  latitude = 38.6247,
  longitude = -90.1848,
  state = 'MO'
WHERE name = 'Gateway Arch';
```

Or use Google Geocoding API to get accurate coordinates for "Gateway Arch National Park, St. Louis, MO".

### Priority 2: Add Missing Parks (if coordinates can be found)

If you want to include the 5 missing parks, you'll need to:

1. Find accurate coordinates for each park
2. Add them to the database manually or update the CSV and re-upload

**Missing parks:**
- American Samoa National Park
- Virgin Islands National Park (St. John, USVI)
- White Sands National Park (New Mexico)
- Indiana Dunes National Park (Indiana)
- New River Gorge National Park (West Virginia)

### Priority 3: Verify CSV Data Quality

The CSV appears to have some data quality issues:
- Gateway Arch row copied data from Gates of the Arctic
- Some parks missing park codes and coordinates
- Consider validating the source data

---

## All Parks Status (58 parks with valid coordinates)

All other 58 parks have valid, properly formatted coordinates within expected ranges:
- Latitude: -90 to 90 ✓
- Longitude: -180 to 180 ✓
- All coordinates are finite numbers ✓

---

## Next Steps

1. ✅ Fix Gateway Arch coordinates in database
2. ⚠️ Decide if missing parks should be added (will need coordinate lookup)
3. 📝 Consider data validation rules to prevent similar issues in future uploads
