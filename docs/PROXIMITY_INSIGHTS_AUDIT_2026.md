# Proximity Insights Audit

**Page:** `/admin/proximity-insights`  
**API:** `GET /api/admin/anchor-point-insights`  
**Audit Date:** March 2026

---

## Executive Summary

Proximity Insights compares glamping/camping properties (Hipcamp + Sage Glamping) against anchor points (ski resorts or national parks). It provides distance-band analytics, seasonal rates, occupancy, YoY trends, and state-level population/GDP context. The feature has been significantly improved since the last audit (map, export, compare mode, custom range, Total Units). This audit identifies remaining issues, inconsistencies, data accuracy concerns, and recommended future enhancements.

---

## 1. Issues & Bugs

### 1.1 Export Disabled in Compare Mode
- **Location:** `app/admin/proximity-insights/page.tsx` – Export button and menu
- **Issue:** Export button is `disabled={!data}`. In compare mode, `data` is null and `compareData` is used; the export button is disabled entirely.
- **Impact:** Users cannot export property sample or by-state table when comparing two anchors.
- **Recommendation:** Enable export in compare mode; use `leftData` (or let user choose) for property sample/by-state export. Full dataset export should work with both anchors.

### 1.2 Route Naming Inconsistency
- **Issue:** Page is at `/admin/proximity-insights` but API is `/api/admin/anchor-point-insights`. Sidebar and docs reference "Proximity Insights" while API uses "anchor-point-insights".
- **Recommendation:** Consider aligning API route to `/api/admin/proximity-insights` for consistency, or document the split clearly.

### 1.3 Avg Winter Rate Tooltip Uses `total_properties` Not `total_units`
- **Location:** StatCard tooltip for Avg Winter Rate
- **Issue:** Tooltip says "Based on {withRates} of {total} properties with winter rates". The first metric is now Total Units, but the tooltip still uses property count. Semantically correct (we're talking about properties with rates), but the primary metric and tooltip are now different units (units vs properties).
- **Recommendation:** Consider adding a tooltip to Total Units: "Sum of quantity_of_units across all properties within filter." Or clarify in tooltip: "X properties have winter rates (of Y total properties)."

### 1.4 "Within X mi" Metric Counts Properties, Not Units
- **Location:** Summary stat "Within 50 mi of Parks"
- **Issue:** The value is `properties_within_30_mi` (count of properties). With Total Units as the primary metric, users might expect "Within X mi" to also show units for consistency.
- **Recommendation:** Either add `units_within_X_mi` to summary and show both, or add a tooltip clarifying: "Number of properties within X mi."

### 1.5 `anchors_with_property_counts` Uses Property Count, Not Units
- **Location:** "Ski Resorts with Properties Within 15 mi" table
- **Issue:** `property_count_15_mi` counts properties, not units. Inconsistent with Total Units as primary metric.
- **Recommendation:** Consider adding `units_count_15_mi` or renaming to clarify "Property count."

### 1.6 Band Chart Tooltip Uses "properties"
- **Location:** `bandTooltipProperties` – "X properties"
- **Issue:** Band charts show `count` (property count). With Total Units as primary metric, consider whether band counts should be units or properties. Currently properties.
- **Recommendation:** Document the decision; consider adding units count per band if desired.

### 1.7 State Metrics Table Uses `count` (Properties)
- **Location:** "State Metrics" table – "Properties" column
- **Issue:** Shows property count per state. Consistent with current label, but could add units column for richer analysis.
- **Recommendation:** Optional: add "Units" column summing `quantity_of_units` (or `property_total_sites`) per state.

---

## 2. Data Accuracy & Consistency

### 2.1 County vs State Enrichment
- **Issue:** Population and GDP come from county tables but are aggregated to state level. Properties are matched by state. A property in a small county gets full state population/GDP.
- **Recommendation:** Consider reverse-geocoding to county for more accurate market context (future enhancement).

### 2.2 Deduplication by Coords Only
- **Location:** `deduplicateByCoords` – rounds lat/lon to 4 decimal places (~11m)
- **Issue:** Same physical property in Hipcamp and Sage may appear as one (if coords match) or two (if slightly different). No deduplication by name or external ID.
- **Recommendation:** Document the decision. Consider name+state fuzzy match for cross-source deduplication.

### 2.3 Sage Glamping Occupancy: Single Value for All Years
- **Location:** `fetch-properties.ts` – `occupancy_2024`, `occupancy_2025`, `occupancy_2026` all use `roverpass_occupancy_rate`
- **Issue:** Sage has one occupancy field; it's used for all three years. YoY occupancy trends are not meaningful for Sage.
- **Recommendation:** Add tooltip or note: "Occupancy by source: Hipcamp has year-specific data; Sage uses a single rate."

### 2.4 Hipcamp `avg_rate_2026` Is Null
- **Location:** `fetch-properties.ts` – Hipcamp `avg_rate_2026: null`
- **Issue:** Trends chart only uses 2024 and 2025. No 2026 data from Hipcamp.
- **Recommendation:** If `retail_daily_rate_ytd` or similar exists, consider using it with a "(YTD)" label.

### 2.5 `quantity_of_units` Fallback to 1
- **Location:** `buildSummary` – `total_units` uses `quantity_of_units ?? property_total_sites ?? 1`
- **Issue:** When both are null, we assume 1 unit. This may inflate totals if many properties lack the field.
- **Recommendation:** Consider excluding nulls from totals and showing "X units (Y properties without unit data)" or backfill in source tables.

---

## 3. UX & Accessibility

### 3.1 Compare Mode: Export Uses `data` Only
- **Issue:** As noted in 1.1, export is disabled when `compareData` is set. Users cannot export in compare mode.
- **Recommendation:** Fix export to support compare mode (use left column, right column, or both).

### 3.2 No Loading Progress for Full Export
- **Issue:** "Exporting full dataset..." shows a spinner but no progress (e.g., "Page 3 of 5").
- **Recommendation:** Add progress indicator for multi-page export.

### 3.3 Map Anchor Click Does Nothing
- **Location:** `AnchorPointMap` – `onAnchorClick={() => {}}`
- **Issue:** Clicking an anchor on the map has no effect. Could drill down to that anchor's view.
- **Recommendation:** Wire `onAnchorClick` to set anchor filter and reload.

### 3.4 No "Clear Filters" Action
- **Issue:** Users must reset each filter (state, anchor, type, custom range) individually.
- **Recommendation:** Add "Reset all filters" button.

### 3.5 Hardcoded "Apply" in Custom Range
- **Location:** Custom Range Apply button
- **Issue:** Button text "Apply" is hardcoded; other strings use i18n.
- **Recommendation:** Add `apply` to `anchorPointInsights` messages.

### 3.6 Chart Accessibility
- **Issue:** Recharts may not expose full ARIA labels. `role="img"` and `aria-label` are present on some charts.
- **Recommendation:** Audit Recharts accessibility; consider `aria-hidden` for decorative elements and ensure keyboard navigation where possible.

---

## 4. Performance & Scalability

### 4.1 In-Memory Distance Computation
- **Issue:** O(properties × anchors) Haversine calculations. With 50k properties and 60+ anchors, ~3M calculations per request.
- **Recommendation:** PostGIS `ST_DWithin` or precomputed property–anchor distances for scale.

### 4.2 County Tables Pagination
- **Status:** Fixed – pagination added in `fetch-county-data.ts` to fetch all rows.
- **Note:** FIPS-based state extraction fallback also added for robustness.

### 4.3 Caching
- **Status:** Redis caching with 5-minute TTL is in place. Cache key includes anchor type, state, anchor id/slug, bands, and type filter.
- **Recommendation:** Consider longer TTL for anchors and county lookups (they change rarely).

---

## 5. Code Quality

### 5.1 Page Component Size
- **Issue:** `page.tsx` is ~1,300+ lines. Monolithic.
- **Recommendation:** Extract sections into subcomponents: `ProximityFilters`, `ProximitySummaryCards`, `ProximityCharts`, `ProximityTables`, `ProximityMap`.

### 5.2 Duplicated Column Logic in Compare Mode
- **Issue:** `columns.map` renders the same structure for each column; some logic is repeated.
- **Recommendation:** Extract `ProximityColumn` component that receives `colData`.

### 5.3 Magic Numbers
- **Issue:** `MAX_STATE_ROWS = 10` in page; `MAX_STATE_ROWS = 15` in constants. Inconsistent.
- **Recommendation:** Use single source from constants.

---

## 6. Improvements (Quick Wins)

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Fix export in compare mode | Low |
| P2 | Add "Apply" to i18n | Trivial |
| P2 | Add tooltip to Total Units | Trivial |
| P2 | Add "Reset all filters" button | Low |
| P2 | Add "Units" column to State Metrics table | Medium |
| P3 | Fix `MAX_STATE_ROWS` inconsistency | Trivial |
| P3 | Wire map anchor click to drill-down | Low |

---

## 7. Future Features

### 7.1 Map Anchor Drill-Down
- **Description:** Click anchor on map → filter to that anchor, reload view.
- **Value:** High – improves exploration.

### 7.2 Units Consistency Across Metrics
- **Description:** Add `units_within_X_mi`, `units_by_source`, `units_by_band` for full units-based analytics.
- **Value:** Medium – aligns with Total Units as primary metric.

### 7.3 County-Level Population/GDP
- **Description:** Reverse-geocode properties to county; enrich with county population/GDP instead of state.
- **Value:** High for accuracy.

### 7.4 Time Range Filter for Trends
- **Description:** Let users select years (e.g., 2022–2026) for YoY trend.
- **Value:** Medium.

### 7.5 Scheduled Reports / Alerts
- **Description:** Email or Slack when key metrics change (e.g., new properties within 30 mi of Yellowstone).
- **Value:** Medium for ops.

### 7.6 Anchor-Specific Deep Link
- **Description:** Shareable URL for a specific anchor (e.g., `/admin/proximity-insights?anchor_type=national-parks&anchor_slug=yellowstone`).
- **Value:** Medium – already partially supported via URL params.

### 7.7 Canadian Province Support
- **Location:** `US_STATE_OPTIONS` filters out Canadian provinces.
- **Description:** Add Canadian provinces if anchor/property data includes Canada.
- **Value:** Depends on data.

### 7.8 Occupancy by Season
- **Description:** Show occupancy by season (winter, spring, etc.) if data exists.
- **Value:** Low–Medium.

### 7.9 New Anchor Types
- **Description:** Beaches, lakes, theme parks if tables exist.
- **Value:** Depends on data.

### 7.10 Export Progress Indicator
- **Description:** Show "Exporting page X of Y" during full export.
- **Value:** Low.

---

## 8. Priority Matrix

| Priority | Category | Item |
|----------|----------|------|
| P0 | Bug | Export disabled in compare mode |
| P1 | UX | Map anchor click drill-down |
| P1 | UX | Reset all filters |
| P2 | Consistency | Units vs properties across metrics (document or align) |
| P2 | i18n | Add "Apply" to messages |
| P2 | Code | Fix MAX_STATE_ROWS inconsistency |
| P2 | Code | Extract page into subcomponents |
| P3 | Feature | County-level population/GDP |
| P3 | Feature | Units by source/band |
| P3 | Feature | Export progress indicator |

---

## 9. Appendix: Current Data Flow

```
Request (anchor_type, state?, type?, distance_bands?, anchor_id?, anchor_slug?, compare?)
  → Auth + rate limit
  → Fetch anchors (ski_resorts | national-parks)
  → Fetch properties (hipcamp, all_glamping_properties) in parallel
  → Filter by property type (glamping | rv | all)
  → Deduplicate by coords
  → Compute proximity (distance, band, drive time, nearest anchor)
  → Apply anchor filter (if anchor_id or anchor_slug)
  → Filter by withinMiThreshold when custom bands
  → Fetch county-population, county-gdp (paginated, FIPS fallback)
  → Aggregate: by_band (unfiltered), by_source, by_state, trends, property_sample, anchors_with_property_counts, map, summary
  → Cache (Redis, 5 min)
  → Return JSON
```

---

*End of audit*
