# Amenities tagging audit — `all_glamping_properties`

**Date:** 2026-05-28  
**Table:** `public.all_glamping_properties`  
**Re-run:** `queries/amenities_tagging_audit.sql` (Supabase SQL editor)

## Cohort (primary lens)

Same filters as ARDR / hot-tub / sauna runbooks:

- `is_glamping_property = 'Yes'`
- `research_status = 'published'`
- US, `property_type = 'Glamping'`, `is_open = yes`
- `land_operator_category` null or `private_commercial`
- Excludes tent-site and RV-only `unit_type` rows

| Metric | Count |
|--------|------:|
| Unit rows | 1,420 |
| Weighted units | 7,794 |
| Distinct properties | 601 |
| Rated rows (ADR > 0) | 1,297 |
| Properties with scrape URL | 596 |

Full table: **3,329** rows (**2,643** published, **2,677** glamping Yes).

## Executive summary

Structured amenity flags are **mostly empty** in the published US glamping cohort. Values are expected to be explicit `Yes` / `No` (or `y` / `n`); null/blank counts as a **gap**.

| Category | Fields | Avg % explicit | Fields ≥50% tagged | Fields &lt;25% tagged |
|----------|-------:|---------------:|-------------------:|---------------------:|
| **unit** | 23 | **13.9%** | 3 | 19 |
| **property** | 29 | **7.2%** | 0 | 25 |
| **activities** | 22 | **1.7%** | 0 | 22 |
| **setting** | 18 | **1.6%** | 0 | 18 |
| **rv** | 14 | **0.4%** | 0 | 14 |

Only **five fields** reach ≥40% explicit tagging in this cohort:

| Field | % explicit | Yes rows | Gap rows |
|-------|----------:|---------:|---------:|
| `unit_private_bathroom` | 69.4% | 737 | 435 |
| `unit_hot_tub_or_sauna` | 66.8% | 58 | 471 |
| `unit_hot_tub` | 51.6% | 137 | 687 |
| `property_food_on_site` | 47.3% | 444 | 749 |
| `property_restaurant` | 46.9% | 249 | 754 |

`glamping_service_tier` is populated on **95.6%** of cohort rows (1,358 / 1,420) — tier classification runs ahead of per-amenity backfill.

## Highest-priority gaps (product / analytics impact)

### Core unit amenities (still mostly blank)

| Field | % explicit | Notes |
|-------|----------:|-------|
| `unit_wifi` | 16.5% | Core filter amenity |
| `unit_shower` | 16.8% | |
| `unit_pets` | 12.8% | |
| `unit_sauna` | 25.2% | Sauna web-research in progress |
| `unit_full_kitchen` | 5.1% | |
| `unit_water` | 3.5% | |
| `property_pool` | 7.3% | |
| `property_laundry` | 1.9% | 0 Yes rows in cohort |

### Property-level

No property-level flag reaches 50% explicit. Best after restaurant/food:

- `property_hot_tub` — 33.6%
- `property_waterfront` — 30.7%
- `property_sauna` — 8.5%

### Activities & setting

Effectively **unfilled** for this cohort (most fields 0% explicit). Partial exceptions:

- `activities_wildlife_watching` — 11.9%
- `setting_forest` — 13.2%

22 activity fields and 18 setting fields have **&lt;2%** explicit values.

### RV hooks

All 14 `rv_*` flags ~**0.4%** explicit — expected for glamping unit rows, not RV sites.

## Property-level core amenity gap

Among **601** properties:

| Metric | Count |
|--------|------:|
| No `unit_wifi`, `unit_private_bathroom`, `unit_hot_tub`, or `unit_pets` tagged on any unit | **139** |
| Same gap but property has URL (researchable) | **138** |
| Every unit row has wifi **and** private bathroom tagged | **53** |

So **~23%** of properties lack any tagging on four core unit flags, almost all with URLs available for web research.

## Unstructured fallbacks

| Column | Rows populated (cohort) |
|--------|----------------------:|
| `amenities_raw` | 212 (14.9%) |
| `activities_raw` | 0 |
| `lifestyle_raw` | 0 |

Raw Roverpass text is **not** a substitute for structured flags in this cohort.

## Hot tub / sauna backfill status (cohort)

| Metric | Rows |
|--------|-----:|
| `discovery_source` hot-tub research | 630 |
| `discovery_source` sauna research | 270 |
| Any-level hot tub Yes | 313 |
| Any-level sauna Yes | 75 |

See also `queries/hot_tub_tagging_audit.sql` and `queries/sauna_tagging_audit.sql`.

## Recommended backfill order

1. **Tier-1 unit flags** (map filters + service tier): `unit_wifi`, `unit_pets`, `unit_shower`, `unit_water`, `unit_full_kitchen` / `unit_kitchenette`
2. **Extend hot tub / sauna** pipelines to remaining URL-backed properties
3. **Property resort flags** with highest signal: `property_pool`, `property_laundry`, `property_playground`, `property_food_on_site` (food/restaurant already ~47%)
4. **Activities / setting** — batch import or LLM scrape from property sites; currently near-zero
5. **RV columns** — only for rows where `unit_type` is RV; skip glamping cohort backfill

## Artifacts

- `queries/amenities_tagging_audit.sql` — repeatable SQL
- `scripts/generate-amenities-audit-sql.ts` — optional static SQL generator
- `lib/sage-ai/all-glamping-properties-columns.ts` — column inventory
- `lib/site-builder/glamping-properties-amenity-columns.ts` — Site Builder catalog subset
