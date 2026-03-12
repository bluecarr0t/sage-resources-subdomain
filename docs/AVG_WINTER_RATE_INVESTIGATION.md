# Avg Winter Rate Investigation — Why $121 Is Low

**Issue:** Avg Winter Rate (~$121) appears artificially low. User suspects Hipcamp and/or specific unit types are pulling it down.

---

## Root Causes Identified

### 1. Hipcamp Granularity: One Row Per Unit Type (Not Per Property)

**Source:** `docs/RFP_WINTER_DEMAND_FRAMEWORK_SCOPE.md`, Hipcamp schema

| Fact | Detail |
|------|--------|
| **Hipcamp granularity** | One row per **site/unit** (Tent Site, Cabin, Yurt, etc.) |
| **Total Hipcamp rows** | ~60,111 |
| **Sage granularity** | One row per property (curated glamping resorts) |
| **Sage rows** | ~1,000–2,000 |

A single Hipcamp property can have multiple rows:
- Row 1: Tent Site — $50 winter weekend
- Row 2: Cabin — $200 winter weekend  
- Row 3: Yurt — $150 winter weekend

Each row is treated as a separate "property" in the average. Low-rate unit types (Tent Site, Canvas Tent, Bell Tent) dominate by volume.

### 2. Low-Rate Unit Types Included in "Glamping" Filter

**Location:** `lib/anchor-point-insights/property-type-filter.ts`

`GLAMPING_UNIT_KEYWORDS` includes **`tent`**, which matches:
- **Tent Site** (9,248 rows) — typically $30–80/night
- **Canvas Tent** (500 rows) — $50–100
- **Bell Tent** (260 rows) — $60–120

These pass the glamping filter and pull the average down. Premium types (Cabin $150–300, Yurt $100–200, Safari Tent $150–250) are outnumbered.

### 3. Deduplication Keeps One Arbitrary Row Per Location

**Location:** `lib/anchor-point-insights/aggregate.ts` — `deduplicateByCoords`

When multiple Hipcamp rows share the same (lat, lon) — e.g., same property with Tent + Cabin + Yurt — we keep **the first one** (by fetch order). We do not prefer the highest rate.

- If the $50 Tent Site row is first → we use $50
- If the $200 Cabin row is first → we use $200

Result: Random selection of unit type per property, biased toward whatever order the DB returns.

### 4. Equal Weighting Favors Hipcamp Volume

- Hipcamp: thousands of rows (after glamping filter, still many tent/canvas/bell)
- Sage: hundreds of rows, typically higher rates

Simple average = (sum of all rates) / (count). Hipcamp’s volume and lower rates dominate.

### 5. Unit Type Distribution (Northern Tier)

| Unit Type | Count | Typical Winter Rate |
|-----------|-------|---------------------|
| Tent Site | 9,248 | $30–80 |
| Canvas Tent | 500 | $50–100 |
| Bell Tent | 260 | $60–120 |
| Cabin | 2,554 | $150–300 |
| Yurt | 203 | $100–200 |
| Safari Tent | 123 | $150–250 |
| Dome | 138 | $100–200 |

---

## Recommended Fixes

### Fix 1: Use Max Rate Per Property for Hipcamp (Recommended)

**Before:** One row per unit type → dedupe by coords → keep first.

**After:** For Hipcamp, group by (lat, lon) and use **MAX(winter_weekday, winter_weekend)** per property. This represents the premium product at each location.

- Effect: Each property contributes its highest rate.
- Aligns with “glamping” as premium accommodation.

### Fix 2: Exclude Low-Rate Unit Types from Glamping

Exclude Hipcamp unit types that are typically budget:
- `Tent Site` (exact match)
- `Canvas Tent`
- `Bell Tent` (or require “glamping” / “safari” / “bell tent” only when combined with premium)

**Risk:** May exclude some higher-end bell tents. Could use a rate threshold instead.

### Fix 3: Weighted Average by Units

Use `quantity_of_units` (or `property_total_sites`) as weight:
- `sum(rate × units) / sum(units)`

Larger properties (more units) count more. A 20-unit cabin property affects the average more than a 1-unit tent site.

### Fix 4: Property-Level Aggregation for Hipcamp Before Merge

1. Group Hipcamp rows by `(property_name, lat, lon)`.
2. Per property: use MAX rate, or average of unit-type rates, or weighted average.
3. Merge with Sage (already property-level).
4. Proceed with existing pipeline.

---

## Implementation Priority

| Fix | Effort | Impact | Recommendation |
|-----|--------|--------|----------------|
| Fix 1: Max rate per property (Hipcamp) | Low | High | **Implement first** |
| Fix 2: Exclude Tent Site from glamping | Low | Medium | Consider |
| Fix 3: Weighted average | Medium | Medium | Optional |
| Fix 4: Full property aggregation | Medium | High | Alternative to Fix 1 |

---

## Next Steps

1. Implement Fix 1: aggregate Hipcamp by coords and use max winter rate per property.
2. Optionally add a "Premium only" filter that excludes Tent Site, Canvas Tent, Bell Tent for Hipcamp.
3. Add a diagnostic endpoint or script to report avg rate by source and by unit type for validation.
