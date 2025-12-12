# Market Opportunity Zones - CPO Recommendation
## Strategic Product Decision for B2B Map Tool

**Date:** January 2025  
**Decision Maker:** CPO  
**Context:** Implementation of Market Opportunity Zones feature combining Population Change and Tourism Change data layers

---

## Executive Summary

After reviewing the current implementation and considering B2B user needs (investors, developers, operators, outdoor industry professionals), I recommend:

1. **Question 1 (Enablement):** **Option B** - Add a separate toggle that only works when both layers are enabled
2. **Question 2 (Thresholds):** **Option A** - High: Both >5%, Moderate: One >5% OR both positive, Low: Both negative or one negative

**Rationale:** This approach maximizes user control, discoverability, and business value while maintaining clarity for decision-making.

---

## Question 1: How Should Market Opportunity Zones Be Enabled?

### Recommendation: **Option B - Separate Toggle (Conditional)**

**Selected:** ✅ **Option B** - Add a separate toggle that only works when both layers are enabled

### Analysis of All Options:

#### Option A: Automatically Show When Both Layers Enabled
**Pros:**
- ✅ Simple UX - no additional controls
- ✅ Automatic discovery of correlation insights
- ✅ Less cognitive load

**Cons:**
- ❌ **Loses individual layer visibility** - users can't see raw data when correlation is active
- ❌ **Reduces user control** - forces correlation view when both layers are on
- ❌ **Confusing for power users** - they may want to see individual layers AND correlation
- ❌ **Limits flexibility** - can't toggle correlation independently

**B2B Impact:** Negative - Power users (investors, developers) need granular control to analyze individual metrics before seeing correlations.

---

#### Option B: Separate Toggle (Conditional) ⭐ **RECOMMENDED**
**Pros:**
- ✅ **User control** - explicit choice to view correlation
- ✅ **Preserves individual layer views** - can see raw data AND correlation
- ✅ **Discoverable** - toggle appears when prerequisites are met (teaches users about correlation)
- ✅ **Flexible** - can enable/disable correlation without affecting individual layers
- ✅ **Clear intent** - user explicitly chooses to see "opportunity zones"
- ✅ **Progressive disclosure** - advanced feature revealed when needed

**Cons:**
- ⚠️ Requires one additional UI element (minimal impact)
- ⚠️ Users must understand prerequisite (mitigated by disabled state + tooltip)

**B2B Impact:** **Highly Positive** - Gives professional users the control they need while making the feature discoverable.

**UX Implementation:**
- Toggle appears below GDP layer toggle
- Disabled state when prerequisites not met (both layers off)
- Tooltip: "Enable both Population Change and Tourism Change layers to view Market Opportunity Zones"
- Visual indicator (grayed out) when disabled
- When enabled, shows 3-tier color scheme (High/Moderate/Low opportunity)

---

#### Option C: Replace Individual Visualizations
**Pros:**
- ✅ Cleaner map view (single visualization)
- ✅ Forces focus on correlation

**Cons:**
- ❌ **Major UX problem** - users lose access to individual layer data
- ❌ **Confusing** - turning on two layers suddenly changes what they show
- ❌ **No way to compare** - can't see individual metrics vs. correlation
- ❌ **Violates user expectations** - toggles should show what they say they show

**B2B Impact:** **Very Negative** - Professional users need to see both individual metrics AND correlations. This approach removes critical functionality.

---

### Final Recommendation for Question 1: **Option B**

**Key Reasoning:**
1. **B2B users need granular control** - Investors and developers analyze individual metrics before looking at correlations
2. **Progressive disclosure** - Feature appears when relevant (both layers enabled), teaching users about the relationship
3. **Flexibility** - Users can toggle correlation on/off without losing individual layer views
4. **Clear value proposition** - "Market Opportunity Zones" as a distinct feature with clear purpose
5. **Industry standard** - Most B2B analytics tools use conditional toggles for advanced features

---

## Question 2: What Thresholds Should Define the 3-Tier Opportunity Zones?

### Recommendation: **Option A - 5% Threshold**

**Selected:** ✅ **Option A** - High: Both >5%, Moderate: One >5% OR both positive, Low: Both negative or one negative

### Analysis of Both Options:

#### Option A: 5% Threshold ⭐ **RECOMMENDED**

**Tier Definitions:**
- **High Opportunity:** Both Population Change >5% AND Tourism Change >5%
- **Moderate Opportunity:** One >5% OR both positive (but not both >5%)
- **Low Opportunity:** Both negative OR one negative

**Pros:**
- ✅ **Higher bar for "High"** - 5% is a meaningful growth threshold for B2B decisions
- ✅ **More selective** - Fewer counties qualify as "High," making it more valuable
- ✅ **Aligns with business metrics** - 5% growth is often a key performance indicator
- ✅ **Reduces false positives** - Less likely to flag marginal markets as "High"
- ✅ **Clear differentiation** - Stronger distinction between tiers

**Cons:**
- ⚠️ May exclude some good markets (mitigated by "Moderate" tier)

**B2B Impact:** **Positive** - More conservative threshold aligns with investment-grade decision making.

---

#### Option B: 3% Threshold

**Tier Definitions:**
- **High Opportunity:** Both Population Change >3% AND Tourism Change >3%
- **Moderate Opportunity:** One >3% OR both positive (but not both >3%)
- **Low Opportunity:** Both negative

**Pros:**
- ✅ More inclusive - captures more markets as "High"
- ✅ Lower threshold may catch emerging markets earlier

**Cons:**
- ❌ **Too permissive** - 3% growth is relatively modest for "High" opportunity
- ❌ **Less selective** - More counties qualify, reducing the value of "High" tier
- ❌ **Weaker signal** - 3% may not be significant enough for investment decisions
- ❌ **Incomplete "Low" definition** - Missing "one negative" case (inconsistent with Option A)

**B2B Impact:** **Neutral to Negative** - May create too many "High" opportunities, reducing the feature's value for prioritization.

---

### Final Recommendation for Question 2: **Option A (5% Threshold)**

**Key Reasoning:**
1. **Investment-grade threshold** - 5% is a meaningful growth rate for B2B decision-making
2. **Quality over quantity** - More selective "High" tier increases its value
3. **Industry alignment** - 5% growth is commonly used as a performance benchmark
4. **Clear signal strength** - Markets with both metrics >5% represent strong, validated opportunities
5. **Complete tier logic** - Includes all edge cases (both negative, one negative, etc.)

**Additional Consideration:**
- Consider making thresholds **configurable** in future iterations (advanced users may want to adjust)
- Document the rationale in tooltips/help text: "High opportunity zones require both population and tourism growth exceeding 5%, indicating strong, validated market potential"

---

## Implementation Recommendations

### UI/UX Design:

1. **Market Opportunity Zones Toggle:**
   ```
   [Toggle] Market Opportunity Zones
   Description: "Combined view showing counties with high, moderate, or low opportunity based on population and tourism growth"
   State: Disabled (grayed) when both layers not enabled
   Tooltip when disabled: "Enable both Population Change and Tourism Change to view opportunity zones"
   ```

2. **Visual Design:**
   - **High Opportunity:** Green/Teal (e.g., `#10B981` or `#00b6a6`)
   - **Moderate Opportunity:** Yellow/Amber (e.g., `#F59E0B`)
   - **Low Opportunity:** Blue/Gray (e.g., `#6B7280`)
   - Use distinct colors from individual layer color schemes to avoid confusion

3. **Legend:**
   ```
   Market Opportunity Zones
   ────────────────────────
   🟢 High: Both >5% growth
   🟡 Moderate: One >5% OR both positive
   🔵 Low: Both negative OR one negative
   ```

4. **Info Window Enhancement:**
   When both layers are enabled AND opportunity zones are active, show:
   ```
   County: [Name]
   ────────────────────────
   Market Opportunity: [High/Moderate/Low]
   
   Population Change (2010-2020): +X.X%
   Tourism Change (2001-2023): +Y.Y%
   
   [Individual metrics still visible]
   ```

### Technical Considerations:

1. **State Management:**
   - Add `showOpportunityZones: boolean` to `MapContext`
   - Add `toggleOpportunityZones()` function
   - Conditional rendering based on `showPopulationLayer && showGDPLayer`

2. **Data Processing:**
   - Calculate opportunity tier for each county when both layers are enabled
   - Cache calculations to avoid recomputation
   - Handle edge cases (missing data, null values)

3. **Performance:**
   - Reuse existing GeoJSON county boundaries
   - Apply opportunity zone styling similar to existing layer implementations
   - Consider data layer optimization if rendering both individual layers + opportunity zones

---

## Success Metrics

Track the following to validate the approach:

1. **Adoption:**
   - % of users who enable both layers
   - % of users who enable opportunity zones when available
   - Time to discover opportunity zones feature

2. **Engagement:**
   - Average time spent viewing opportunity zones
   - Click-through rate on opportunity zone counties
   - Comparison to individual layer engagement

3. **Business Value:**
   - User feedback on decision-making value
   - Feature requests for threshold customization
   - Requests for additional correlation features

---

## Future Enhancements

Consider these for future iterations:

1. **Configurable Thresholds:**
   - Allow advanced users to adjust 5% threshold
   - Preset options: "Conservative (5%)", "Moderate (3%)", "Aggressive (7%)"

2. **Additional Correlation Layers:**
   - Population + Property Density
   - Tourism + National Parks proximity
   - Multi-metric opportunity scores

3. **Filtering Integration:**
   - Filter properties by opportunity zone tier
   - "Show only High opportunity counties"

4. **Export/Reporting:**
   - Export opportunity zone analysis
   - Generate reports for specific regions

---

## Conclusion

**Recommended Approach:**
- ✅ **Option B** for enablement (separate conditional toggle)
- ✅ **Option A** for thresholds (5% for High tier)

This combination provides:
- Maximum user control and flexibility
- High-quality, investment-grade insights
- Clear value proposition for B2B users
- Scalable foundation for future enhancements

**Next Steps:**
1. Implement Market Opportunity Zones toggle with conditional enablement
2. Apply 5% threshold logic for tier classification
3. Design distinct color scheme for opportunity zones
4. Add tooltips and help text explaining the feature
5. Test with target B2B users for feedback

---

## Additional Questions: Display Method & Color Scheme

### Question 3: How Should Correlation Zones Be Displayed on the Map?

**Recommendation: Option C - Separate Visual Layer (Independent Toggle)** ⭐ **RECOMMENDED**

**Selected:** ✅ **Option C** - Show as a separate visual layer that can be toggled independently

#### Analysis of All Options:

#### Option A: Replace Individual Layer Colors When Enabled
**Pros:**
- ✅ Cleaner visual - single color scheme
- ✅ Focuses attention on correlation

**Cons:**
- ❌ **Loses individual layer data visibility** - users can't see raw Population/Tourism metrics visually
- ❌ **Confusing UX** - enabling opportunity zones changes what existing layers show
- ❌ **Violates user expectations** - toggles should show what they're labeled as
- ❌ **No comparison capability** - can't visually compare individual metrics vs. correlation

**B2B Impact:** **Negative** - Professional users need to see both individual metrics AND correlations simultaneously for analysis.

---

#### Option B: Overlay with Borders/Patterns
**Pros:**
- ✅ Shows both individual layer data AND opportunity zones
- ✅ Preserves underlying layer information

**Cons:**
- ❌ **Visual clutter** - borders/patterns may be hard to read at different zoom levels
- ❌ **Complex rendering** - requires managing multiple visual styles simultaneously
- ❌ **Accessibility concerns** - patterns may be difficult for colorblind users
- ❌ **Performance impact** - rendering multiple styles per feature is computationally expensive
- ❌ **Unclear hierarchy** - which visualization takes precedence?

**B2B Impact:** **Neutral to Negative** - While it preserves data, the visual complexity may reduce usability.

---

#### Option C: Separate Visual Layer (Independent Toggle) ⭐ **RECOMMENDED**
**Pros:**
- ✅ **Clear separation** - distinct layer with distinct purpose
- ✅ **User control** - can toggle opportunity zones independently
- ✅ **Preserves individual layers** - all three visualizations can be active simultaneously
- ✅ **Clean visual hierarchy** - opportunity zones use distinct color scheme
- ✅ **Flexible analysis** - users can compare individual metrics vs. correlation
- ✅ **Matches previous recommendation** - aligns with separate toggle approach (Option B from Question 1)
- ✅ **Technical feasibility** - similar to existing layer implementation pattern

**Cons:**
- ⚠️ Three layers may be visible simultaneously (mitigated by clear color differentiation)
- ⚠️ Requires managing layer z-index/rendering order

**B2B Impact:** **Highly Positive** - Maximum flexibility for professional analysis while maintaining clarity.

**Technical Implementation:**
- Create new `OpportunityZonesLayer` component (similar to `PopulationLayer` and `GDPLayer`)
- Use same GeoJSON county boundaries
- Apply opportunity zone colors based on calculated tiers
- Render as separate `Data` component in Google Maps
- Manage z-index so opportunity zones appear above individual layers when enabled

---

### Final Recommendation for Question 3: **Option C**

**Key Reasoning:**
1. **Aligns with previous recommendation** - Separate toggle (Question 1, Option B) requires separate visual layer
2. **Maximum user control** - Users can view individual metrics, correlations, or both
3. **Clear visual distinction** - Opportunity zones use distinct color scheme (Green/Yellow/Red) vs. individual layer colors
4. **Professional analysis** - B2B users need to compare individual metrics with correlations
5. **Technical consistency** - Follows existing layer implementation pattern

---

### Question 4: What Colors Should Be Used for the 3 Opportunity Zones?

**Recommendation: Option A - Green (High), Yellow (Moderate), Red (Low)** ⭐ **RECOMMENDED**

**Selected:** ✅ **Option A** - Green (High), Yellow (Moderate), Red (Low)

#### Analysis of Both Options:

#### Option A: Green, Yellow, Red ⭐ **RECOMMENDED**

**Color Scheme:**
- 🟢 **High Opportunity:** Green (`#10B981` or `#22c55e`)
- 🟡 **Moderate Opportunity:** Yellow (`#eab308` or `#fbbf24`)
- 🔴 **Low Opportunity:** Red (`#ef4444` or `#dc2626`)

**Pros:**
- ✅ **Matches user specification** - Aligns with provided legend (🟢 High, 🟡 Moderate, 🔴 Low)
- ✅ **Universal semantics** - Traffic light system (Green = Go, Yellow = Caution, Red = Stop)
- ✅ **Clear hierarchy** - Green = best, Yellow = moderate, Red = avoid
- ✅ **Distinct from individual layers** - Individual layers use blue spectrum; opportunity zones use traffic light colors
- ✅ **Accessibility** - High contrast between colors
- ✅ **Industry standard** - Common in B2B analytics tools

**Cons:**
- ⚠️ Yellow may be less vibrant than orange (mitigated by using appropriate shade)

**B2B Impact:** **Positive** - Clear, intuitive color scheme that matches user expectations.

---

#### Option B: Green, Orange, Red

**Color Scheme:**
- 🟢 **High Opportunity:** Green
- 🟠 **Moderate Opportunity:** Orange
- 🔴 **Low Opportunity:** Red

**Pros:**
- ✅ Orange is more vibrant than yellow
- ✅ Still uses traffic light concept

**Cons:**
- ❌ **Doesn't match user specification** - User provided 🟡 (Yellow) in legend
- ❌ **Potential confusion** - Orange is used in individual layers for high growth (5-10%)
- ❌ **Less standard** - Yellow is more common for "moderate/caution" in traffic light systems
- ❌ **Visual similarity** - Orange may be confused with existing layer color scheme

**B2B Impact:** **Neutral to Negative** - Doesn't match user's specification and may cause confusion with existing color scheme.

---

### Final Recommendation for Question 4: **Option A (Green, Yellow, Red)**

**Key Reasoning:**
1. **User alignment** - Matches the exact legend provided (🟢 🟡 🔴)
2. **Universal semantics** - Traffic light system is universally understood
3. **Distinct from individual layers** - Individual layers use blue-to-red spectrum; opportunity zones use traffic light colors
4. **Clear hierarchy** - Green = High opportunity, Yellow = Moderate, Red = Low
5. **Accessibility** - High contrast, colorblind-friendly with proper patterns if needed

**Specific Color Recommendations:**
- **High Opportunity (Green):** `#10B981` (emerald-500) or `#22c55e` (green-500)
- **Moderate Opportunity (Yellow):** `#eab308` (yellow-500) or `#fbbf24` (amber-400)
- **Low Opportunity (Red):** `#ef4444` (red-500) or `#dc2626` (red-600)

**Visual Design Notes:**
- Use solid fill colors (not borders/patterns) for clarity
- Ensure sufficient opacity (0.65-0.7) for visibility without obscuring map details
- Add subtle white borders (stroke) for county boundaries
- Consider adding pattern overlay for colorblind accessibility (future enhancement)

---

## Updated Implementation Recommendations

### Visual Layer Implementation:

1. **Opportunity Zones Layer Component:**
   - Create `OpportunityZonesLayer.tsx` component
   - Similar structure to `PopulationLayer.tsx` and `GDPLayer.tsx`
   - Calculate opportunity tier for each county:
     - High: Both Population Change >5% AND Tourism Change >5%
     - Moderate: One >5% OR both positive (but not both >5%)
     - Low: Both negative OR one negative
   - Apply color scheme: Green (High), Yellow (Moderate), Red (Low)

2. **Layer Rendering Order:**
   ```
   Z-Index (bottom to top):
   1. Population Layer (if enabled)
   2. GDP Layer (if enabled)
   3. Opportunity Zones Layer (if enabled) - Highest priority
   ```

3. **Color Application:**
   - Use `overrideStyle` for each county feature
   - Apply opportunity zone colors when layer is enabled
   - Individual layers remain visible underneath (if enabled)
   - Opportunity zones layer takes visual precedence

4. **Toggle Behavior:**
   - Opportunity Zones toggle appears below GDP layer toggle
   - Disabled (grayed) when both Population and GDP layers not enabled
   - When enabled, shows opportunity zones with distinct color scheme
   - Individual layers can remain enabled for comparison

---

**Approved by:** CPO  
**Date:** January 2025
