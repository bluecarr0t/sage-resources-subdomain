# National Parks Map Marker Toggle - Product Recommendation

**Date:** 2024  
**Author:** CPO Recommendation  
**Status:** Recommended for Implementation

## Executive Summary

**Recommended Solution:** Add a toggle switch in the filters sidebar to show/hide National Parks markers.

**Rationale:** This approach provides the best balance of user experience, discoverability, consistency with existing patterns, and implementation simplicity.

---

## Problem Statement

Users need the ability to show or hide National Parks markers on the map to:
- Reduce visual clutter when focusing on glamping properties
- Improve map performance when viewing dense marker areas
- Customize their map view based on their specific needs

Currently, National Parks markers are always displayed with no user control.

---

## Recommended Solution: Toggle Switch in Filters Sidebar

### Implementation Details

**Location:** Filters sidebar, positioned after the "Filter by Avg. Retail Rate Range" section

**UI Component:** Toggle switch with label "Show National Parks"

**Default State:** `true` (National Parks visible by default)

**Visual Design:**
- Match existing filter section styling
- Use a standard toggle switch component
- Include a brief description: "Display National Parks markers on the map"
- Show count of parks when visible: "Show National Parks (63 parks)"

### Technical Implementation

1. **Add to MapContext:**
   - New state: `showNationalParks: boolean` (default: `true`)
   - Toggle function: `toggleNationalParks: () => void`

2. **Update GooglePropertyMap Component:**
   - Modify the National Parks markers `useEffect` to check `showNationalParks` state
   - When `false`, set all markers to `null` map (hide them)
   - When `true`, display markers as currently implemented

3. **Add UI in Filters Section:**
   - Position after Rate Range filter
   - Use consistent styling with other filter sections
   - Include toggle switch with label and description

---

## Why This Solution?

### ✅ Advantages

1. **Consistency with Existing Patterns**
   - Matches the current filter UI structure
   - Users already know where to find map controls
   - Maintains design system consistency

2. **High Discoverability**
   - Located in the primary filters area where users expect controls
   - Visible without needing to explore the map interface
   - Clear labeling makes purpose obvious

3. **Excellent Mobile Experience**
   - Works seamlessly with existing collapsible filter section
   - No additional map overlay buttons to tap
   - Consistent with mobile-first design approach

4. **Simple Implementation**
   - Minimal code changes required
   - Leverages existing context pattern
   - No new UI components needed

5. **User-Friendly**
   - Binary on/off is intuitive
   - Default visible state matches current behavior
   - Can be toggled quickly without disrupting workflow

6. **Performance Benefits**
   - When hidden, markers are removed from map (not just invisible)
   - Reduces map rendering load
   - Improves interaction performance

### ⚠️ Considerations

1. **Not a "Filter" in Traditional Sense**
   - National Parks aren't filtered data, they're a map layer
   - However, users will understand the control in this context

2. **Sidebar Space**
   - Adds one more control to the filters section
   - Minimal impact given existing collapsible design

---

## Alternative Solutions Considered

### Option 2: Floating Map Layer Control Button

**Description:** Floating button on the map (top-right corner) with a layers menu

**Pros:**
- Common pattern in mapping applications
- Always visible without opening sidebar
- Can accommodate future map layers

**Cons:**
- ❌ Inconsistent with current UI patterns
- ❌ Less discoverable (users may not notice it)
- ❌ Adds visual clutter to map
- ❌ More complex implementation
- ❌ Poor mobile experience (small touch target)

**Decision:** Rejected - doesn't align with current design system

### Option 3: Checkbox in Filter Section

**Description:** Checkbox instead of toggle switch

**Pros:**
- Simple binary control
- Familiar UI pattern

**Cons:**
- ❌ Less modern than toggle switch
- ❌ Toggle switch is more appropriate for on/off states
- ❌ Toggle provides better visual feedback

**Decision:** Rejected - toggle switch is more appropriate

### Option 4: Map Legend Integration

**Description:** Add toggle in map legend/controls area

**Pros:**
- Keeps map controls together
- Could show park icon in legend

**Cons:**
- ❌ No existing legend/controls area in current design
- ❌ Would require new UI section
- ❌ Less discoverable than filters sidebar
- ❌ More complex implementation

**Decision:** Rejected - no existing pattern to follow

---

## Implementation Priority

**Priority:** Medium-High

**Effort:** Low (2-4 hours)

**Impact:** Medium-High (improves user control and map performance)

**Dependencies:** None

---

## Success Metrics

After implementation, we should track:
- Toggle usage rate (% of users who toggle National Parks)
- Default preference (do users prefer parks visible or hidden?)
- Impact on map performance (especially in dense marker areas)

---

## Future Enhancements

If this toggle proves valuable, consider:
1. **Persist user preference** in localStorage
2. **Add more map layers** (state parks, landmarks, etc.) with similar toggles
3. **Group layer controls** if multiple layers are added
4. **Add keyboard shortcut** for power users

---

## Conclusion

The toggle switch in the filters sidebar is the recommended solution because it:
- ✅ Aligns with existing UI patterns
- ✅ Provides excellent discoverability
- ✅ Offers simple, intuitive control
- ✅ Requires minimal implementation effort
- ✅ Works well on all device sizes

This solution balances user needs with technical simplicity and maintains consistency with the current design system.
