# Anchor Point Insights Audit

**Page:** `/admin/anchor-point-insights`  
**API:** `GET /api/admin/anchor-point-insights`  
**Audit Date:** March 5, 2026

---

## Executive Summary

Anchor Point Insights compares glamping/camping properties from two data sources (Hipcamp, Sage Glamping) against anchor points (ski resorts or national parks). It provides distance-band analytics, winter rates, trends, and county population/GDP context. The feature is functional but has several issues, improvement opportunities, and clear paths for future enhancement.

---

## 1. Issues (Bugs & Correctness)

### 1.1 Summary Label Mismatch
- **Location:** Stat card "Avg State Pop (2020)"
- **Issue:** The label says "Avg State Pop" but the API computes `avg_county_population_2020` as the **average of state-level population totals** (one value per state with properties), not county-level. The implementation sums county populations into states, then averages across states. The label is misleading.
- **Recommendation:** Rename to "Avg State Population (2020)" or "Mean State Pop (2020)" and add a tooltip clarifying it's the average population of states that have properties.

### 1.2 Summary GDP Label Mismatch
- **Location:** Stat card "Total State GDP 2023"
- **Issue:** The value is the **sum** of GDP across all states with properties, not a single state. The label "Total State GDP" could imply one state. Better: "Combined State GDP (Arts/Rec)".
- **Recommendation:** Rename to "Combined State GDP 2023 (Arts/Rec)" or "Total GDP Across States".

### 1.3 County vs State Enrichment
- **Location:** API route, county-population and county-gdp usage
- **Issue:** The API fetches county-level data but aggregates to **state level** for property enrichment. Properties are matched to states, not counties. A property in a small county gets the full state population/GDP, which dilutes the "proximity" signal.
- **Recommendation:** Consider reverse-geocoding properties to county (or using property `city`/`state` + county lookup) and enriching with county-level population/GDP for more accurate market context.

### 1.4 Potential Duplicate Properties
- **Location:** API route, property aggregation
- **Issue:** The same physical property may exist in multiple tables (e.g., Hipcamp and all_glamping_properties). There is no deduplication by name, coordinates, or external ID. Totals and averages can be inflated.
- **Recommendation:** Add deduplication logic (e.g., by `(lat, lon)` rounded, or by property name + state) before aggregating. Document the decision (e.g., "count each listing separately" vs "deduplicate").

### 1.5 `retail_daily_rate_ytd` as 2026 Proxy
- **Location:** API route, Hipcamp/Campspot
- **Issue:** `avg_retail_daily_rate_2026` does not exist; the code uses `retail_daily_rate_ytd` (year-to-date) as the 2026 trend value. YTD is not comparable to full-year averages and can skew trends.
- **Recommendation:** Either add a note in the Trends chart ("2026 = YTD") or exclude 2026 from trends until a proper column exists.

### 1.6 Table Key Assumptions
- **Location:** `fetchAllRows` helper
- **Issue:** Pagination assumes all tables have an `id` column and that `order('id', { ascending: true })` is valid. If any table lacks `id` or uses a different PK, pagination will fail.
- **Recommendation:** Verify `all_glamping_properties` and `all_roverpass_data_new` have `id`; consider a table-specific order column if needed.

---

## 2. Performance & Scalability

### 2.1 In-Memory Distance Computation
- **Issue:** For each property, the API computes distance to **every** anchor (O(properties × anchors)). With 50k properties and 60+ national parks, this is ~3M Haversine calculations per request. Acceptable for now but will not scale to 100k+ properties.
- **Recommendation:** Consider PostGIS `ST_DWithin` / `ST_Distance` for server-side filtering, or precompute property–anchor distances in a materialized view and query it.

### 2.2 Sequential Table Fetches
- **Issue:** The four property tables are fetched sequentially. Each can take 1–5+ seconds with pagination. Total time can exceed 20–30 seconds for large datasets.
- **Recommendation:** Fetch tables in parallel with `Promise.all()` to reduce latency.

### 2.3 County Tables Unbounded
- **Issue:** `county-population` and `county-gdp` are fetched without `.limit()`. If these tables grow large (e.g., multiple countries), the request could slow down.
- **Recommendation:** Add a reasonable limit or filter by US states if the schema supports it.

### 2.4 No Caching
- **Issue:** Every page load triggers a full recompute. Anchor lists and county lookups change rarely; property data changes more often.
- **Recommendation:** Cache anchors + county lookups (e.g., Redis, in-memory with TTL) and only recompute property aggregations. Or cache the full response with a short TTL (e.g., 5–10 minutes).

---

## 3. UX & Accessibility

### 3.1 No State Filter in UI
- **Issue:** The API supports `?state=CA` but the page does not expose it. Users cannot filter by state from the UI.
- **Recommendation:** Add a state dropdown or multi-select to filter by one or more states.

### 3.2 No Loading Skeleton
- **Issue:** Loading state is a spinner and text. No skeleton layout, which can feel abrupt.
- **Recommendation:** Add a skeleton that mirrors the stat cards and chart layout for a smoother loading experience.

### 3.3 No Refresh Button
- **Issue:** Users must navigate away and back (or switch anchor type) to refresh data.
- **Recommendation:** Add a "Refresh" button to manually refetch.

### 3.4 No Error Retry
- **Issue:** On network or 500 error, the user sees the error message but must manually reload.
- **Recommendation:** Add a "Retry" button in the error state.

### 3.5 Hardcoded Strings (i18n)
- **Issue:** Per project rules, user-facing strings should use i18n keys. This page uses hardcoded English.
- **Recommendation:** Extract strings to translation keys (e.g., `anchorPointInsights.title`, `anchorPointInsights.totalProperties`).

### 3.6 Chart Accessibility
- **Issue:** Recharts components may not expose sufficient ARIA labels or keyboard navigation for screen readers.
- **Recommendation:** Add `aria-label` and ensure charts are keyboard-navigable where possible.

---

## 4. Data Quality & Edge Cases

### 4.1 `state` Normalization
- **Issue:** Property `state` may be "CA", "California", or inconsistent. State lookup uses `state.toUpperCase()` for 2-letter codes. Full state names may not match `STATE_FULL_TO_ABBR` if formatting differs.
- **Recommendation:** Normalize state to 2-letter code before lookup (handle both "CA" and "California").

### 4.2 Missing Winter Rates
- **Issue:** Many properties (especially RoverPass/Sage Glamping) have `null` winter rates. They are included in counts but excluded from rate averages. The "Property Count by Data Source" chart shows all properties, while rate-based charts only use those with rates.
- **Recommendation:** Consider showing "Properties with winter rates" vs "Total properties" in tooltips or a secondary metric.

### 4.3 Empty Bands
- **Issue:** If a distance band has zero properties, it still appears in the chart with null averages. The chart shows all 5 bands regardless.
- **Recommendation:** Optionally hide bands with zero count, or show "0" and "—" explicitly for clarity.

---

## 5. Security & Robustness

### 5.1 Rate Limiting
- **Current:** 30 requests per minute per client.
- **Assessment:** Reasonable for an admin tool. Consider lowering if the endpoint becomes expensive (e.g., 10/min) or adding per-user limits.

### 5.2 Error Message Leakage
- **Issue:** On 500, the API returns `"Failed to fetch anchor point insights"`. Server logs the full error. Good—no stack traces to client.
- **Recommendation:** Consider returning a request ID for support/debugging without exposing internals.

### 5.3 Input Validation
- **Issue:** `anchor_type` is validated implicitly (only `national-parks` triggers parks; else ski). `state` is passed through without validation.
- **Recommendation:** Validate `state` against a known list of US state codes to avoid injection or unexpected behavior.

---

## 6. Code Quality

### 6.1 Monolithic API Route
- **Issue:** The route is ~450 lines with many responsibilities: auth, fetch, transform, aggregate, respond. Hard to test and maintain.
- **Recommendation:** Extract data-fetching, aggregation, and response-building into separate modules (e.g., `lib/anchor-point-insights/fetch-properties.ts`, `lib/anchor-point-insights/aggregate.ts`).

### 6.2 Repeated Parsing Logic
- **Issue:** Similar parsing loops for each table with slight column name differences. Could be DRYed with a table config.
- **Recommendation:** Define a table config (columns, source key, normalizer) and iterate.

### 6.3 Magic Numbers
- **Issue:** `MAX_PER_TABLE = 50_000`, `FETCH_PAGE_SIZE = 1000`, `slice(0, 15)`, `slice(0, 20)` are hardcoded.
- **Recommendation:** Extract to named constants at top of file or config.

---

## 7. Future Recommended Features

### 7.1 Map Visualization
- **Description:** Show properties and anchors on a map with distance bands color-coded. Users could click an anchor to see nearby properties.
- **Value:** High—spatial context is core to the product.

### 7.2 Export to CSV/Excel
- **Description:** Export the property sample, by-state table, or full dataset for offline analysis.
- **Value:** High—common ask for analysts.

### 7.3 Time Range for Trends
- **Description:** Allow selecting which years to include in the YoY trend (e.g., 2022–2026).
- **Value:** Medium.

### 7.4 Compare Ski vs National Parks Side-by-Side
- **Description:** Show both anchor types in one view for comparison (e.g., "Ski vs Parks: avg winter rate by distance band").
- **Value:** Medium.

### 7.5 Custom Distance Bands
- **Description:** Let users define custom bands (e.g., 0–10, 10–25, 25–50 mi).
- **Value:** Low–Medium.

### 7.6 Anchor-Specific Drill-Down
- **Description:** Click an anchor (e.g., "Yellowstone") to see a dedicated view: nearby properties, rates, trends for that anchor only.
- **Value:** High.

### 7.7 Seasonal Rates (Spring, Summer, Fall)
- **Description:** Extend beyond winter to show spring/summer/fall rates by distance band. Hipcamp/Campspot have these columns.
- **Value:** Medium.

### 7.8 Occupancy by Distance Band
- **Description:** Chart occupancy rates (2024–2026) by distance band, not just winter rates.
- **Value:** Medium.

### 7.9 New Anchor Types
- **Description:** Support additional anchors (e.g., beaches, lakes, theme parks) if tables exist.
- **Value:** Depends on data availability.

### 7.10 Scheduled Reports / Alerts
- **Description:** Email or Slack summary when key metrics change (e.g., "New properties within 30 mi of Yellowstone").
- **Value:** Medium for ops teams.

---

## 8. Priority Matrix

| Priority | Category        | Item                                      |
|----------|-----------------|-------------------------------------------|
| P0       | Bug             | Duplicate property handling (if confirmed) |
| P1       | Performance     | Parallel table fetches                    |
| P1       | UX              | State filter in UI                        |
| P1       | UX              | Refresh + Retry buttons                   |
| P2       | Correctness     | Summary label fixes (Pop, GDP)            |
| P2       | Performance     | Caching (anchors, county, or full)        |
| P2       | Code            | Extract API logic into modules            |
| P2       | i18n            | Add translation keys                      |
| P3       | Feature         | Map visualization                         |
| P3       | Feature         | CSV export                               |
| P3       | Feature         | Anchor-specific drill-down                |

---

## 9. Appendix: Data Flow

```
Request (anchor_type, state?)
    → Auth + rate limit
    → Fetch anchors (ski_resorts | national-parks)
    → Fetch properties (hipcamp, campspot, all_glamping_properties, all_roverpass_data_new) [paginated]
    → Fetch county-population, county-gdp
    → For each property: nearest anchor, distance band, drive time
    → Aggregate: by_band, by_source, by_state
    → Build: trends, property_sample, anchors_with_property_counts, summary
    → Return JSON
```

---

*End of audit*
