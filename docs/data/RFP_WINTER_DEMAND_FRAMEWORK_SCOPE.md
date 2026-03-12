# Winter Demand Measurement Framework — RFP Scope

**Project:** Resort RFP near small ski hill  
**Objective:** Develop a defensible framework for quantifying winter demand using proprietary datasets  
**Status:** Framework outline only — no data extraction this week

---

## 1. Hipcamp Dataset Scope (`sites-Hipcamp-United States- (1).csv`)

### 1.1 Overview

| Metric | Value |
|--------|-------|
| **Total records** | ~60,111 (site-level) |
| **Geographic scope** | United States |
| **Source** | Hipcamp |
| **Granularity** | One row per site/unit (RV Site, Tent, Cabin, etc.) |

### 1.2 Winter-Relevant Columns

| Column | Type | Coverage | Use in Framework |
|--------|------|----------|------------------|
| **Winter Weekday** | Numeric ($) | 100% (60,111 valid) | Winter rate premium / demand proxy |
| **Winter Weekend** | Numeric ($) | 100% | Weekend winter demand |
| **Operating Season (Months)** | Numeric (1–12) | Present | Filter to winter-operating properties |
| **Operating Season (Excel Format)** | Text (month names) | Present | Identify Jan/Feb/Dec operations |
| **Snow sports** | Yes/No | 6,300 = Yes (~10.5%) | Ski-proximate / winter-activity proxy |
| **High Month 2025/2026** | Text | Present | Peak season identification |
| **Low Month 2025/2026** | Text | Present | Off-season identification |
| **Occupancy Rate 2024/2025/2026** | Numeric | Partial ("No data" in some) | Demand intensity |
| **RevPAR 2025/2026** | Numeric | Present | Revenue per available unit |

### 1.3 Geographic Coverage — Northern Tier & Ski States

**Northern tier states (WI, MI, MN, etc.):**

| State | Site Count | Snow Sports = Yes |
|-------|------------|-------------------|
| Washington | 3,868 | 628 |
| Colorado | 2,518 | 529 |
| New York | 2,255 | 598 |
| Oregon | 1,946 | 286 |
| Utah | 1,860 | 179 |
| Michigan | 1,792 | 386 |
| Montana | 1,105 | 276 |
| Wisconsin | 1,006 | — |
| South Dakota | 1,084 | — |
| Idaho | 1,194 | 210 |
| Maine | 962 | 172 |
| Vermont | 651 | 269 |
| Minnesota | 716 | — |
| Wyoming | 739 | — |
| New Hampshire | 568 | 214 |
| North Dakota | 75 | — |

**Total northern tier:** ~22,339 sites

### 1.4 Spatial Analysis Readiness

| Field | Availability | Notes |
|-------|--------------|-------|
| **lat** | Present | Required for distance-to-ski |
| **lon** | Present | Required for distance-to-ski |
| **State** | Present | Filter by region |
| **City** | Present | Secondary geography |

**Existing codebase pattern:** `getPropertiesNearNationalPark()` in `lib/map-data-utils.ts` uses Haversine distance with bounding-box pre-filter. Same pattern can be applied for **distance to ski area** (ski hill coordinates as anchor).

### 1.5 Unit Type Distribution

**Core RV & Tent (high volume)**

| Unit Type | Count | Winter Relevance |
|-----------|-------|------------------|
| vehicles | 21,548 | High — four-season capable |
| RV Site | 15,049 | High — four-season capable |
| Tent Site | 9,248 | Low — typically seasonal |
| Rv Or Trailer | 1,090 | High — four-season capable |

**Glamping & premium accommodations** (northern tier only; of 22,339 total northern tier sites)

| Unit Type | Count | Winter Relevance |
|-----------|-------|------------------|
| Cabin | 2,554 | **High** — primary winter demand anchor |
| Canvas Tent | 500 | Low — unheated, seasonal |
| Tiny Home | 309 | Medium — often heated, four-season |
| Vacation Rental | 321 | Medium — varies by property |
| Bell Tent | 260 | Low — typically seasonal |
| Yurt | 203 | Medium — heated options common |
| Safari Tent | 123 | Low — seasonal |
| Dome | 138 | Medium — some heated/insulated |
| Vintage Trailer | 128 | Medium — enclosed, four-season |
| Treehouse | 75 | Low — often seasonal |
| Airstream | 63 | High — enclosed, four-season |
| Quirky | 71 | Varies — mixed formats |
| A Frame | 59 | **High** — cabin-like, winter appeal |
| Glamping Pod | 46 | Medium — insulated options |
| Van Bus | 27 | Medium — enclosed |
| Bungalow | 41 | **High** — cabin-like |
| Barn | 30 | Medium — converted structures |
| Shepherd S Hut | 38 | Medium — enclosed |
| Train Boxcar | 7 | Medium — enclosed |
| Earth House | 6 | Medium — insulated |
| vardo | 3 | Medium — enclosed |

**Glamping total (northern tier):** ~5,000 sites

---

## 2. Other Proprietary Datasets (Reference)

### 2.1 RoverPass

- **~28,567 sites** (Site Data)
- **~662 campgrounds** (Campground Data)
- **424 campgrounds** with occupancy (booked/bookable nights)
- **Gaps:** No lat/lon (geocode from city/state/zip); no explicit winter/summer split — seasonal rates derived from mon–sun as proxy
- **Use:** Occupancy-based demand; comparable market rates; supplement Hipcamp in regions with overlap

### 2.2 Campspot

- Referenced in docs; structure TBD
- **Use:** Additional occupancy/rate comparables; cross-validate Hipcamp findings

### 2.3 Manual Internal Data

- `all_glamping_properties` — curated glamping/cabin/resort inventory
- **Use:** Premium segment comparables; quality-adjusted benchmarks

---

## 3. Proposed Winter Demand Framework (Outline)

### 3.1 Pillar 1: Spatial Proximity to Ski Anchor

- **Input:** Ski hill coordinates (project location)
- **Logic:** Haversine distance from each Hipcamp/RoverPass site to ski hill
- **Bands:** 0–15 mi, 15–30 mi, 30–50 mi, 50–75 mi
- **Output:** Winter rate premium and occupancy by distance band (ski-proximate vs. non-ski)
- **Differentiator:** Most consultants use county/MSA; we use actual distance bands

### 3.2 Pillar 2: Comparable Market Analysis

- **Hipcamp:** Filter to northern tier + Snow sports = Yes; winter-operating (Operating Season includes Jan/Feb/Dec)
- **RoverPass:** Occupancy + rates by region; join to geography
- **Manual:** Glamping/cabin comparables in same state/region
- **Output:** Winter ADR, RevPAR, occupancy by comparable set

### 3.3 Pillar 3: Seasonal Demand Curves

- **High Month / Low Month** from Hipcamp — identify winter as peak vs. shoulder
- **Winter Weekday vs. Weekend** — weekend premium as demand proxy
- **Operating Season** — % of supply that operates in winter (capacity constraint)

### 3.4 Pillar 4: Activity-Based Segmentation

- **Snow sports = Yes** — explicit winter-activity positioning
- **Unit type** — Cabin, heated Yurt, RV (four-season) vs. Tent (summer-only)
- **Setting** — Mountainous, Forest (from Hipcamp setting columns)

### 3.5 Pillar 5: Supplemental Data (Optional)

- **AirDNA:** STR/cabin comparables for winter occupancy and rates (if budget allows)
- **CoStar alternative:** Use Hipcamp + RoverPass + manual as primary; avoid paid CoStar if possible

---

## 4. Data Extraction Checklist (Future)

- [ ] Obtain ski hill coordinates for project
- [ ] Build distance-to-ski calculation (reuse `calculateDistance` / Haversine)
- [ ] Filter Hipcamp to northern tier + winter-operating + Snow sports
- [ ] Aggregate winter rates (Winter Weekday/Weekend) by distance band and state
- [ ] Join RoverPass occupancy to geography (after geocoding if needed)
- [ ] Cross-reference manual `all_glamping_properties` for cabin/glamping comparables
- [ ] Document methodology for RFP appendix

---

## 5. Strategic Positioning for RFP

| Traditional Consultant Approach | Our Differentiated Approach |
|---------------------------------|-----------------------------|
| County/MSA-level data | Distance-band analysis (0–15 mi, 15–30 mi, etc.) |
| Single data source | Multi-source: Hipcamp + RoverPass + Campspot + manual |
| Aggregate occupancy only | Seasonal (winter) occupancy + rate premium |
| Generic "comparable markets" | Activity-based (Snow sports) + unit-type segmentation |
| CoStar-dependent | Proprietary outdoor hospitality data (Hipcamp, RoverPass) |

---

## 6. File Reference

- **Hipcamp CSV:** `csv/sites-Hipcamp-United States- (1).csv`
- **RoverPass docs:** `docs/data/ROVERPASS_DATA_ANALYSIS.md`, `docs/data/ROVERPASS_RAW_TO_UNIFIED_SCHEMA_MAPPING.md`
- **Distance logic:** `lib/map-data-utils.ts` (`getPropertiesNearNationalPark`, `calculateDistance`)
- **Schema:** `lib/types/sage.ts` (rate_winter_weekday, rate_winter_weekend, activities_snow_sports)
