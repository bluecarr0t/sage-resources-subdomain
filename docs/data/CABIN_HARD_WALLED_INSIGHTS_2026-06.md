# Hard-Walled Unit (Cabin) Data Insights — Phase 1 Development

**Prepared:** 2026-06-09 (web validation added same day) · **For:** client meeting ~June 22
**Project context:** 36-unit Phase 1, hard-walled focus (cabins / A-frames / tiny homes), at least one "unique" unit, optional 1–2 safari tent test units, full F&B + sauna/gym + retail + guided activities, target ADR $400–600.
**Site:** Grand Geneva Resort campus (adjacent to Timber Ridge Lodge & Waterpark), Lake Geneva, WI — per the JSD topographic/utility survey (Task 4.0) and preliminary site plan: premium + wooded glamping sites, cafe/clubhouse, amenity lawn, drop-off, wetland boardwalk, walking-path and mountain-bike-trail connections, and a delineated future expansion parcel east of the survey extents.

## Data sources & methodology

| Source | Used for | Cohort |
| --- | --- | --- |
| `all_glamping_properties` (Sage) | ADR, seasonal rates, unit mix, amenities, comp set | US, `is_glamping_property='Yes'`, `is_open='Yes'`, `research_status='published'` |
| `hipcamp` (flat OTA table) | Occupancy 2024–2026, OTA ADR, RevPAR, seasonality months | US listings; occupancy is a 0–1 fraction; usable band 10–99% |

- **Hard-walled** = Cabin, A-Frame, Tiny Home, Treehouse, Cottage, Lodge, Mirror Cabin, Hobbit House (Sage) / Cabin, A Frame, Tiny Home, Treehouse, Bungalow, Shepherd's Hut (Hipcamp). Airstreams/trailers excluded per brief.
- **Effective ADR (Sage)** = mean of populated seasonal `rate_*` columns, else `rate_avg_retail_daily_rate`; unit-weighted figures use `quantity_of_units`.
- **Midwest** = IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI.
- Reproducible SQL: [`queries/cabin_hard_walled_phase1_analysis.sql`](../../queries/cabin_hard_walled_phase1_analysis.sql). CSV exports in [`docs/data/exports/`](exports/) (4 files dated 2026-06-09).

**Key caveat:** Sage rows carry no occupancy; all occupancy comes from Hipcamp, which skews toward smaller, independent, lower-ADR operators (US cabin avg OTA ADR ≈ $176). Treat Hipcamp occupancy as a conservative floor for a professionally amenitized resort — and treat the two sources' ADRs as different markets (OTA listings vs. researched retail rates).

## 1. Cabin deep-dive (key findings)

### Inventory
- Sage US open/published: **276 cabin rows, 162 properties, ~1,754 units**. Midwest: 54 rows / ~263 units with ADR.
- Hipcamp US: **6,986 cabin listings** (1,056 Midwest) with occupancy data on ~4,800.

### ADR (Sage effective retail)
| Scope | n | Avg | Unit-weighted | Median | P75 | P90 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| US | 254 | $439 | $415 | $250 | $419 | $1,085 |
| Midwest | 54 | $267 | $229 | $230 | $310 | $389 |

The $400–600 target sits at roughly the **75th–85th percentile nationally** and **above the 90th percentile in the Midwest** — achievable, but it positions the project at the very top of the regional market and requires the planned amenity stack to support it.

### Seasonal rate spreads (Sage cabins, avg by season)
| Scope | Winter WD | Winter WE | Spring WD | Spring WE | Summer WD | Summer WE | Fall WD | Fall WE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| US | $307 | $332 | $315 | $348 | $358 | $384 | $359 | $389 |
| Midwest | $179 | $196 | $198 | $216 | $272 | $302 | $203 | $235 |

- Midwest cabins show a **~50–55% summer-over-winter premium** (vs ~17% nationally) — pricing power is concentrated June–August, but hard-walled units still command meaningful winter rates (unlike canvas, which often closes).
- Weekend premiums run ~9–11% over weekday in all seasons.

### Occupancy & RevPAR (Hipcamp cabins)
| Scope | 2024 occ | 2025 occ (avg / median) | 2026 YTD occ | OTA ADR 2025 | RevPAR 2025 | High-month occ | Low-month occ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| US (n=4,809) | 55.7% | 50.4% / 49.0% | 44.4% | $176 | $87 | 80.5% | 24.2% |
| Midwest (n=754) | 56.2% | 54.7% / 59.0% | 50.8% | $155 | $80 | 85.4% | 24.9% |

- **Midwest cabins outperform the national average on occupancy** (54.7% vs 50.4% in 2025; median 59% vs 49%) despite lower ADR — supportive of the region for a cabin-led project.
- Peak-month occupancy averages ~85% in the Midwest; trough months drop to ~25%, underlining the value of winterized hard-walled product plus indoor amenities (sauna, F&B) to defend shoulder/winter season.

### Does occupancy hold at $400–600? (Hipcamp cabins, 2025)
| ADR band | Sites | Avg occ | Median occ | RevPAR | Midwest avg occ |
| --- | ---: | ---: | ---: | ---: | ---: |
| <$100 | 1,809 | 49.2% | 49.0% | $35 | 51.7% |
| $100–199 | 2,964 | 50.8% | 50.0% | $72 | 57.4% |
| $200–299 | 984 | 51.8% | 49.0% | $120 | 58.0% |
| $300–399 | 329 | 51.1% | 48.0% | $165 | 45.6% |
| **$400–600 (target)** | **247** | **48.2%** | **47.0%** | **$211** | **50.2%** |
| >$600 | 131 | 47.3% | 38.0% | $482 | 36.1% |

**Headline:** occupancy is remarkably price-inelastic up through the $400–600 band (~48–52% across all bands) and only deteriorates above $600 (median falls to 38%). At target pricing, the $400–600 band generates **~3x the RevPAR** of the $100–199 band at essentially the same occupancy. The supply story matters too: only **247 of 6,463 priced cabin listings (~4%)** operate in the target band — 23 of them in the Midwest.

### Midwest state detail (Hipcamp cabins, 2025)
Top states by occupancy: **South Dakota 66.4%** (Black Hills), **Ohio 56.0%** (Hocking Hills), **Minnesota 56.0%**, **Michigan 54.7%**, **Indiana 54.4%**. Full table with ADR, RevPAR, and high/low months: [`cabin-occupancy-by-midwest-state-2026-06-09.csv`](exports/cabin-occupancy-by-midwest-state-2026-06-09.csv).

## 2. Cabins vs A-frames vs other hard-walled units

Full table: [`cabin-hard-walled-unit-type-summary-2026-06-09.csv`](exports/cabin-hard-walled-unit-type-summary-2026-06-09.csv).

| Unit type | Sage units (US) | Sage avg / median ADR | Hipcamp occ 2025 | Hipcamp RevPAR 2025 |
| --- | ---: | ---: | ---: | ---: |
| Cabin | ~1,754 | $439 / $250 | 50.4% | $87 |
| Tiny Home | ~1,450 | $275 / $219 | 49.2% | $74 |
| Treehouse | ~191 | $316 / $269 | 50.9% | **$101** |
| A-Frame | 5 (Sage thin) | $190 / $179 | 48.4% | $71 |
| Bungalow | — | — | 48.9% | $94 |
| Shepherd's Hut | — | — | 52.9% | $99 |
| *Safari Tent (context)* | ~2,164 | $346 / $239 | **47.3%** | $74 |
| *Canvas Tent (context)* | — | — | 53.4% | $90 |
| *Dome (context)* | ~278 | $373 / $299 | 49.3% | $112 |

- **Occupancy is essentially flat across unit types (47–53%)** — unit type drives *rate*, not *fill*. Cabins and treehouses earn the highest hard-walled RevPAR.
- **A-frames:** Sage coverage is thin (5 rows), but Hipcamp's 140 A-frame listings show occupancy in line with cabins (48.4%) at lower ADR ($133) — and notably **61% occupancy in the Midwest**, the strongest regional reading of any hard-walled type. They behave like a cabin variant, not a separate risk class.
- **Safari tents** post the lowest occupancy of any type (47.3%) and lower 2024 readings too (49.5% vs cabins' 55.7%) — consistent with treating 1–2 units as a low-stakes test, not a load-bearing part of the unit mix.
- **Hybrid canvas/cabin (light touch):** the curated US high-confidence cohort ([`HYBRID_CANVAS_CABIN_US_HIGH_CONFIDENCE.md`](HYBRID_CANVAS_CABIN_US_HIGH_CONFIDENCE.md)) shows hybrids can reach $309–$604 ADR (Mendocino Grove, Terramor, ULUM), but only 3–4 of 22 properties operate canvas in freezing winters. In a Midwest climate, hybrids would mostly be seasonal inventory — a reasonable later-phase consideration but correctly de-prioritized for Phase 1.

## 3. The "unique unit" premium

- **Sage, within-property** (28 properties operating both standard hard-walled and specialty units — treehouse, mirror cabin, hobbit house, covered wagon): specialty units price at **+22% on average (median +8%)** over the same property's standard units ($385 vs $296).
- **Hipcamp, same-property treehouse vs cabin/tiny home** (41 properties): treehouses earn **+7.4% ADR at equivalent occupancy** (49.5% vs 52.1%).
- Treehouses also post the **highest standalone RevPAR of any hard-walled type ($101)**, and marquee operators (Bolt Farm, Onera Wimberley, The Mohicans, Treetop Hideaways) anchor their brand and PR around them.

**Implication:** one or two unique units (treehouse or custom/mirror cabin) should rate-premium ~10–25% over the standard cabin product without an occupancy penalty, and carry outsized marketing value.

## 4. Who actually achieves $400–600 with hard-walled units?

36 US properties (54 unit rows, ~673 units) have hard-walled inventory at a $400–600 effective ADR — list in [`cabin-target-adr-400-600-cohort-2026-06-09.csv`](exports/cabin-target-adr-400-600-cohort-2026-06-09.csv). Only **4 are Midwest**: Sundance Ranch KC (MO, $498), The Mohicans (OH, $486), Kimberly Creek Retreat (NE, $473), Blue Bell Lodge (SD, $442).

Profile of the cohort:
- **Tier:** 56% luxury/upscale by row count; the rest are midscale operators with standout design or location.
- **Amenities (where tracked in Sage):** ~46% have on-site F&B, ~35% in-unit or property hot tubs, 65% private bathrooms. Sauna/gym/retail flags are sparsely populated in the database (4%/0%/2%) — this reflects data coverage, not market reality, so amenity benchmarking for the deck should rely on the comp set websites rather than these flags.
- **Operating models that recur:** drive-to metro feeder markets (Catskills/NYC, Hill Country/Austin, Big Sur/SF), strong design identity (Piaule, Gather Greene), or a national-park gateway (Firefall Ranch, Zion Ponderosa).
- The planned amenity stack (full F&B, sauna + gym, retail, guided activities) is **more complete than nearly every property currently achieving $400–600** — that is the credible path to pushing a Midwest project from the regional ~$300 ceiling toward the target band.

## 5. Planned amenity program — what the data supports

Phase 1 includes a **full F&B operation, basic wellness (sauna + small gym), a retail store, and guided activities**. Each component maps to rate or occupancy evidence:

| Planned amenity | Evidence | Implication |
| --- | --- | --- |
| **Full F&B operation** | On-site F&B is the most common premium amenity in the $400–600 cohort (~46% of properties, the highest-tracked flag). Comp proof: Blue Bell Lodge ($512, restaurant + retail), Firefall Ranch ($542, pool + F&B), Kimberly Creek ($333, F&B). Industry: ancillary revenue (F&B, activities, wellness, events) contributes **15–30% of total revenue** at well-run glamping properties (Cairn/MMCG 2025). | The cafe/clubhouse on the site plan is the strongest single rate-justifier in the program — and it's table stakes at the top of the band. Grand Geneva's three existing restaurants extend the F&B depth no comp can match. |
| **Sauna + small gym (basic wellness)** | Properties pairing hard-walled units with wellness consistently clear $390+: Piaule Catskill ($544, spa), Inn & Spa at Cedar Falls ($389), Blackberry Mountain ($1,500, full wellness). Cuyuna Cove's sauna anchors a top-5 Midwest ADR ($381). Sage's published Texas data ties hot tubs/saunas to measurable revenue uplift. Sundara (WI Dells) proves Wisconsin wellness demand at $275–700/night. | Wellness is the **shoulder/winter defense**: trough-month occupancy runs ~25%, and a sauna + indoor wellness program is the clearest lever to compress that gap for a winterized product. Gym flags are essentially untracked in glamping (0% of cohort) — a small gym differentiates but should be positioned as part of the wellness bundle, not a standalone rate driver. |
| **Retail store** | Sparsely tracked (~2% of cohort flags), but present at the top of the Midwest market: Blue Bell Lodge ($512) operates a general store, and park-gateway operators treat camp stores as standard. Camp Wandawega monetizes brand merchandise well beyond the property (Chicago retail store). | Modest direct revenue, but supports length of stay (2025 industry avg LOS: 2.7 nights, up from 2.2) and brand halo. Merch upside is real in this micro-market — Wandawega proves it. |
| **Guided activities** | Activities are a core component of the 15–30% ancillary revenue share. Cuyuna Cove's trail-town (MTB) anchor sustains $381 in MN. The site plan connects directly to Grand Geneva's mountain-bike trails, walking paths, and wetland boardwalk; the campus already operates an Adventure Center (archery, hiking, e-bikes), horseback riding, ski hill, and golf. | Guided activities are the **midweek/shoulder demand builder** — the mechanism for converting a weekend-peak market (weekend rates run ~$20–40 above weekday in every season) into longer, flatter booking patterns. |

**Net:** the planned stack is more complete than nearly every property currently achieving $400–600 (most clear the band with only one or two of these components). Combined with the existing 612-key resort amenity base, it is the credible bridge from the Midwest's ~$300 cabin ceiling to the target band.

One addition worth considering: **in-unit hot tubs/plunge tubs** are the most common in-unit premium amenity in the target cohort (~35% of properties) and the amenity with the clearest measured rate uplift in Sage's published data — a natural spec for the premium-site units on the western ridge.

## 6. Comp set — high-quality cabin resorts (Midwest-first)

Full set (17 Midwest + 26 national): [`cabin-comp-set-midwest-national-2026-06-09.csv`](exports/cabin-comp-set-midwest-national-2026-06-09.csv), with unit mix, seasonal rates, and amenity flags.

**Midwest headliners:**
| Property | State | Units (HW/total) | HW ADR | Notes |
| --- | --- | --- | ---: | --- |
| Blue Bell Lodge | SD | 10/10 | $512 | Custer SP; restaurant + retail; luxury tier |
| Sundance Ranch KC | MO | 4/5 | $498 | KC metro drive-to |
| The Mohicans | OH | 13/13 | $486 | Treehouses + cabins; weddings/events engine |
| The Inn & Spa at Cedar Falls | OH | 12/48 | $389 | Hocking Hills; spa positioning |
| Cuyuna Cove | MN | 10/10 | $381 | Cabins + tiny homes; **sauna**; trail-town (MTB) anchor |
| Kimberly Creek Retreat | NE | 6/8 | $333 | F&B + hot tub; Omaha drive-to |
| Postcard Cabins (Kettle River MN / Barber Creek MI / Starved Rock IL) | MN/MI/IL | 41–58 | $206–257 | Scale benchmark for 36+ unit cabin operations |

**National aspirational tier** (what full-amenity hard-walled resorts achieve): Castle Hot Springs AZ ($1,504), Blackberry Mountain TN ($1,500, full wellness), Ambiente Sedona ($1,419, 40 units), Piaule Catskill ($544, 24 units + spa), Firefall Ranch CA ($542, 55+ cabins, pool/F&B), AutoCamp portfolio ($412–493).

**Comp-set takeaways for the project:**
1. No Midwest property today combines 36 hard-walled units *and* a full amenity stack at $400+ — the closest analogs are either small/high-rate (Mohicans, Cuyuna Cove) or large/low-rate (Postcard Cabins). The project would occupy a genuinely open position.
2. Postcard Cabins' Midwest units run $206–257 with minimal amenities — a useful floor demonstrating that scale alone doesn't reach the target band.
3. Properties pairing cabins with spa/wellness (Piaule, Eastwind, Cedar Falls, Blackberry) consistently clear $390+, supporting the sauna/wellness component.

## 7. Site context & web validation (added 2026-06-09)

### Grand Geneva site context (web-verified)
- Grand Geneva Resort & Spa: AAA Four-Diamond, ~1,300 acres, **612 keys on campus** (358 resort rooms + 29 villas + Timber Ridge's 225 suites), WELL Spa + Salon, two championship golf courses plus the new Wee Nip short course (opened May 2026), The Mountain Top ski hill, 62,000 sq ft of meeting space, three restaurants. **90 minutes from Chicago, 50 from Milwaukee.**
- The glamping development has **no public announcements yet** — recent Grand Geneva press coverage is golf-focused (Wee Nip). The site plan's amenity program (cafe/clubhouse, amenity lawn) layers on top of an existing resort amenity base most $400–600 achievers lack entirely.
- The site plan's survey extents sit between the golf course (N), Timber Ridge (S), and a wetland corridor (E) with steep slopes/view sheds on the western ridge (840'–900' contours) — the wooded ridge product and wetland boardwalk align with the "wooded/premium glamping sites" split.

### Lake Geneva micro-market (web research + Sage DB enrichment 2026-06-09)

Sage rows added/enriched in `all_glamping_properties` — export: [`lake-geneva-micro-market-2026-06-09.csv`](exports/lake-geneva-micro-market-2026-06-09.csv). Migration: `scripts/migrations/enrich-lake-geneva-micro-market-2026-06-09.sql`.

| Property | Distance | Product | Verified pricing | Signal |
| --- | --- | --- | --- | --- |
| **Camp Wandawega** (Elkhorn) | ~15 min | 11 vintage cabins/tents, seasonal, Airbnb-only, no amenities ("Manifesto of Low Expectations") | **$400–900/cabin/night**, 2-night min, books up to a year out | Direct proof of $400+ cabin demand in this micro-market — with zero resort amenities |
| **Sundara Inn & Spa** (Wisconsin Dells) | ~1.5 hr | Adults-only spa resort; suites + villas + new "Vanya" woodland units | Suites ~$529; villas $275–700 by season | Wellness-anchored WI lodging sustains the target band |
| **The Preserve at Williams Bay** | ~15 min | **Pipeline competitor**: 68-key eco-resort (lodge + detached 1–3BR cottages, 2 restaurants, spa, retreat center) on former George Williams College campus | Approved Feb 2026; construction 2026, target opening **2027** | First-mover window is real but closing; eco-resort positioning overlaps directly |
| **Glamping Loft Lake Geneva** | In town | 12 "stylish tent suites" group property on Booking.com | Group-stay pricing | Only nominal glamping supply in Lake Geneva proper |
| Lake Geneva cabin rentals (Tide & Timber, Lakewood Farms, vacation rentals) | Local | Standard cabins/vacation homes, no resort glamping | Varies | **No upscale hard-walled glamping resort exists in the Lake Geneva market today** |

### Validation of our database figures
| Our figure | External benchmark | Verdict |
| --- | --- | --- |
| Hipcamp cabin occupancy ~50% US / 55% Midwest (2025) | Cairn/MMCG 2025 industry reports: **50–65% annual** glamping occupancy; OHI Data Dig June 2025: glamping resorts ~51–56% | **Validated** — our figure sits at the conservative end, as expected for OTA-skewed data |
| High-month occupancy 80–85%, low-month ~25% | Industry seasonality: 70–90% summer peak, 15–35% off-season trough | **Validated** |
| Hipcamp cabin OTA ADR $176 / Sage cabin avg $160–250 | Cairn 2025 industry ADR $251 (all glamping); Sage published Q2-2025 blog: cabins avg ~$160/night | **Consistent** — cabin ADR sits below all-glamping ADR; our retail median ($250) brackets the industry figure |
| The Mohicans comp ADR $486 | Current listed entry rates ~$250–290/night (treehouses, Google Hotels/Glamping.com); large 4BR cabins (sleep 12–15) and wedding-priority weekends price higher | **Partially overstated** — our seasonal-average blends peak weekend + large-cabin rates; treat $486 as upper-bound, entry rates ~$250–290 |
| Treetop Villas at Mirror Lake $246 | Confirmed operating, Wisconsin Dells treehouse | Validated |

### Data gaps identified
1. ~~**Sage DB has only 4 published WI glamping properties and none in Walworth County**~~ — **Resolved 2026-06-09:** Camp Wandawega enriched (10 unit SKUs, `is_glamping_property=Yes`), Glamping Loft Lake Geneva added, Grand Geneva Resort Glamping + The Preserve at Williams Bay added as pipeline rows. Migration: `scripts/migrations/enrich-lake-geneva-micro-market-2026-06-09.sql`. Door County/Driftless operators remain a future enrichment pass.
2. ~~**The Preserve at Williams Bay** is not in the pipeline table~~ — **Resolved 2026-06-09** (68-key pipeline, `Proposed Development`, target 2027).
3. ~~The 36-unit program + waterpark/golf/ski/spa adjacency has **no true analog in the comp set**~~ — **Partially addressed 2026-06-09:** resort-adjacent comps added to Sage (`Sundara Inn & Spa` as Outdoor Boutique Hotel; `Timber Ridge Outpost`, `Pepin Forest Treehouse` as Glamping; `Lakewood Farms` as Outdoor Boutique Hotel event lodging). Export: [`midwest-resort-adjacent-comps-2026-06-09.csv`](exports/midwest-resort-adjacent-comps-2026-06-09.csv). Skamania Lodge remains the closest full-resort + glamping analog nationally. — the closest structural comparison is Skamania Lodge's treehouses (glamping bolted onto a full-amenity resort, $695 ADR), worth citing in the deck as the "resort-adjacent glamping" proof case.
4. Mohicans-style **wedding/event integration** (the site plan's amenity lawn) is a demand driver our rate data doesn't capture — Mohicans grosses $2,050–7,975 per wedding rental alongside lodging.

## 8. Summary for the client deck

1. **Cabins are the right anchor**: largest hard-walled inventory base, highest hard-walled ADR ($439 avg US), occupancy equal-or-better vs canvas, and full winter operability that captures the Midwest's December peaks (Hipcamp high-month data shows December as the top cabin month in OH, MN, WI, MO, IL, SD).
2. **Midwest cabins fill better than the US average** (54.7% vs 50.4% in 2025) at lower prevailing rates — demand is there; premium supply is not (~23 Midwest cabin listings priced $400–600).
3. **$400–600 is top-decile pricing for the region** — defensible only with the planned amenity stack (F&B, wellness, retail, activities) and design quality; underwriting should consider ~48–50% stabilized occupancy as the market base case, with upside from amenities/brand.
4. **Include the unique unit(s)**: +10–25% rate premium at equal occupancy, plus marketing halo.
5. **Safari tents as a test only**: lowest occupancy of any unit type and seasonal in this climate — consistent with the 1–2 unit pilot plan.
6. **A-frames are viable cabin variants**: thin premium-segment data, but Midwest occupancy (61%) is the strongest of any hard-walled type — a differentiated roofline at cabin economics.
7. **The micro-market validates the rate target**: Camp Wandawega — 15 minutes away, seasonal, amenity-free — already commands $400–900/cabin/night and books out a year ahead. A winterized, full-amenity product on the Grand Geneva campus targets the same demand with a structurally stronger offer.
8. **Move before 2027**: The Preserve at Williams Bay (68-key eco-resort with cottages, ~15 min away) is approved and targeting a 2027 opening — Phase 1 timing determines whether the project sets the market's price ceiling or competes against it.

---
*Generated 2026-06-09 from Supabase project `sage-outdoor-advisory` (`mdlniwrgrszdhzwxjdal`). Read-only analysis; no source data modified.*
