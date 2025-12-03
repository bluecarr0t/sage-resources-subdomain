# CSV Data Quality Analysis Report

**File:** `csv/Main/sage-glamping-combined-with-google-data.csv`  
**Date:** Generated automatically  
**Total Rows:** 1,290  
**Total Columns:** 86

---

## Executive Summary

The combined CSV file contains data from two sources enriched with Google Places API data. Overall data quality is good, with a few issues requiring attention:

- ✅ **Good:** Most critical fields are populated (>99%)
- ✅ **Valid Structure:** 324 duplicate property names are intentional (different site/unit types)
- ✅ **Fixed:** Missing coordinates and state field issues have been resolved
- ⚠️ **Remaining Issues:** 229 invalid URLs need fixing
- 📊 **Coverage:** Google Places data available for ~18% of properties

---

## Detailed Findings

### 1. 🔍 Duplicate Property Names

**Status:** ✅ **INTENTIONAL - NOT AN ISSUE**

**Finding:** 324 properties have duplicate names (25% of dataset)

**Analysis:** These duplicates are **valid and intentional** because they represent:
- Different site names/units at the same property
- Different unit types (e.g., Canvas Tent vs Tiny Cabin)
- Different locations within the same property
- Different accommodation options

**Examples:**
- "Collective Governors Island": 2 occurrences
  - Occurrence 1: Site Name="Canvas Tent", Unit Type="Safari Tent"
  - Occurrence 2: Site Name="Tiny Cabin", Unit Type="Cabin"
- "The Fields of Michigan": 6 occurrences (different unit types/sites)
- "Elk & Embers Resort": 3 occurrences (different accommodations)

**Conclusion:** These are **legitimate separate entries** representing different sites/units within the same property. They should be **kept as separate rows**.

**Recommendation:**
- ✅ **Keep all duplicate entries** - they represent different accommodations
- Consider adding a unique identifier (Property Name + Site Name + Unit Type) for database purposes
- When displaying, group by Property Name but show all site/unit options
- This structure allows users to see all available accommodation types at each property

---

### 2. 🔗 Invalid URLs

**Status:** ✅ **FIXED**

**Issue:** 229 rows (17.8%) had invalid URLs in the `Url` field

**Resolution:** All invalid URLs have been fixed:
- Replaced with Google Website URI where available (11 fixes)
- Set to empty when no valid replacement was available (218 fixes)

**Result:**
- ✅ **0 invalid URLs remaining** (100% fixed)
- ✅ **1,062 valid URLs** (82.3% of dataset)
- ℹ️  **228 empty URLs** (17.7%) - no replacement available

**Examples of Fixes:**
- "Treebones Resort": Replaced "and sinks..." with http://www.treebonesresort.com/
- "Orca Island Cabins": Replaced "private bathrooms..." with https://orcaislandcabins.com/
- "The Outlier Inn": Filled empty URL with https://www.outlierinn.com/

---

### 3. 📍 Missing Coordinates

**Status:** ✅ **FIXED**

**Issue:** 9 rows (0.7%) were missing coordinates

**Resolution:** All missing coordinates have been geocoded using Google Places API

**Result:** ✅ **0 properties missing coordinates** (100% complete)

---

### 4. 🏷️ State Field Inconsistencies

**Status:** ✅ **FIXED**

**Issue:** State field contained zip codes and full city names instead of state abbreviations

**Resolution:** All state fields have been standardized to 2-letter abbreviations:
- Fixed 71 city/state field swaps
- Converted zip codes in state field to proper state codes
- Standardized all states to 2-letter format (CA, NY, TX, etc.)

**Result:** ✅ **0 state field issues remaining** (100% fixed)

---

### 5. 🔗 URL Consistency (Google vs Original)

**Findings:**
- **124 URLs match** between Google and original
- **102 URLs differ** - Google has different URL than original
- **3 properties** have Google URL but no original URL
- **1,054 properties** have original URL but no Google URL

**Recommendation:**
1. **For 102 mismatches:** Review and decide which URL to keep
   - Prefer Google URL if it's verified/current
   - Keep original if it's more specific (e.g., booking page vs. homepage)

2. **For 3 Google-only:** Update original URL field with Google data

3. **For 1,054 original-only:** Consider running Google Places API lookup for more properties

---

### 6. 📊 Google Places Data Coverage

**Current Coverage:**
- Google Phone Number: 222 rows (17.2%)
- Google Website URI: 229 rows (17.8%)
- Google Primary Type: 238 rows (18.4%)
- Google Place Types: 241 rows (18.7%)
- Google Photos: 1,065 rows (82.6%) - Note: This includes rows with 0 photos
- Google Rating: 242 rows (18.8%)
- Google Review Count: 242 rows (18.8%)

**Recommendation:**
- Continue running Google Places API fetcher to increase coverage
- Focus on properties with missing critical data (URLs, phone numbers)

---

## Priority Action Items

### ✅ COMPLETED

1. ✅ **Fix Invalid URLs** - **COMPLETED**
   - Replaced 11 invalid URLs with Google Website URI
   - Set 218 invalid URLs to empty (no replacement available)
   - **Result:** 0 invalid URLs remaining, 1,062 valid URLs (82.3%)

### 🟡 MEDIUM PRIORITY

3. **Standardize State Field** (Multiple inconsistencies)
   - Convert to 2-letter state abbreviations
   - Use zip code lookup or Google data
   - **Estimated Impact:** Enables proper state-based filtering

4. **Geocode Missing Coordinates** (9 missing)
   - Use Google Places API
   - **Estimated Impact:** Completes mapping functionality

### 🟢 LOW PRIORITY

5. **Review URL Mismatches** (102 differences)
   - Compare Google vs. original URLs
   - Decide which to keep
   - **Estimated Impact:** Ensures most accurate URL data

6. **Increase Google Places Coverage**
   - Continue API fetches for remaining properties
   - **Estimated Impact:** Enriches dataset with verified data

---

## Data Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Rows | 1,290 | ✅ |
| Duplicate Properties | 324 (25%) | ✅ Intentional |
| Missing Coordinates | 0 (0%) | ✅ Fixed |
| Invalid URLs | 0 (0%) | ✅ Fixed |
| Valid URLs | 1,062 (82.3%) | ✅ |
| Empty URLs | 228 (17.7%) | ℹ️ No replacement |
| Missing Critical Fields | <1% | ✅ |
| Google Data Coverage | ~18% | 📊 |
| Empty Rows | 0 | ✅ |
| State Field Issues | 0 (0%) | ✅ Fixed |

---

## Recommended Cleaning Script

A cleaning script should:
1. ✅ ~~Identify and flag duplicates~~ - **NOT NEEDED** (duplicates are intentional)
2. Replace invalid URLs with Google data
3. ✅ Standardize state abbreviations - **COMPLETED**
4. ✅ Geocode missing coordinates - **COMPLETED**
5. Validate and clean all data fields
6. Generate a cleaned version of the CSV

---

## Next Steps

1. ✅ Review this analysis report
2. 🔧 Create data cleaning script based on recommendations
3. 🧹 Run cleaning script to generate cleaned CSV
4. ✅ Validate cleaned data
5. 📤 Replace original file or create new cleaned version

---

*Report generated automatically by data quality analysis script*

