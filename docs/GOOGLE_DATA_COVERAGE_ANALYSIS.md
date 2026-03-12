# Google Data Coverage Analysis

**Date:** Analysis completed  
**Table:** `sage-glamping-data`

---

## Current Coverage Status

### Statistics
- **Total Properties:** 1,000 (after deleting 2 Airbnb/Hipcamp properties)
- **Properties WITH Google Data:** 177 (17.7%)
- **Properties WITHOUT Google Data:** 823 (82.3%)

### Breakdown by Field
| Field | Count | Percentage |
|------|-------|------------|
| Google Phone Number | 164 | 16.4% |
| Google Website URI | 170 | 17.0% |
| Google Primary Type | 176 | 17.6% |
| Any Google Data | 177 | 17.7% |

---

## Why Coverage is Low

### Root Cause
The Google Places API fetcher script (`fetch_google_places_extended.py`) was only run on a **subset of properties** during initial testing. The script was likely run with:
- A `--limit` flag (e.g., `--limit 200`) for testing
- Or only processed properties that were in the original CSV files that had Google data

### What Happened
1. **Initial Upload:** CSV was uploaded with Google data for ~18% of properties
2. **Limited Fetching:** The Google Places API fetcher was only run on a small subset
3. **Result:** 823 properties (82.3%) still don't have Google Places data

---

## Solution: Increase Coverage

To increase Google data coverage, we need to:

1. **Run Google Places API Fetcher on ALL Properties**
   - Process all 1,000 properties (or at least the 823 without data)
   - This will fetch Google Places data for properties that don't have it yet

2. **Estimated API Calls**
   - ~1,000 Text Search API calls (to find place_id)
   - ~1,000 Place Details API calls (to get full data)
   - **Total:** ~2,000 API calls

3. **Time & Cost**
   - With 0.1s delay: ~3-4 minutes
   - With 0.15s delay: ~5-6 minutes
   - API costs depend on your Google Cloud billing

---

## Recommendation

**Run the Google Places API fetcher on all remaining properties:**

```bash
python3 scripts/fetch_google_places_extended.py --delay 0.15
```

This will:
- ✅ Process all properties without Google data
- ✅ Fetch contact info, amenities, photos, types, etc.
- ✅ Update Supabase with new Google Places data
- ✅ Increase coverage from 17.7% to potentially 60-80%+ (depending on how many properties are found in Google Places)

---

## Expected Results

After running the fetcher on all properties:
- **Current:** 177 properties with Google data (17.7%)
- **Expected:** 600-800+ properties with Google data (60-80%+)
- **Improvement:** 3-4x increase in coverage

**Note:** Not all properties will be found in Google Places API, so 100% coverage is unlikely. However, most professional glamping resorts should be findable.

---

## Next Steps

1. ✅ **Analysis Complete** - Identified low coverage issue
2. 🔄 **Run Fetcher** - Execute Google Places API fetcher on all properties
3. ✅ **Verify Results** - Check updated coverage after completion

---

*Analysis completed - Ready to increase Google data coverage!*

