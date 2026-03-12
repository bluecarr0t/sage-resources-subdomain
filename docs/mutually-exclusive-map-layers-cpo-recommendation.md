# Mutually Exclusive Map Layers - CPO Recommendation
## UI/UX Best Practices for Single-Layer Display

**Date:** January 2025  
**Decision Maker:** CPO  
**Context:** Redesigning map layer controls from independent toggles to mutually exclusive selection (only one layer visible at a time)

---

## Executive Summary

**Recommended Solution:** **Radio Button Group** with clear visual hierarchy and descriptive labels

**Rationale:** Radio buttons are the industry-standard UI pattern for mutually exclusive options. They provide clear visual feedback, excellent accessibility, and align with user expectations for "choose one" interactions.

**Alternative Considered:** Segmented Control (modern, but less space-efficient for descriptive content)

---

## Problem Statement

**Current State:**
- Map layers use independent toggle switches
- Multiple layers can be enabled simultaneously
- Users can view Population Change, Tourism Change, and Market Opportunity Zones together

**New Requirement:**
- Only ONE **data layer** can be visible on the map at a time
- Users must choose between: Population Change, Tourism Change, or Market Opportunity Zones
- **National Parks markers remain independent** - toggle switch (not a data layer, just map markers)
- Need to maintain clear descriptions and data source attribution

**Layer Types:**
1. **Data Visualization Layers** (mutually exclusive):
   - Population Change (county color-coding)
   - Tourism Change (county color-coding)
   - Market Opportunity Zones (county color-coding)

2. **Map Markers** (independent toggle):
   - National Parks (point markers, not data layers)

**Challenge:**
- Toggle switches imply independent on/off states, not mutually exclusive selection
- Need UI pattern that clearly communicates "choose one" behavior for data layers
- Must distinguish between data layers (radio buttons) and markers (toggle switch)
- Must work well on both desktop and mobile
- Should maintain accessibility standards

---

## Recommended Solution: Radio Button Group

### Primary Recommendation: **Radio Button Group** ⭐

**Why Radio Buttons:**
1. ✅ **Industry Standard** - Universal pattern for mutually exclusive options
2. ✅ **Clear Semantics** - Users immediately understand "choose one"
3. ✅ **Accessibility** - Native HTML radio buttons with proper ARIA support
4. ✅ **Visual Clarity** - Selected state is obvious (filled circle)
5. ✅ **Space Efficient** - Works well with descriptive text
6. ✅ **Mobile Friendly** - Large touch targets, easy to use on small screens
7. ✅ **Keyboard Navigation** - Arrow keys work natively

### UI/UX Design Specification

#### Layout Structure:

```
┌─────────────────────────────────────────┐
│ Map Layers                             │
├─────────────────────────────────────────┤
│                                         │
│ National Parks (Toggle Switch)         │
│ ┌─────────────────────────────────────┐ │
│ │ [Toggle] Show National Parks        │ │
│ │ Display National Parks markers on   │ │
│ │ the map                             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Data Layers (Radio Button Group)       │
│ ┌─────────────────────────────────────┐ │
│ │  ○ None (No data layer)             │ │
│ │    Hide all data visualization       │ │
│ │                                      │ │
│ │  ○ Population Change                │ │
│ │    Population change (2010-2020) as │ │
│ │    color-coded regions              │ │
│ │    Data source: data.census.gov     │ │
│ │                                      │ │
│ │  ○ Tourism Change                   │ │
│ │    Average year-over-year growth    │ │
│ │    (2001-2023) in Accommodations... │ │
│ │    Data source: U.S. Bureau of...  │ │
│ │                                      │ │
│ │  ○ Market Opportunity Zones          │ │
│ │    Counties where Population and    │ │
│ │    Tourism trends align              │ │
│ │    Data sources: U.S. Census, BEA   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Key Design Principles:**
- **National Parks** = Toggle switch (independent, can be on/off with any data layer)
- **Data Layers** = Radio button group (mutually exclusive, only one selected)
- Clear visual separation between marker controls and data layer controls
- National Parks toggle appears above data layer selection

#### Visual Design:

**Radio Button Styling:**
- **Unselected:** Empty circle with gray border (`#9ca3af`)
- **Selected:** Filled circle with brand color (`#00b6a6` or `#2196f3`)
- **Hover:** Slightly darker border, subtle background highlight
- **Focus:** Ring outline for keyboard navigation
- **Disabled:** Grayed out with reduced opacity

**Layout:**
- Vertical stack of radio options
- Each option in a card-like container with padding
- Radio button on the left, content on the right
- Clear visual separation between options

**Selected State:**
- Selected option has highlighted background (`bg-blue-50` or `bg-teal-50`)
- Border color changes to brand color
- Radio button filled with brand color

**Default State:**
- **"None" selected by default** (no layers visible)
- Users explicitly choose which layer to view

---

## Implementation Details

### Component Structure:

```tsx
<div className="space-y-4">
  {/* National Parks Toggle (Independent) */}
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          National Parks
        </span>
        <span className="text-xs text-gray-500">
          ({nationalParks.length} parks)
        </span>
      </div>
      <p className="text-xs text-gray-600 mt-0.5">
        Display National Parks markers on the map
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={showNationalParks}
      aria-label={showNationalParks ? 'Hide National Parks' : 'Show National Parks'}
      onClick={toggleNationalParks}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2 ${
        showNationalParks ? 'bg-[#10B981]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          showNationalParks ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>

  {/* Data Layers Radio Button Group (Mutually Exclusive) */}
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-gray-900 mb-2">Data Layers</h3>
    
    <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500">
      <input
        type="radio"
        name="mapLayer"
        value="none"
        checked={selectedLayer === 'none'}
        onChange={() => setSelectedLayer('none')}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900">None</div>
        <div className="text-sm text-gray-600 mt-0.5">Hide all data visualization layers</div>
      </div>
    </label>

    <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500">
      <input
        type="radio"
        name="mapLayer"
        value="population"
        checked={selectedLayer === 'population'}
        onChange={() => setSelectedLayer('population')}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900">Population Change</div>
        <div className="text-sm text-gray-600 mt-0.5">
          Population change (2010-2020) as color-coded regions
        </div>
        <div className="text-xs text-gray-500 mt-1 italic">
          Data source: <a href="..." className="text-blue-600 hover:underline">data.census.gov</a>
        </div>
      </div>
    </label>

    <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500">
      <input
        type="radio"
        name="mapLayer"
        value="tourism"
        checked={selectedLayer === 'tourism'}
        onChange={() => setSelectedLayer('tourism')}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900">Tourism Change</div>
        <div className="text-sm text-gray-600 mt-0.5">
          Average year-over-year growth (2001-2023) in Accommodations, Food Services, Arts, Entertainment & Recreation
        </div>
        <div className="text-xs text-gray-500 mt-1 italic">
          Data source: <a href="..." className="text-blue-600 hover:underline">U.S. Bureau of Economic Analysis</a>
        </div>
      </div>
    </label>

    <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500">
      <input
        type="radio"
        name="mapLayer"
        value="opportunity"
        checked={selectedLayer === 'opportunity'}
        onChange={() => setSelectedLayer('opportunity')}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900">Market Opportunity Zones</div>
        <div className="text-sm text-gray-600 mt-0.5">
          Counties where Population Change and Tourism Change trends align to identify investment opportunities
        </div>
        <div className="text-xs text-gray-500 mt-1 italic">
          Data sources: <a href="..." className="text-blue-600 hover:underline">U.S. Census Bureau</a>, <a href="..." className="text-blue-600 hover:underline">U.S. Bureau of Economic Analysis</a>
        </div>
      </div>
    </label>
  </div>
</div>
```

### State Management:

**Update MapContext:**
```typescript
// National Parks remains independent toggle (unchanged)
const [showNationalParks, setShowNationalParks] = useState<boolean>(true);
const toggleNationalParks = () => setShowNationalParks(prev => !prev);

// Data layers: Replace individual boolean states with single selected layer state
type MapLayer = 'none' | 'population' | 'tourism' | 'opportunity';
const [selectedMapLayer, setSelectedMapLayer] = useState<MapLayer>('none');

// Single setter function for data layers
const setMapLayer = (layer: MapLayer) => {
  setSelectedMapLayer(layer);
};

// Derived states for backward compatibility (used in components)
const showPopulationLayer = selectedMapLayer === 'population';
const showGDPLayer = selectedMapLayer === 'tourism';
const showOpportunityZones = selectedMapLayer === 'opportunity';
```

**Key Points:**
- **National Parks**: Independent toggle switch (can be on/off regardless of data layer)
- **Data Layers**: Mutually exclusive radio buttons (only one can be selected)
- National Parks and data layers work independently - users can have National Parks on with any data layer (or none)

---

## Alternative Options Considered

### Option 2: Segmented Control (iOS-style)

**Description:** Horizontal button group where one option is selected

**Pros:**
- ✅ Modern, polished appearance
- ✅ Compact horizontal layout
- ✅ Good for 3-4 options

**Cons:**
- ❌ **Less space for descriptions** - Difficult to show detailed descriptions
- ❌ **Mobile challenges** - Horizontal layout can be cramped on small screens
- ❌ **Data source attribution** - Hard to fit attribution text
- ❌ **Accessibility** - Requires custom implementation vs. native radio buttons

**B2B Impact:** **Negative** - B2B users need detailed descriptions and data source information, which segmented controls don't accommodate well.

**Decision:** ❌ **Rejected** - Insufficient space for required descriptive content

---

### Option 3: Dropdown/Select Menu

**Description:** Single dropdown menu to select layer

**Pros:**
- ✅ Very space-efficient
- ✅ Familiar pattern
- ✅ Good for many options

**Cons:**
- ❌ **Hidden options** - Users can't see all options without opening
- ❌ **Less discoverable** - Options are hidden by default
- ❌ **Poor for 3-4 options** - Overkill for small number of choices
- ❌ **No descriptions visible** - Can't show detailed descriptions in dropdown

**B2B Impact:** **Negative** - Reduces discoverability and makes it harder to understand what each layer shows.

**Decision:** ❌ **Rejected** - Hides important information and reduces discoverability

---

### Option 4: Tab Interface

**Description:** Tab-style navigation between layers

**Pros:**
- ✅ Clear visual separation
- ✅ Good for switching between views
- ✅ Modern pattern

**Cons:**
- ❌ **Horizontal space** - Requires horizontal layout (challenging on mobile)
- ❌ **Less intuitive for "none" option** - Tabs typically don't have "off" state
- ❌ **More complex** - Requires tab component implementation

**B2B Impact:** **Neutral** - Works but doesn't clearly communicate "none" option.

**Decision:** ❌ **Rejected** - Radio buttons are more appropriate for this use case

---

## Best Practices Applied

### 1. **Clear Visual Hierarchy**
- Radio button clearly indicates selected state
- Selected option has distinct visual treatment (background color, border)
- Unselected options remain clearly visible

### 2. **Descriptive Labels**
- Each option has a clear title
- Description explains what the layer shows
- Data source attribution included for transparency

### 3. **Accessibility**
- Native HTML radio buttons (semantic HTML)
- Proper `name` attribute for grouping
- Keyboard navigation (arrow keys, tab)
- Screen reader friendly
- Focus states clearly visible

### 4. **Mobile Responsiveness**
- Large touch targets (minimum 44x44px)
- Vertical layout works on all screen sizes
- Text remains readable on small screens
- No horizontal scrolling required

### 5. **User Feedback**
- Immediate visual feedback on selection
- Smooth transitions between states
- Loading states when layer data is fetching
- Clear indication when no layer is selected

---

## Legend Display Logic

**Recommendation:** Show legend only for the selected layer

**Implementation:**
```tsx
{selectedMapLayer === 'population' && (
  <PopulationLegend />
)}
{selectedMapLayer === 'tourism' && (
  <TourismLegend />
)}
{selectedMapLayer === 'opportunity' && (
  <OpportunityZonesLegend />
)}
{selectedMapLayer === 'none' && (
  // No legend shown
)}
```

**Rationale:**
- Reduces visual clutter
- Focuses attention on active layer
- Legend appears directly below selected option
- Consistent with "one thing at a time" philosophy

---

## State Management Updates

### MapContext Changes:

**Before (Independent Toggles):**
```typescript
const [showPopulationLayer, setShowPopulationLayer] = useState<boolean>(false);
const [showGDPLayer, setShowGDPLayer] = useState<boolean>(false);
const [showOpportunityZones, setShowOpportunityZones] = useState<boolean>(false);

const togglePopulationLayer = () => setShowPopulationLayer(prev => !prev);
const toggleGDPLayer = () => setShowGDPLayer(prev => !prev);
const toggleOpportunityZones = () => setShowOpportunityZones(prev => !prev);
```

**After (Mutually Exclusive):**
```typescript
type MapLayer = 'none' | 'population' | 'tourism' | 'opportunity';

const [selectedMapLayer, setSelectedMapLayer] = useState<MapLayer>('none');

const setMapLayer = (layer: MapLayer) => {
  setSelectedMapLayer(layer);
};

// Derived states for backward compatibility
const showPopulationLayer = selectedMapLayer === 'population';
const showGDPLayer = selectedMapLayer === 'tourism';
const showOpportunityZones = selectedMapLayer === 'opportunity';
```

---

## User Experience Flow

### Initial State:
1. User opens map
2. **National Parks**: Enabled by default (toggle switch ON)
3. **Data Layer**: "None" selected by default (no data visualization)
4. Map shows property markers + National Parks markers
5. Radio button group visible with all data layer options

### Selecting a Data Layer:
1. User clicks radio button for desired data layer (e.g., "Population Change")
2. Previous data layer (if any) immediately hides
3. Selected data layer begins loading (if data not cached)
4. Loading indicator shows on selected option
5. Data layer appears on map when ready (county color-coding)
6. **National Parks markers remain visible** (independent toggle)
7. Legend appears below selected data layer option

### Switching Data Layers:
1. User clicks different radio button (e.g., from "Population" to "Tourism")
2. Current data layer hides immediately
3. New data layer begins loading
4. Smooth transition (no jarring map changes)
5. **National Parks markers remain visible** (unchanged)
6. Legend updates to match new data layer

### Deselecting Data Layer (Returning to None):
1. User clicks "None" radio button
2. Current data layer hides
3. Map returns to base state (properties + National Parks markers only)
4. No data layer legend displayed
5. **National Parks markers remain visible** (unless user toggles them off)

### Toggling National Parks:
1. User clicks National Parks toggle switch
2. **Independent of data layer selection** - works with any data layer or none
3. Markers appear/disappear immediately
4. No impact on data layer visibility

---

## Mobile Considerations

### Touch Targets:
- Radio buttons: Minimum 44x44px touch area
- Entire label area should be clickable (not just radio button)
- Adequate spacing between options (minimum 8px)

### Layout:
- Vertical stack works well on mobile
- Descriptions may wrap to multiple lines (acceptable)
- Data source links remain clickable
- No horizontal scrolling required

### Performance:
- Only one layer loads at a time (better performance)
- Faster initial load (no layers by default)
- Reduced memory usage

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance:

1. **Keyboard Navigation:**
   - Tab to focus on radio group
   - Arrow keys to navigate between options
   - Enter/Space to select

2. **Screen Readers:**
   - Proper `role="radiogroup"`
   - `aria-label` for group
   - `aria-checked` for each option
   - Descriptive labels read aloud

3. **Visual Indicators:**
   - Focus ring clearly visible
   - Selected state obvious (color + filled circle)
   - High contrast ratios (4.5:1 minimum)

4. **Error Prevention:**
   - Clear indication of current selection
   - No accidental deselection (explicit "None" option)

---

## Migration Strategy

### Phase 1: State Management Update
1. **Keep National Parks toggle** (no changes needed)
2. Add `selectedMapLayer` state to MapContext for data layers
3. Keep old boolean states for backward compatibility (derived from new state)
4. Update data layer toggle functions to set new state
5. Ensure National Parks and data layers work independently

### Phase 2: UI Component Update
1. **Keep National Parks toggle switch** (unchanged, appears first)
2. Replace data layer toggle switches with radio button group
3. Add visual separation between National Parks toggle and data layer selection
4. Add section heading "Data Layers" to clarify distinction
5. Update styling to match design system
6. Add loading states for data layers

### Phase 3: Testing & Refinement
1. Test on desktop and mobile
2. Verify National Parks toggle works independently
3. Verify data layers are mutually exclusive
4. Test combinations (National Parks + each data layer)
5. Verify accessibility (keyboard, screen readers)
6. User testing with target B2B users
7. Refine based on feedback

### Phase 4: Cleanup
1. Remove old data layer toggle functions (keep National Parks toggle)
2. Update documentation
3. Remove unused state variables (keep National Parks state)

---

## Success Metrics

Track the following to validate the approach:

1. **Adoption:**
   - % of users who select a layer (vs. leaving "None")
   - Most popular layer selection
   - Average time to select a layer

2. **Usability:**
   - Time to switch between layers
   - Error rate (accidental selections)
   - User satisfaction with new pattern

3. **Performance:**
   - Page load time (should improve with no default layers)
   - Layer switching speed
   - Memory usage reduction

4. **Accessibility:**
   - Keyboard navigation usage
   - Screen reader compatibility
   - Focus management

---

## Future Enhancements

Consider these for future iterations:

1. **Layer Presets:**
   - "Quick View" buttons for common combinations
   - Save favorite layer selections

2. **Layer Comparison:**
   - Allow side-by-side comparison (if requirement changes)
   - Split-screen view with two layers

3. **Layer History:**
   - Remember last selected layer
   - Quick switch to previous layer

4. **Keyboard Shortcuts:**
   - Number keys (1, 2, 3, 4) to switch layers
   - Power user feature

---

## Conclusion

**Recommended Approach:**
- ✅ **National Parks**: Independent toggle switch (unchanged, appears first)
- ✅ **Data Layers**: Radio button group for mutually exclusive selection
- ✅ **"None" option** as default for data layers (no data visualization)
- ✅ **Clear visual separation** between marker controls and data layer controls
- ✅ **Descriptive labels** with data source attribution
- ✅ **Legend shown only for selected data layer**

This approach provides:
- Clear distinction between markers (toggle) and data layers (radio buttons)
- Independent control: National Parks can be on/off with any data layer
- Clear, intuitive user experience
- Industry-standard UI patterns (toggle for on/off, radio for choose-one)
- Excellent accessibility
- Mobile-friendly design
- Space for detailed descriptions
- Better performance (one data layer at a time)

**Next Steps:**
1. Update MapContext state management
2. Replace toggle switches with radio button group
3. Update layer visibility logic
4. Test on desktop and mobile
5. Verify accessibility compliance
6. Gather user feedback

---

**Approved by:** CPO  
**Date:** January 2025
