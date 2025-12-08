# Map Filters & Overlays Recommendations
## Making /map the Industry's Best B2B Glamping Intelligence Platform

**Date:** January 2025  
**Purpose:** Comprehensive recommendations for filters and map overlays to create the most powerful B2B mapping tool in the glamping/hospitality industry

---

## Executive Summary

This document outlines recommended filters and map overlays to transform the `/map` page into the premier B2B intelligence platform for the glamping and outdoor hospitality industry. The recommendations are organized by priority, implementation complexity, and business value.

### Current State
**Existing Filters:**
- Country (United States, Canada)
- State/Province
- Unit Type
- Average Retail Rate Range

**Existing Overlays:**
- National Parks
- Population Change (2010-2020) ⚠️ *See "Data Recency Considerations" section*
- GDP by County

---

## 🎯 Top Priority Recommendations (Must-Have)

### Filters

#### 1. **Occupancy Rate Range** ⭐⭐⭐
**Type:** Range Slider / Multi-Select  
**Options:** 
- 0-25% (Low Occupancy)
- 26-50% (Below Average)
- 51-65% (Average)
- 66-80% (Strong)
- 81-95% (Very Strong)
- 96-100% (Peak)

**Business Value:** Critical for site selection. Investors need to identify markets with high demand (low vacancy) vs. underserved markets (opportunity for expansion).

**Data Availability:** ✅ `occupancy_rate_2024`, `occupancy_rate_2025`

**Implementation Complexity:** Low

---

#### 2. **RevPAR Range** ⭐⭐⭐
**Type:** Range Slider / Multi-Select  
**Options:** 
- Custom ranges based on data distribution (e.g., $0-50, $51-100, $101-150, $151-200, $201+)

**Business Value:** Revenue per available room/unit is THE key profitability metric. Essential for competitive analysis and market positioning.

**Data Availability:** ✅ `revpar_2024`, `revpar_2025`

**Implementation Complexity:** Low

---

#### 3. **Operating Season Duration** ⭐⭐
**Type:** Multi-Select  
**Options:**
- Year-Round (12 months)
- Extended Season (8-11 months)
- Seasonal (4-7 months)
- Limited Season (1-3 months)

**Business Value:** Critical for ROI calculations. Year-round operations generate 2-3x more revenue than seasonal properties.

**Data Availability:** ✅ `operating_season_months`

**Implementation Complexity:** Low

---

#### 4. **Property Size / Capacity** ⭐⭐
**Type:** Multi-Select  
**Options:**
- Boutique (1-10 units)
- Small (11-25 units)
- Medium (26-50 units)
- Large (51-100 units)
- Resort Scale (100+ units)

**Business Value:** Investors need to compare properties of similar scale. Different business models apply to different scales.

**Data Availability:** ✅ `quantity_of_units`, `unit_capacity`, `property_total_sites`

**Implementation Complexity:** Low-Medium

---

#### 5. **Amenities Filter (Multi-Select)** ⭐⭐
**Type:** Multi-Select Checkboxes  
**Categories:**
- **Essentials:** Toilet, Shower, Water, Trash
- **Comfort:** Wifi, Hot Tub/Sauna, Pool, Laundry
- **Outdoor:** Campfires, Picnic Table, Cooking Equipment
- **RV Support:** RV Parking, RV Vehicle Length Accommodations, Slideout Support
- **Family:** Playground, Pet-Friendly

**Business Value:** Helps identify competitive positioning and amenity gaps in markets. Critical for feasibility studies.

**Data Availability:** ✅ Multiple amenity fields available

**Implementation Complexity:** Medium

---

#### 6. **Year Opened / Age Filter** ⭐⭐
**Type:** Range Slider / Multi-Select  
**Options:**
- Pre-2010 (Established)
- 2010-2015 (Mature)
- 2016-2019 (Growth Period)
- 2020-2022 (Pandemic Era)
- 2023+ (Recent Entrants)

**Business Value:** New properties may indicate emerging markets. Older properties show established markets. Helps identify market maturity.

**Data Availability:** ✅ `year_site_opened`

**Implementation Complexity:** Low

---

### Overlays

#### 7. **Population Density Heatmap** ⭐⭐⭐
**Type:** Color-coded overlay (heatmap)  
**Visualization:** 
- Dark green: High density (urban/suburban)
- Light green: Medium density
- Yellow: Low density (rural)
- Transparent: Very low density

**Business Value:** Identifies proximity to customer bases. Critical for accessibility and demand forecasting.

**Data Availability:** ✅ County population data available

**Implementation Complexity:** Medium

**Enhancement:** Add toggle for different years (2010, 2020) to show trends

---

#### 8. **Competitive Density Heatmap** ⭐⭐⭐
**Type:** Heatmap showing property concentration  
**Visualization:**
- Red zones: High competition (many properties)
- Orange zones: Moderate competition
- Green zones: Low competition (opportunity)

**Business Value:** Identifies saturated markets vs. underserved markets. Essential for expansion planning.

**Data Availability:** ✅ Based on property locations

**Implementation Complexity:** Medium

---

#### 9. **Traffic / Tourism Volume Overlay** ⭐⭐⭐
**Type:** Color-coded regions  
**Data Sources:**
- National Park visitation data
- State tourism statistics
- Google Trends data integration

**Business Value:** Shows actual foot traffic and tourism demand. More reliable than population alone for hospitality.

**Data Availability:** ⚠️ Requires external data integration

**Implementation Complexity:** High

---

#### 10. **Median Income Overlay** ⭐⭐⭐
**Type:** Color-coded counties  
**Visualization:**
- Purple: Very high income ($100k+)
- Blue: High income ($75k-$100k)
- Green: Middle income ($50k-$75k)
- Yellow: Lower income ($35k-$50k)
- Red: Low income (<$35k)

**Business Value:** Pricing strategy validation. High-income areas can command premium rates. Identifies premium market opportunities.

**Data Availability:** ⚠️ Requires Census Bureau API integration

**Implementation Complexity:** Medium-High

---

## 🚀 High-Value Recommendations (Should-Have)

### Filters

#### 11. **Seasonal Rate Variance Filter** ⭐
**Type:** Range Slider  
**Metric:** (Peak Rate / Low Rate) ratio

**Business Value:** Properties with high seasonal variance (e.g., 3:1 ratio) indicate strong peak demand. Useful for identifying high-demand destinations.

**Data Availability:** ✅ Can calculate from `winter_weekday`, `summer_weekday`, etc.

**Implementation Complexity:** Medium

---

#### 12. **Property Type Filter** ⭐
**Type:** Multi-Select  
**Options:**
- Glamping Resort
- Luxury Campground
- RV Resort
- Mixed-Use Property
- Boutique Property

**Business Value:** Different business models and competitive sets.

**Data Availability:** ✅ `property_type`

**Implementation Complexity:** Low

---

#### 13. **Pricing Premium Indicator** ⭐
**Type:** Toggle / Multi-Select  
**Metric:** Properties priced above/below regional average

**Business Value:** Identifies premium positioning vs. value positioning in markets.

**Data Availability:** ⚠️ Requires calculation against regional averages

**Implementation Complexity:** Medium

---

#### 14. **Business Status Filter** ⭐
**Type:** Multi-Select  
**Options:**
- Operational
- Temporarily Closed
- Permanently Closed

**Business Value:** Essential for data quality and identifying closures/market exits.

**Data Availability:** ✅ `google_business_status`

**Implementation Complexity:** Low

---

#### 15. **Review Score Filter** ⭐
**Type:** Range Slider (0-5 stars)

**Business Value:** Quality indicator. Properties with 4.5+ stars are likely well-managed and successful.

**Data Availability:** ✅ Google Places rating data

**Implementation Complexity:** Low

---

### Overlays

#### 16. **Airport Proximity Zones** ⭐⭐
**Type:** Buffered circles around airports  
**Visualization:**
- 30-mile radius (light gray)
- 60-mile radius (darker gray)
- 90-mile radius (darkest gray)

**Business Value:** Accessibility is crucial for glamping. Properties near airports have higher accessibility scores.

**Data Availability:** ⚠️ Requires airport location data

**Implementation Complexity:** Medium

---

#### 17. **Highway / Major Road Proximity** ⭐⭐
**Type:** Buffered lines along major highways

**Business Value:** Drive-in accessibility is critical for most glamping properties.

**Data Availability:** ⚠️ Requires highway GIS data

**Implementation Complexity:** High

---

#### 18. **Climate Zones Overlay** ⭐
**Type:** Color-coded regions

**Business Value:** Identifies year-round operating potential vs. seasonal limitations.

**Data Availability:** ⚠️ Requires climate data

**Implementation Complexity:** Medium

---

#### 19. **Natural Disaster Risk Overlay** ⭐
**Type:** Color-coded risk zones  
**Categories:**
- Wildfire risk
- Flood risk
- Hurricane/tornado risk

**Business Value:** Insurance and risk assessment for investors.

**Data Availability:** ⚠️ Requires FEMA/Firewise data

**Implementation Complexity:** High

---

#### 20. **Zoning / Land Use Overlay** ⭐
**Type:** Color-coded polygons

**Business Value:** Identifies where new development is possible/restricted.

**Data Availability:** ⚠️ Requires municipal GIS data (varies by location)

**Implementation Complexity:** Very High

---

## 💡 Innovative / Differentiating Recommendations

### Filters

#### 21. **Growth Trend Filter** 💡
**Type:** Multi-Select  
**Options:**
- Declining (Occupancy/RevPAR decreasing YoY)
- Stable (Minimal change)
- Growing (Occupancy/RevPAR increasing YoY)
- Rapid Growth (>20% increase YoY)

**Business Value:** Identifies emerging markets and trending destinations.

**Data Availability:** ✅ Can calculate from 2024 vs. 2025 data

**Implementation Complexity:** Medium

---

#### 22. **Weekend Premium Filter** 💡
**Type:** Range Slider  
**Metric:** (Weekend Rate / Weekday Rate) ratio

**Business Value:** High weekend premiums indicate leisure destinations. Low premiums indicate business/extended-stay markets.

**Data Availability:** ✅ Available in seasonal rate fields

**Implementation Complexity:** Low-Medium

---

#### 23. **Capacity Utilization Filter** 💡
**Type:** Range Slider  
**Metric:** (Actual Occupancy / Theoretical Max Occupancy)

**Business Value:** Identifies properties operating at capacity vs. those with expansion potential.

**Data Availability:** ⚠️ Requires calculation from occupancy and capacity data

**Implementation Complexity:** Medium

---

### Overlays

#### 24. **Market Saturation Index** 💡
**Type:** Color-coded heatmap  
**Metric:** (Properties per 100k population) or (Properties per square mile)

**Business Value:** Quantifies market saturation. Low saturation = opportunity.

**Data Availability:** ✅ Can calculate from property and population data

**Implementation Complexity:** Medium

---

#### 25. **Average Rate by Region Heatmap** 💡
**Type:** Color-coded regions  
**Visualization:**
- Shows average nightly rate by county/region
- Red = High rates, Blue = Low rates

**Business Value:** Identifies premium markets vs. value markets at a glance.

**Data Availability:** ✅ Can calculate from property rate data

**Implementation Complexity:** Medium

---

#### 26. **Occupancy Heatmap by Season** 💡
**Type:** Time-series overlay  
**Options:**
- Winter occupancy heatmap
- Spring occupancy heatmap
- Summer occupancy heatmap
- Fall occupancy heatmap

**Business Value:** Shows seasonal demand patterns. Identifies year-round markets vs. peak-season markets.

**Data Availability:** ⚠️ Would need seasonal occupancy data (may need to estimate)

**Implementation Complexity:** High

---

#### 27. **Market Maturity Overlay** 💡
**Type:** Color-coded regions  
**Categories:**
- Emerging (First properties opened in last 3 years)
- Growth (Active development, multiple recent openings)
- Mature (Established market, stable)
- Declining (Closures > Openings)

**Business Value:** Identifies lifecycle stage of markets.

**Data Availability:** ✅ Can calculate from `year_site_opened` and closure data

**Implementation Complexity:** Medium

---

#### 28. **Google Trends Overlay** 💡
**Type:** Color-coded regions  
**Data Source:** Google Trends API for "glamping" searches by location

**Business Value:** Shows search interest (demand indicator) vs. supply (properties). High search/low supply = opportunity.

**Data Availability:** ⚠️ Requires Google Trends API integration

**Implementation Complexity:** High

---

## 🎨 UX Enhancements

### Advanced Filter Combinations

#### 29. **Saved Filter Sets** 💡
Allow users to save and name filter combinations (e.g., "High-End Year-Round Markets", "Budget Seasonal Opportunities")

**Business Value:** Power users can quickly switch between common analysis scenarios.

---

#### 30. **Compare Mode** 💡
Allow users to select 2-3 properties and compare side-by-side:
- Pricing
- Occupancy
- Amenities
- Location advantages

**Business Value:** Direct competitive analysis tool.

---

#### 31. **Export Filtered Results** 💡
Export visible properties to CSV/Excel with all data fields.

**Business Value:** Enables further analysis in Excel/BI tools.

---

### Map Interaction Enhancements

#### 32. **Driving Radius Tool** 💡
Allow users to click on a property and see:
- How many other properties are within X miles
- What % of population is within X miles
- Accessibility metrics

**Business Value:** Site selection and competitive analysis.

---

#### 33. **Custom Area Analysis** 💡
Allow users to draw a polygon on the map and get:
- Property count
- Average rates
- Average occupancy
- Market summary statistics

**Business Value:** Custom market analysis for specific regions.

---

## ⚠️ Data Recency Considerations

### Population Change Layer (2010-2020)

**Question:** Should we keep the 2010-2020 population growth overlay in 2025?

**Recommendation: KEEP, but with improvements:**

#### ✅ Reasons to Keep:

1. **Historical Context Value:** 
   - 10-year trends (2010-2020) show **long-term demographic shifts** that are still relevant
   - Population growth patterns tend to persist - counties that grew 2010-2020 likely continued growing
   - Investors value understanding **foundational trends**, not just latest numbers

2. **Most Recent Decennial Census:**
   - The 2010-2020 data is from the official decennial census (most accurate)
   - Next decennial census is **2030** - this is the best official data available
   - Annual estimates exist but are less accurate for small areas

3. **Still Relevant for B2B:**
   - Long-term trends are more valuable than year-to-year fluctuations for investment decisions
   - Shows structural shifts (urbanization, migration patterns) that affect hospitality demand
   - 5 years isn't that old for demographic trends (population doesn't change dramatically in 5 years)

#### 🔄 Recommended Improvements:

1. **Clear Labeling:**
   - Rename to: **"Historical Population Growth (2010-2020)"**
   - Add subtitle: "Shows long-term demographic trends (most recent official decennial census)"
   - Make date range prominent in UI

2. **Add Recent Estimates Layer (Optional):**
   - Add new layer: **"Recent Population Growth (2020-2024)"** using Census Bureau estimates
   - Label it as "Estimates" to distinguish from official census data
   - Source: Census Bureau Population Estimates Program (PEP) - July 2024 estimates available
   - This provides: Best of both worlds - historical trends + recent data

3. **Combined View Option:**
   - Allow users to toggle between:
     - "Historical Trends (2010-2020)" - Official census, long-term view
     - "Recent Growth (2020-2024)" - Estimates, current trends
     - "Comparison Mode" - Show both side-by-side

4. **Add Context Note:**
   ```
   "Population data shows long-term demographic trends from the official 2020 
   Decennial Census. Next official census: 2030. Annual estimates available 
   separately for recent trends."
   ```

#### 📊 Implementation Priority:

- **Phase 1 (Quick):** Update labeling to clarify it's historical/trend data
- **Phase 2 (Medium):** Add 2020-2024 estimates layer using Census Bureau PEP data
- **Phase 3 (Advanced):** Comparison mode showing both time periods

#### 🎯 Bottom Line:

**KEEP the 2010-2020 layer** - it's still valuable for understanding long-term trends. But improve clarity that it's historical data, and consider adding a 2020-2024 estimates layer for users who want more recent data.

**Alternative Approach:** Keep both, positioned as:
- "Long-Term Trends (2010-2020)" - Official census, foundational demographics
- "Recent Growth (2020-2024)" - Estimates, current direction

---

## 📊 Priority Ranking Summary

### Phase 1 (Quick Wins - 1-2 weeks)
1. ✅ Occupancy Rate Range Filter
2. ✅ RevPAR Range Filter
3. ✅ Operating Season Duration Filter
4. ✅ Property Size/Capacity Filter
5. ✅ Business Status Filter
6. ✅ Review Score Filter

### Phase 2 (Medium Complexity - 2-4 weeks)
7. ✅ Amenities Multi-Select Filter
8. ✅ Population Density Heatmap
9. ✅ Competitive Density Heatmap
10. ✅ Median Income Overlay (if data available)
11. ✅ Year Opened Filter
12. ✅ Growth Trend Filter

### Phase 3 (Higher Value - 1-2 months)
13. ✅ Airport Proximity Zones
14. ✅ Average Rate by Region Heatmap
15. ✅ Market Saturation Index
16. ✅ Weekend Premium Filter
17. ✅ Saved Filter Sets
18. ✅ Export Functionality

### Phase 4 (Advanced Features - 2-3 months)
19. ⚠️ Traffic/Tourism Volume Overlay (requires data partnerships)
20. ⚠️ Google Trends Overlay (requires API integration)
21. ⚠️ Highway Proximity (requires GIS data)
22. ✅ Compare Mode
23. ✅ Driving Radius Tool
24. ✅ Custom Area Analysis

---

## 🏆 Top 10 Recommendations (The "Best Ones")

Based on business value, data availability, and differentiation potential:

1. **RevPAR Range Filter** - Critical profitability metric
2. **Occupancy Rate Range Filter** - Essential demand indicator
3. **Competitive Density Heatmap** - Unique market intelligence
4. **Population Density Heatmap** - Foundation for market analysis
5. **Median Income Overlay** - Pricing strategy validation
6. **Market Saturation Index Overlay** - Quantified opportunity identification
7. **Amenities Multi-Select Filter** - Competitive positioning tool
8. **Growth Trend Filter** - Identifies emerging markets
9. **Average Rate by Region Heatmap** - Quick market positioning overview
10. **Saved Filter Sets + Export** - Power user productivity features

---

## 📈 Success Metrics

Track these metrics to measure success:

1. **User Engagement:**
   - Average filters applied per session
   - Overlays toggled per session
   - Session duration

2. **Business Value:**
   - Properties exported/downloaded
   - Saved filter sets created
   - Return user rate

3. **Competitive Differentiation:**
   - User feedback on uniqueness
   - Feature adoption rate
   - Comparison to competitor tools

---

## 🔧 Technical Considerations

### Data Requirements
- Some overlays require external data sources (Census API, Google Trends, FEMA, etc.)
- Consider data refresh cadence (daily, weekly, monthly)
- Cache overlay calculations for performance

### Performance
- Heatmaps can be computationally expensive
- Consider pre-calculating overlays server-side
- Use progressive rendering for large datasets
- Implement overlay opacity controls

### UX/UI
- Organize filters into logical groups (Location, Property, Financial, Amenities)
- Use collapsible sections to reduce visual clutter
- Add tooltips explaining what each filter/overlay shows
- Include "Reset Filters" button prominently
- Show active filter count badge

---

## 📚 Industry Benchmarking

Competitors to study:
- **AirDNA** - Short-term rental analytics
- **STR (Smith Travel Research)** - Hotel industry intelligence
- **Costar** - Commercial real estate intelligence
- **Yardi** - Property management analytics
- **CBRE Hotels** - Hospitality investment analytics

**Differentiation Opportunities:**
- Glamping-specific metrics (amenities, unit types)
- Outdoor hospitality focus
- B2B-first design (vs. consumer-facing)
- Integration of economic/tourism data
- Real-time data updates

---

## Next Steps

1. **Prioritize:** Review recommendations with stakeholders and rank by business value
2. **Prototype:** Build Phase 1 features as MVP
3. **Test:** User testing with target B2B users (investors, developers, operators)
4. **Iterate:** Based on feedback, refine and expand
5. **Market:** Position as "Industry's Most Comprehensive B2B Glamping Intelligence Platform"

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** AI Assistant  
**Review Status:** Pending Stakeholder Review