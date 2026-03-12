# GDP Map Layer Recommendations
## For Outdoor Industry Professionals, Developers, Investors, and Operators

**Date:** January 2025  
**Purpose:** Recommendations for visualizing GDP (Accommodations, Food Services, Arts, Entertainment, Recreation) data on the map to provide maximum value for B2B users

---

## Executive Summary

The GDP data for Accommodations, Food Services, Arts, Entertainment, and Recreation provides critical market intelligence for site selection, investment decisions, and competitive analysis. This document outlines the most valuable visualizations and metrics to display in a map layer.

---

## 🎯 Top Priority Visualizations (Must-Have)

### 1. **Moving Annual Average Growth Rate** ⭐⭐⭐
**What to Show:** The `moving-annual-average` column (average year-over-year % change 2001-2023)

**Why It's Valuable:**
- **Investors:** Identifies markets with consistent, sustainable growth vs. volatile markets
- **Developers:** Shows long-term market health and stability
- **Operators:** Reveals markets with steady demand growth
- **Outdoor Industry:** Highlights regions with sustained tourism/recreation growth

**Visualization:**
- **Color Scale:** Similar to population change layer
  - Dark Blue: < -5% (declining markets - avoid or high risk)
  - Light Blue: -5% to 0% (stagnant markets)
  - Green: 0% to 5% (stable growth)
  - Yellow: 5% to 10% (strong growth)
  - Orange: 10% to 15% (very strong growth)
  - Red: > 15% (exceptional growth - high opportunity)

**Interactive Features:**
- Click county to show:
  - Moving annual average: X%
  - Years of data: 2001-2023
  - Number of year-over-year changes calculated

**Business Value:** This is the **single most important metric** because it shows long-term market trajectory, not just recent fluctuations.

---

### 2. **Recent Growth Momentum (2022-2023)** ⭐⭐⭐
**What to Show:** Year-over-year change from 2022 to 2023

**Why It's Valuable:**
- **Investors:** Identifies markets with current positive momentum
- **Developers:** Shows which markets are actively growing right now
- **Operators:** Reveals emerging opportunities vs. declining markets
- **Outdoor Industry:** Highlights post-pandemic recovery patterns

**Visualization:**
- Same color scale as Moving Annual Average
- Can be toggled as alternative view mode

**Interactive Features:**
- Click county to show:
  - 2022 GDP: $X million
  - 2023 GDP: $Y million
  - Change: +Z% or -Z%
  - Dollar change: $X million

**Business Value:** Complements long-term average by showing current market direction. Markets with high recent growth but low long-term average may indicate emerging opportunities.

---

### 3. **Market Size (2023 GDP)** ⭐⭐
**What to Show:** Absolute GDP value for 2023 (current market size)

**Why It's Valuable:**
- **Investors:** Identifies large addressable markets
- **Developers:** Shows market capacity and competition level
- **Operators:** Reveals market saturation vs. opportunity
- **Outdoor Industry:** Highlights major tourism/recreation hubs

**Visualization:**
- **Color Scale:** Sequential (light to dark)
  - Light Green: < $10M (small markets)
  - Medium Green: $10M - $50M (medium markets)
  - Dark Green: $50M - $100M (large markets)
  - Darker Green: $100M - $250M (very large markets)
  - Darkest Green: > $250M (major markets)

**Interactive Features:**
- Click county to show:
  - 2023 GDP: $X million
  - Market rank: #X in state / #Y nationally
  - Comparison to state average

**Business Value:** Large markets may have more competition but also more opportunity. Small markets may be underserved.

---

## 🚀 High-Value Visualizations (Should-Have)

### 4. **Growth Acceleration Indicator** ⭐⭐
**What to Show:** Compare recent growth (2020-2023 average) vs. long-term average (2001-2023)

**Why It's Valuable:**
- **Investors:** Identifies markets that are accelerating (good investment) vs. slowing (caution)
- **Developers:** Shows emerging vs. mature markets
- **Operators:** Reveals markets with increasing vs. decreasing momentum

**Visualization:**
- **Color Scale:**
  - Red: Recent growth > Long-term average by >5% (accelerating)
  - Orange: Recent growth > Long-term average by 2-5% (moderate acceleration)
  - Yellow: Recent growth ≈ Long-term average (stable)
  - Light Blue: Recent growth < Long-term average by 2-5% (slowing)
  - Dark Blue: Recent growth < Long-term average by >5% (declining)

**Business Value:** Helps identify markets that are gaining momentum vs. losing steam.

---

### 5. **Post-Pandemic Recovery (2019 vs. 2023)** ⭐⭐
**What to Show:** Percentage change from 2019 (pre-pandemic) to 2023

**Why It's Valuable:**
- **Investors:** Shows which markets have fully recovered vs. still struggling
- **Developers:** Identifies markets that bounced back strongly
- **Operators:** Reveals resilience and recovery patterns
- **Outdoor Industry:** Highlights markets that thrived during/after pandemic

**Visualization:**
- Same color scale as Moving Annual Average
- Special indicator for markets that exceeded 2019 levels

**Interactive Features:**
- Click county to show:
  - 2019 GDP: $X million
  - 2023 GDP: $Y million
  - Recovery: +Z% (or -Z% if still below 2019)
  - Recovery status: "Exceeded 2019" / "Recovered" / "Still Recovering" / "Below 2019"

**Business Value:** Markets that exceeded 2019 levels may have structural advantages or new demand patterns.

---

### 6. **Market Stability Score** ⭐
**What to Show:** Coefficient of variation (standard deviation / mean) of year-over-year changes

**Why It's Valuable:**
- **Investors:** Identifies stable markets (lower risk) vs. volatile markets (higher risk/reward)
- **Developers:** Shows predictable vs. unpredictable markets
- **Operators:** Reveals markets with consistent demand vs. boom/bust cycles

**Visualization:**
- **Color Scale:**
  - Dark Green: Low volatility (< 10% CV) - Stable markets
  - Light Green: Medium volatility (10-20% CV) - Moderate stability
  - Yellow: High volatility (20-30% CV) - Unstable markets
  - Red: Very high volatility (> 30% CV) - Highly volatile markets

**Business Value:** Some investors prefer stable, predictable markets. Others seek high-growth volatile markets.

---

## 📊 Recommended Layer Toggle Options

### Primary View Modes:
1. **Long-Term Growth** (Moving Annual Average) - Default view
2. **Recent Momentum** (2022-2023 change)
3. **Market Size** (2023 GDP absolute value)

### Secondary View Modes:
4. **Growth Acceleration** (Recent vs. Long-term)
5. **Recovery Status** (2019 vs. 2023)
6. **Market Stability** (Volatility score)

---

## 🎨 Color Scheme Recommendations

### For Growth Rates (Moving Average, Recent Growth, Recovery):
```
Declining:    Dark Blue (#1e3a8a)  < -5%
Stagnant:     Light Blue (#93c5fd) -5% to 0%
Stable:       Green (#10b981)      0% to 5%
Strong:       Yellow (#eab308)      5% to 10%
Very Strong:  Orange (#f97316)     10% to 15%
Exceptional:  Red (#ef4444)         > 15%
```

### For Market Size (Absolute GDP):
```
Small:        Light Green (#86efac)    < $10M
Medium:       Green (#4ade80)          $10M - $50M
Large:        Dark Green (#22c55e)     $50M - $100M
Very Large:   Darker Green (#16a34a)   $100M - $250M
Major:        Darkest Green (#15803d)  > $250M
```

---

## 💡 Interactive Features to Add Value

### 1. **County Info Window on Click:**
```
County: [Name], [State]
─────────────────────────
2023 GDP: $X.X million
Market Rank: #X in [State]

Growth Metrics:
• Long-term Average: +X.X% (2001-2023)
• Recent Growth: +X.X% (2022-2023)
• Recovery: +X.X% vs. 2019

Market Characteristics:
• Stability: [Low/Medium/High] Volatility
• Trend: [Accelerating/Stable/Declining]
```

### 2. **Comparison Tool:**
- Allow users to select multiple counties
- Show side-by-side comparison of:
  - GDP values
  - Growth rates
  - Market size
  - Stability scores

### 3. **Filter Integration:**
- Filter properties by counties with:
  - High growth rates (> 10% moving average)
  - Large market size (> $100M)
  - Strong recovery (> 20% vs. 2019)
  - Low volatility (stable markets)

### 4. **Time Slider (Future Enhancement):**
- Animate GDP growth over time (2001-2023)
- Show how markets evolved year-by-year
- Identify inflection points (when growth accelerated/decelerated)

---

## 🎯 Use Cases by Audience

### For Investors:
**Primary Focus:** Moving Annual Average + Market Size
- Identify large, consistently growing markets
- Avoid volatile or declining markets
- Compare investment opportunities across regions

### For Developers:
**Primary Focus:** Recent Growth + Market Size
- Find markets with current momentum
- Identify underserved large markets
- Compare development opportunities

### For Operators:
**Primary Focus:** Recovery Status + Market Stability
- Identify markets that recovered strongly
- Find stable, predictable markets
- Avoid volatile or declining markets

### For Outdoor Industry Professionals:
**Primary Focus:** Moving Annual Average + Recovery Status
- Identify long-term tourism/recreation growth trends
- Find markets that thrived post-pandemic
- Understand regional demand patterns

---

## 📈 Data Insights to Highlight

### Key Statistics to Display:
1. **National Average:** Show average moving annual growth rate across all counties
2. **State Comparison:** Show how selected county compares to state average
3. **Percentile Rank:** "This county is in the top X% for growth"
4. **Trend Indicators:** 
   - ↗️ Accelerating
   - → Stable
   - ↘️ Declining

---

## 🔄 Implementation Priority

### Phase 1 (MVP):
1. ✅ Moving Annual Average layer (already calculated)
2. ✅ Recent Growth (2022-2023) layer
3. ✅ Basic info window on click

### Phase 2 (Enhanced):
4. Market Size layer
5. Recovery Status layer
6. Enhanced info window with all metrics

### Phase 3 (Advanced):
7. Growth Acceleration indicator
8. Market Stability score
9. Comparison tool
10. Filter integration

---

## 🎨 Visual Design Recommendations

### Layer Toggle UI:
- Similar to existing Population Layer toggle
- Add dropdown to select view mode:
  - "Long-Term Growth (2001-2023)"
  - "Recent Growth (2022-2023)"
  - "Market Size (2023)"
  - "Recovery Status (2019 vs. 2023)"

### Legend:
- Match style of Population Layer legend
- Show color ranges with labels
- Include data source attribution
- Add "Last updated" timestamp

### Performance:
- Load GDP data from Supabase on layer enable (similar to Population Layer)
- Cache data in component state
- Use same GeoJSON county boundaries
- Match FIPS codes between GDP data and GeoJSON

---

## 📝 Technical Notes

### Data Structure:
- Table: `county-gdp`
- Key columns:
  - `geofips` (matches GeoJSON FIPS codes)
  - `geoname`
  - `gdp_2001` through `gdp_2023`
  - `moving-annual-average` (already calculated)

### Matching Logic:
- Use `geofips` to match GDP data to GeoJSON features
- Handle missing data gracefully (show gray, indicate "No data")

### Calculations Needed:
1. **Recent Growth (2022-2023):** `((gdp_2023 - gdp_2022) / gdp_2022) * 100`
2. **Recovery (2019 vs. 2023):** `((gdp_2023 - gdp_2019) / gdp_2019) * 100`
3. **Recent Average (2020-2023):** Average of 2020→2021, 2021→2022, 2022→2023 changes
4. **Stability Score:** Standard deviation of all YoY changes / Mean of all YoY changes

---

## ✅ Summary

**Most Valuable Single Metric:** Moving Annual Average
- Shows long-term market health
- Most reliable indicator for investment decisions
- Already calculated and ready to use

**Best Combination:** Moving Annual Average + Recent Growth + Market Size
- Long-term trend + current momentum + market opportunity
- Provides comprehensive market intelligence

**Key Differentiator:** The moving annual average is unique - it shows sustained growth patterns that single-year changes can't reveal. This is the metric that will provide the most value to your B2B users.
