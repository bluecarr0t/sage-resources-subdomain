# Alaska & Hawaii Coordinates Fix Plan

## Problem Summary

The current coordinate validation bounds are too restrictive and incorrectly filter out 33 valid properties:
- **22 Alaska properties** (longitude ranges from -149°W to -143°W, which is west of the current -141°W limit)
- **11 Hawaii properties** (latitude ranges from 19°N to 21°N, which is below the current 20°N minimum, and longitude ranges from -158°W to -155°W, which is west of -141°W)

## Current Bounds (Too Restrictive)

```typescript
// Current bounds in lib/types/sage.ts
Latitude:  20°N to 85°N
Longitude: -141°W to -50°W
```

## Actual USA/Canada Geographic Bounds

- **USA (mainland)**: 24°N to 49°N, -125°W to -66°W
- **Alaska**: 51°N to 71°N, **-179°W to -130°W** (extends much further west!)
- **Hawaii**: **18°N to 22°N**, **-160°W to -154°W** (below 20°N and west of -141°W)
- **Canada**: 41°N to 83°N, -141°W to -52°W (mainland)
- **Canada (islands)**: Extends further west

## Solution Options

### Option 1: Expand Bounds (Recommended) ✅

**Pros:**
- Simple, single change
- Covers all US states and territories
- No need to check state field
- Future-proof for any valid US/Canada location

**Cons:**
- Slightly less precise (but still reasonable)

**Implementation:**
```typescript
// Updated bounds
Latitude:  18°N to 85°N  // Include Hawaii (starts at ~18°N)
Longitude: -179°W to -50°W  // Include all of Alaska (extends to -179°W)
```

### Option 2: State-Based Validation

**Pros:**
- More precise validation
- Can catch coordinate mismatches

**Cons:**
- More complex code
- Requires accurate state data
- Need to handle edge cases (missing state, etc.)

## Recommended Solution: Option 1

### Implementation Steps

1. **Update `isInUSAOrCanada()` function in `lib/types/sage.ts`**
   - Change latitude bounds: `20` → `18`
   - Change longitude bounds: `-141` → `-179`

2. **Update function documentation**
   - Update comments to reflect new bounds
   - Note that bounds now include Alaska and Hawaii

3. **Test the changes**
   - Verify all 33 previously invalid coordinates now pass validation
   - Verify map displays all Alaska and Hawaii properties
   - Run the analysis script to confirm 0 invalid coordinates

4. **Update any other validation functions**
   - Check `scripts/validate-coordinates.ts` if it has similar bounds
   - Check `components/GooglePropertyMap.tsx` for any hardcoded bounds

### Files to Modify

1. **`lib/types/sage.ts`** (Primary fix)
   - Function: `isInUSAOrCanada()`
   - Lines: ~195-202

2. **`scripts/validate-coordinates.ts`** (If exists)
   - Function: `validateCoordinatesForLocation()`
   - May need similar updates

3. **Documentation**
   - Update any docs mentioning coordinate bounds

## Expected Results

After implementing the fix:
- ✅ All 33 properties will be included in the map
- ✅ Map count should increase by ~33 properties (after deduplication)
- ✅ No valid US/Canada locations will be incorrectly filtered
- ✅ Alaska and Hawaii properties will display correctly

## Verification

Run these commands after implementation:

```bash
# Verify all coordinates are now valid
npx tsx scripts/investigate-alaska-coordinates.ts

# Should show 0 invalid coordinates

# Verify map count
# Check /map page - should show more properties
```

## Affected Properties

### Alaska (22 properties)
- Alpenglow Luxury Camping (Sutton-Alpine)
- Log Cabin Wilderness Lodge (Tok)
- Borealis Basecamp (Fairbanks)
- Orca Island Cabins (Seward)
- Shearwater Cove (Seward)
- Camp McCarthy (McCarthy)
- Glacier View Adventures (Sutton-Alpine)
- Cloudberry Cabin (Tok)

### Hawaii (11 properties)
- Keola Retreat (Naalehu)
- The Haven at Hawi Nani Ranch (Hawi)
- The Point at Haleiwa
- Kalōpā State Recreation Area (Honokaa)
- The Sunset Yurt
- Hilo Glamping Yurt
- Gingerhill Farm Retreat
- Camp Olowalu (Lahaina)

## Notes

- All coordinates have been verified as legitimate locations
- No geocoding or coordinate correction needed
- This is purely a bounds validation issue
- The fix is backward compatible (doesn't break existing valid coordinates)

