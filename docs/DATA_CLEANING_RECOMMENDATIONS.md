# Data Cleaning Recommendations

## Analysis Date
December 2, 2025

## Overview
Analysis of `Sage Database_ Glamping Sites  - Work In Progress (1)_CORRECTED.csv` identified several data quality issues that should be addressed to ensure data consistency and accuracy.

**Total Rows Analyzed:** 1,039

---

## 🔴 HIGH PRIORITY ISSUES

### 1. Missing Coordinates
**Count:** 9 rows missing latitude/longitude

**Impact:** These properties cannot be displayed on maps or used for location-based features.

**Recommendation:**
- Run the coordinate validation script: `npx tsx scripts/validate-coordinates.ts`
- Manually geocode the 9 rows with missing coordinates
- Consider using the property address to geocode if coordinates are missing

**Affected Rows:** 577, 578, 645, 933, 934, 1026, 1027

### 2. Duplicate Entries
**Count:** 12 potential duplicate entries

**Impact:** Duplicate entries can skew analytics and cause confusion in reporting.

**Recommendation:**
- Review each duplicate entry to determine if they are:
  - True duplicates (should be removed)
  - Different units at the same property (should be kept but verified)
  - Data entry errors (should be corrected)

**Affected Properties:**
- Bear Den Cabins & Camp (Row 100)
- Grand Canyon Glamping Resort (Rows 403, 405)
- Huttopia Southern Maine (Rows 458, 459)
- Additional duplicates found in analysis

**Action:** Manually review and consolidate or remove true duplicates.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 3. Missing Address Information
**Count:** 
- 12 rows missing Address
- 8 rows missing City
- 6 rows missing State
- 10 rows missing Country

**Impact:** Incomplete location data makes it difficult to verify properties and geocode accurately.

**Recommendation:**
- Fill in missing address components from property websites or other sources
- For properties with missing addresses, consider marking them as "Address TBD" or removing if data cannot be verified

**Affected Rows:** 197, 238, 493, 577, 578, etc.

### 4. Empty Site Name Fields
**Count:** 15 rows

**Impact:** Site names help distinguish between different units at the same property.

**Recommendation:**
- Fill in Site Name with a descriptive name (e.g., "Standard Tent", "Deluxe Cabin")
- If no specific site name exists, use Property Name as default
- Consider using Unit Type as part of the Site Name (e.g., "Yurt #1", "Safari Tent A")

### 5. URLs Missing Protocol
**Count:** 6 URLs

**Impact:** URLs without `http://` or `https://` may not work correctly in applications.

**Recommendation:**
- Add `https://` protocol to all URLs missing it
- Standardize all URLs to use HTTPS where possible

**Examples:**
- `conestogaranch.com` → `https://conestogaranch.com`

---

## 🟢 LOW PRIORITY ISSUES

### 6. State Field Formatting Issues
**Count:** 
- 113 rows with trailing spaces
- 4 rows with incorrect values (zip codes or "USA" instead of state code)

**Impact:** Inconsistent state formatting can cause filtering and grouping issues.

**Recommendation:**
- Remove all trailing/leading whitespace from State field
- Standardize all states to 2-letter abbreviations (CA, NY, TX, etc.)
- Fix incorrect values:
  - Row 578: "80132" (zip code) → should be state abbreviation
  - Row 934: "86046" (zip code) → should be state abbreviation
  - Rows 1027, 1030: "USA" → should be state abbreviation

**Script to fix:**
```bash
# Can be automated with a simple find/replace script
```

### 7. Address Field Formatting
**Count:** 19 addresses with trailing commas or spaces

**Impact:** Trailing characters can cause display issues and geocoding problems.

**Recommendation:**
- Trim all address fields to remove trailing commas and spaces
- Standardize address format (remove extra commas, normalize spacing)

**Examples:**
- `"68282 Mesa Dr, "` → `"68282 Mesa Dr"`
- `"Sutton-Alpine, "` → `"Sutton-Alpine"`

### 8. Price Formatting Inconsistencies
**Count:** 8 price fields with inconsistent formats

**Impact:** Inconsistent price formats make it difficult to parse and compare prices programmatically.

**Recommendation:**
- Standardize all prices to format: `$XXX.XX` or `$X,XXX.XX`
- For price ranges, use format: `$XXX-$XXX` or `$XXX.XX - $XXX.XX`
- Remove currency symbols from numeric-only fields if storing as numbers

**Examples:**
- `$1150-1450` → `$1,150 - $1,450` or `1150-1450`
- `$200-220` → `$200 - $220` or `200-220`

---

## 📊 ADDITIONAL OBSERVATIONS

### Data Completeness
- **Unit Types:** 20 unique types identified (Safari Tent, Yurt, Mirror Cabin, Dome, etc.)
- **Property Types:** 18 unique types identified
- Most properties have complete basic information (name, address, coordinates)

### Data Consistency
- Country codes are generally consistent (USA, United States, Canada)
- Most coordinates are valid and match addresses (after recent corrections)
- URL formats are mostly correct (only 6 need protocol added)

---

## 🛠️ RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (High Priority)
1. ✅ **DONE:** Fix coordinate errors (completed in previous session)
2. ⏳ **TODO:** Geocode 9 rows with missing coordinates
3. ⏳ **TODO:** Review and resolve 12 duplicate entries

### Phase 2: Data Completeness (Medium Priority)
4. ⏳ **TODO:** Fill in 12 missing addresses
5. ⏳ **TODO:** Fill in 15 empty Site Name fields
6. ⏳ **TODO:** Add protocol to 6 URLs

### Phase 3: Data Standardization (Low Priority)
7. ⏳ **TODO:** Clean 113 state fields (remove trailing spaces)
8. ⏳ **TODO:** Fix 4 incorrect state values
9. ⏳ **TODO:** Clean 19 address fields (remove trailing characters)
10. ⏳ **TODO:** Standardize 8 price formats

---

## 🔧 AUTOMATION SCRIPTS

### Available Scripts
1. **Coordinate Validation:** `scripts/validate-coordinates.ts`
   - Validates and corrects coordinate errors
   - Uses OpenStreetMap Nominatim (free) or Google Maps API

2. **Data Quality Analysis:** `scripts/analyze-data-quality.ts`
   - Analyzes CSV for data quality issues
   - Generates this report

### Suggested New Scripts
1. **Data Cleaning Script:** Automate fixes for:
   - Trimming whitespace from State and Address fields
   - Adding URL protocols
   - Standardizing price formats
   - Filling empty Site Names with defaults

2. **Duplicate Detection Script:** Enhanced duplicate detection with:
   - Fuzzy matching for similar property names
   - Address similarity checking
   - Coordinate-based duplicate detection

---

## 📝 NOTES

- The coordinate validation script successfully corrected 21 coordinate errors in the previous session
- Most data quality issues are formatting-related and can be easily automated
- Some missing data may require manual research (e.g., incomplete addresses)
- Consider implementing data validation rules in your data entry process to prevent future issues

---

## ✅ NEXT STEPS

1. Review this document and prioritize fixes based on your needs
2. Run the coordinate validation script to fix remaining coordinate issues
3. Create automated cleaning scripts for low-priority formatting issues
4. Manually review and fix high-priority duplicates and missing data
5. Consider implementing data entry validation to prevent future issues

---

**Generated by:** Data Quality Analysis Script  
**Script Location:** `scripts/analyze-data-quality.ts`

