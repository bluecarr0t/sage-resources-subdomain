# Proximity Insights — Data Accuracy Audit

**Page:** `/admin/proximity-insights`  
**API:** `GET /api/admin/anchor-point-insights`  
**Audit Date:** March 2026  
**Objective:** Ensure 100% accuracy for Sage Outdoor Advisory charts, metrics, and calculations

---

## Executive Summary

This audit evaluates the Proximity Insights feature end-to-end for data accuracy. **Critical issues** were found that can cause exported data to diverge from displayed insights, and several calculation/consistency issues may mislead advisory decisions. Recommendations are prioritized for immediate remediation.

---

## 1. CRITICAL — Export Pipeline Inconsistency

### 1.1 Missing Deduplication Steps in Export

**Location:** `lib/anchor-point-insights/export.ts` vs `lib/anchor-point-insights/index.ts`

**Main insights pipeline (index.ts):**
```
fetchAndNormalizeProperties
  → aggregateHipcampByPropertyMaxRate
  → filterByPropertyType
  → deduplicateByCoords
  → deduplicateByNameAndState
  → computeProximity
  → applyAnchorFilter
```

**Export pipeline (export.ts):**
```
fetchAndNormalizeProperties
  → filterByPropertyType
  → deduplicateByCoords
  → computeProximity
  → applyAnchorFilter
```

**Impact:**
- **aggregateHipcampByPropertyMaxRate** is missing: Hipcamp has one row per unit type (Tent Site, Cabin, Yurt). The main view keeps only the row with the MAX winter rate per property. Export returns ALL rows, inflating property counts and distorting averages.
- **deduplicateByNameAndState** is missing: Cross-source deduplication (same property in Hipcamp + Sage) is not applied. Export can include duplicate properties that the dashboard excludes.

**Result:** Exported data will NOT match dashboard totals. Users exporting for client reports may present different numbers than the UI.

**Recommendation:** Align export with main pipeline by adding `aggregateHipcampByPropertyMaxRate` and `deduplicateByNameAndState` before `filterByPropertyType` and `deduplicateByCoords` respectively.

---

### 1.2 Export Ignores Custom Distance Threshold

**Location:** `lib/anchor-point-insights/export.ts`

When custom distance bands are used (e.g. `10,25,50`), the main view filters to `withinMiThreshold = 50` for:
- `by_source`, `by_state`, `property_sample`, `map_properties`, `summary`

The export returns `proximityForAggregation` which includes ALL properties whose nearest anchor matches (regardless of distance). A property 100 mi from Yellowstone would be exported if Yellowstone is its nearest park.

**Impact:** Exported rows can exceed the distance range shown in the dashboard.

**Recommendation:** Apply `filteredForAggregation` logic (distance ≤ withinMiThreshold) to export rows when custom bands are used.

---

## 2. HIGH — Calculation & Data Accuracy

### 2.1 Units Count: Zero vs Null Handling

**Location:** `lib/anchor-point-insights/aggregate.ts` — `toUnits()`

```typescript
function toUnits(p: PropertyWithProximity): number {
  const u = p.quantity_of_units ?? p.property_total_sites ?? null;
  return typeof u === 'number' && !isNaN(u) ? u : 0;
}
```

When both `quantity_of_units` and `property_total_sites` are null, the function returns **0**. Properties are still counted in `total_properties` but contribute 0 to `total_units`. This is correct for sums (no inflation from assuming 1 unit).

**Status:** ✅ Correct — no fallback to 1. Previous audit concern about fallback-to-1 is resolved.

---

### 2.2 Average Winter Rate: Property vs Unit Weighting

**Location:** `lib/anchor-point-insights/aggregate.ts` — `buildSummary`, `aggregateByBand`, `aggregateBySource`

**Current behavior:** Avg winter rate = simple mean of **all properties** with winter rates (each property counts once).

**Consideration:** A property with 50 units vs one with 2 units are weighted equally. For unit-weighted average (e.g. "average rate per unit in the market"), you would weight by `quantity_of_units`. The current approach answers "average rate among properties" not "average rate per unit."

**Recommendation:** Document the decision; consider adding a unit-weighted average as an optional metric if advisory use case requires it.

---

### 2.3 Haversine Distance Formula

**Location:** `lib/proximity-utils.ts` — `calculateDistance()`

**Formula:** Standard Haversine with Earth radius R = 3959 miles. Implementation is correct.

**Rounding:** `distance_miles` is rounded to 1 decimal (`Math.round(minDist * 10) / 10`). ✅ Appropriate for display.

---

### 2.4 Drive Time Estimation

**Location:** `lib/proximity-utils.ts` — `estimateDriveTimeHours()`

```typescript
return miles / avgMph;  // default 30 mph
```

**Assumption:** 30 mph average for mountain/rural roads. This is a rough estimate; actual drive times vary by terrain and road type.

**Recommendation:** Add tooltip or footnote: "Drive time is estimated at ~30 mph average for rural/mountain roads."

---

### 2.5 Band Chart: Property Count vs Units

**Location:** `InsightsColumn.tsx` — band tooltip uses `bandTooltipProperties: "{count} properties"`

**Current:** `by_band[].count` = property count per band.

**Context:** Primary metric is Total Units; band charts show property count. This can be confusing.

**Recommendation:** Either add `units` per band to the API and UI, or add tooltip: "Property count per band."

---

### 2.6 State Population & GDP: Averaging vs Summing

**Location:** `lib/anchor-point-insights/aggregate.ts` — `buildSummary`

- **avg_state_population_2020:** `totalStatePop / popCount` — average of state populations where properties exist.
- **combined_state_gdp_2023:** `totalStateGDP` — sum of state GDPs.

**Semantics:** Population is "average state size" (states with properties); GDP is "total market size." Naming is intentional but could be clarified.

**Recommendation:** Add tooltip: "Average population of states with properties" and "Combined GDP of states with properties."

---

### 2.7 County vs State Enrichment

**Location:** `lib/anchor-point-insights/fetch-county-data.ts`

Population and GDP come from county tables but are aggregated to **state level**. Properties are matched by state only. A property in a small county gets full state population/GDP.

**Impact:** Market context (population/GDP) is state-level, not county-level. For large states (e.g. CA, TX), this can be less precise.

**Recommendation:** Future enhancement: reverse-geocode to county for more accurate market context.

---

### 2.8 Occupancy: Year-Specific vs Single Value

**Location:** `lib/anchor-point-insights/fetch-properties.ts`

- **Hipcamp:** `occupancy_rate_2024`, `occupancy_rate_2025`, `occupancy_rate_2026` — year-specific.
- **Sage:** `roverpass_occupancy_rate` used only for `roverpass_occupancy_year`; otherwise null for other years.

**Impact:** YoY occupancy trends are meaningful for Hipcamp; Sage has one value per property. The occupancy chart mixes sources.

**Recommendation:** Add tooltip: "Occupancy: Hipcamp has year-specific data; Sage uses a single rate per property."

---

### 2.9 Trends Chart: Hipcamp vs Sage

**Location:** `lib/anchor-point-insights/aggregate.ts` — `buildTrends`; `fetch-properties.ts`

- **Hipcamp:** `avg_rate_2024`, `avg_rate_2025` from `avg_retail_daily_rate_*`; `avg_rate_2026` is hardcoded `null`.
- **Sage:** All `avg_rate_*` are null.

**Impact:** Trends chart only reflects Hipcamp properties. Sage properties are excluded from YoY trend.

**Recommendation:** Add note: "Year-over-year trend based on Hipcamp properties with 2024 and 2025 rates."

---

### 2.10 National Parks vs Ski: Avg Rate by State

**Location:** `lib/anchor-point-insights/index.ts` — `aggregateByState(..., isNationalParks)`

When `isNationalParks == true`, `useYearAvgRate` is true — state table shows **avg annual rate** (average of all season rates). When ski, it shows **avg winter rate**.

**Status:** ✅ Intentional — different use cases for parks (year-round) vs ski (winter-focused).

---

## 3. MEDIUM — Consistency & Edge Cases

### 3.1 parseDistanceBandsParam: Zero Filtered Out

**Location:** `lib/proximity-utils.ts`

```typescript
.filter((n) => !isNaN(n) && n > 0)
```

**Impact:** Input `"0,10,25,50"` yields `[10, 25, 50]` — the 0 is dropped. First band becomes `0-10` instead of `0-10` (still works, but 0 as threshold is invalid for band boundaries).

**Status:** Acceptable — 0 is not a meaningful band boundary.

---

### 3.2 MAX_STATE_ROWS Consistency

**Location:** `lib/anchor-point-insights/constants.ts` (MAX_STATE_ROWS = 10); `InsightsColumn.tsx` imports from constants

**Status:** ✅ Single source — no inconsistency.

---

### 3.3 Deduplication: Name Normalization

**Location:** `lib/anchor-point-insights/aggregate.ts` — `normalizeNameForDedup`

```typescript
.replace(/[^\w\s-]/g, '');
```

Punctuation is stripped. "Bob's Ranch" and "Bobs Ranch" might deduplicate incorrectly. "Unknown" and empty names are excluded from name-based dedup and go through coord-only dedup.

**Recommendation:** Document that deduplication is best-effort; exact matches may differ by punctuation.

---

### 3.4 buildAnchorsWithCounts: Distance Recalculation

**Location:** `lib/anchor-point-insights/aggregate.ts` — `buildAnchorsWithCounts`

`within15` uses `calculateDistance` again — not `distance_miles` from `proximityForAggregation` (which is distance to **nearest** anchor). So for "15 mi" we correctly filter by distance to each anchor.

**Status:** ✅ Correct.

---

## 4. Data Flow Summary

```
Request (anchor_type, state?, type?, distance_bands?, anchor_id?, anchor_slug?, compare?)
  → Auth + rate limit
  → Fetch anchors (ski_resorts | national-parks)
  → Fetch properties (hipcamp, all_glamping_properties) in parallel
  → aggregateHipcampByPropertyMaxRate (Hipcamp)
  → filterByPropertyType (glamping | rv | all)
  → deduplicateByCoords
  → deduplicateByNameAndState
  → computeProximity (Haversine, band assignment, drive time)
  → applyAnchorFilter (nearest anchor match)
  → filteredForAggregation = withinMiThreshold filter (when custom bands)
  → Fetch county-population, county-gdp (paginated)
  → Aggregate: by_band, by_source, by_state, trends, property_sample, anchors_with_property_counts, map, summary
  → Cache (Redis, 5 min)
  → Return JSON
```

---

## 5. Priority Recommendations

| Priority | Issue | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Align export pipeline with main pipeline (add aggregateHipcampByPropertyMaxRate, deduplicateByNameAndState) | Medium | Critical — export matches dashboard |
| **P0** | Apply withinMiThreshold filter to export when custom bands used | Low | Critical — export respects distance filter |
| **P1** | Add tooltips for occupancy (Hipcamp vs Sage), trends (Hipcamp-only), drive time (30 mph estimate) | Low | High — clarity for advisory |
| **P1** | Document avg winter rate as property-weighted (not unit-weighted) | Trivial | Medium |
| **P2** | Add units per band to API/UI for consistency with Total Units | Medium | Medium |
| **P2** | Consider county-level population/GDP (future) | High | High |

---

## 6. Verification Checklist

Before releasing advisory reports, verify:

- [ ] Export row count matches dashboard totals (after P0 fixes)
- [ ] Custom distance bands: export only includes properties within max threshold
- [ ] Trends chart: understand it reflects Hipcamp-only
- [ ] Occupancy: understand mixed sources (Hipcamp year-specific, Sage single)
- [ ] State population/GDP: understand state-level aggregation
- [ ] Band charts: property count vs units — clarify which is shown

---

*End of audit*
