# Comfort (midscale) amenity research plan — 2026-07-13

## Problem

On **US · Comfort** Amenity Impact, all four cards show **Inconclusive** because observational deltas are non-positive (`with − without ≤ 0`):

| Amenity | UI with units | Without ADR | With ADR |
| --- | ---: | ---: | ---: |
| Private Bathroom | ~2,426 | $242 | $226 |
| Property Hot Tub | ~639 | $236 | $218 |
| Food On Site | ~1,392 | $252 | $192 |
| Restaurant | ~172 | $233 | $223 |

Blanks count as **without**. High-ADR Comfort inventory with blank flags inflates the without side and can flip or mute true premiums.

## Cohort

- Filter: `glamping_service_tier = 'midscale'` (UI label **Comfort**)
- Same Amenity Impact universe: published US commercial open glamping, comparable ARDR (excludes all-inclusive)

### Current tag coverage (open rated units)

| Field | Yes units (ADR) | No units (ADR) | Blank units (ADR) |
| --- | ---: | ---: | ---: |
| `unit_private_bathroom` | 2,373 ($222) | 929 ($211) | **1,016 ($260)** |
| `property_hot_tub` | 593 ($218) | 478 ($237) | **3,247 ($229)** |
| `property_food_on_site` | 1,548 ($182) | 678 ($259) | **2,092 ($253)** |
| `property_restaurant` | 164 ($239) | 1,872 ($215) | **2,282 ($239)** |

**Takeaway:** Bathroom Yes is already majority, but **~1k blank units @ $260 ADR** sit in without and help drive the bathroom inconclusive. Hot tub / food / restaurant blanks dominate the cohort.

## Research goals

1. Fill **blank → Yes/No** for the four Amenity Impact fields (do not invent Yes).
2. Prefer **brand-standard Manual No/Yes** for multi-site operators (Postcard, AutoCamp, Huttopia, Jellystone).
3. Remeasure Comfort Amenity Impact after each priority tranche; expect some cards to leave Inconclusive when mix still confounds.

## Target amenities (same as overview)

| Key | Label | Research cue |
| --- | --- | --- |
| `unit_private_bathroom` | Private Bathroom | Ensuite / in-unit toilet+shower vs bathhouse |
| `property_hot_tub` | Property Hot Tub | Shared spa / communal hot tub (not unit-private only) |
| `property_food_on_site` | Food On Site | Market, café, packaged meals, grocery on property |
| `property_restaurant` | Restaurant | Full-service / dedicated restaurant on site |

## Priority queue (blank unit weight)

Work top-down by blank weight × ADR leverage.

### P0 — Brand / high blank weight (do first)

| Property | Units | ADR | Blanks | Likely research path |
| --- | ---: | ---: | --- | --- |
| AutoCamp Hill Country | 120 | $264 | all four | Brand: ensuite Airstreams/tents → bath **Yes**; food/restaurant/hot tub from brand FAQ |
| Roamstead | 191 | $87 | hot tub, restaurant | Confirm communal amenities; food already tagged |
| Huttopia White Mountains | 96 | $264 | hot tub, food, restaurant | Huttopia brand standards (often café/market) |
| North Texas Jellystone | 136 | $229 | food, restaurant (+ some HT) | Park amenities / dining |
| SKYE Texas Hill Country | 60 | $253 | mostly all four | Resort site pages |
| AutoCamp Asheville | 72 | $284 | hot tub/food/restaurant (+5 bath) | Same as AutoCamp brand |
| Postcard Cabins (Dale Hollow, Big Bear, The Thumb, Brown County, …) | 40–90 ea | varies | mix; often HT blank | Brand: private bath typical **Yes**; food/restaurant usually **No**; hot tub site-specific |
| Zion Wildflower | 75 | $187 | food, restaurant | Dining flags |
| ULUM Moab | 50 | $604 | HT, food, restaurant | High ADR — blank-as-without is especially distorting |
| Collective Retreats Governors Island | 29 | $532 | all four | High ADR blank cluster |
| Hinata Mountainside | 32 | $424 | bath/food/restaurant | High ADR |
| Naturluxe & Stars | 27 | $558 | HT/food/restaurant | High ADR |
| Glamping Loft Lake Geneva | 12 | $738 | all four | High ADR micro-sample |

### P1 — Mid weight / brand finish

- The Vintages Trailer Resort, Two Capes Lookout, Lost Lake Resort, The River Electric, Long Cove Resort, WeeCasa, Eastwind Oliverea Valley, The Woods Luxury Camping
- Mendocino Grove (hot tub blanks only — 71u)
- Remaining Postcard locations with hot-tub-only blanks (Eastern Catskills, Kettle River, Brazos Valley, Ozark Highlands, Shenandoah, …)
- Wander Camp Yellowstone (HT blanks — align with prior Wander Camp rustic rules if same brand)

### P2 — Long tail

Remaining Comfort rows with any blank among the four fields after P0–P1 (~hundreds of low-unit properties). Batch by state or brand when possible.

## Method (same as Rustic / Luxury bathroom passes)

1. **Export queue** — Comfort midscale US open rated rows where any of the four fields is blank; sort by blank unit weight.
2. **Brand rules first** — AutoCamp, Postcard Cabins, Huttopia, Jellystone, Wander Camp: write property-name regex patches with evidence URLs (FAQ / lodging pages).
3. **Site-level overrides** — High-ADR uniques (ULUM, Collective Governors Island, Hinata, Naturluxe, Glamping Loft).
4. **Apply** — Script patterned on `scripts/backfill-rustic-amenities-2026-07-13.ts` / luxury bathroom script:
   - Fill blanks only (overwrite only with explicit `allowOverwrite` + evidence)
   - Append notes + `discovery_source` tag e.g. `manual_comfort_amenities_2026_07_13`
   - Emit SQL migration + CSV audit
5. **Remeasure** — Comfort Amenity Impact with/without ADR and impact cards; bump amenity-impact cache key.
6. **Stop inventing Yes** — Shared bathhouse → bathroom **No**; no dining → food/restaurant **No**. Inconclusive may remain if true mix still has cheaper “with” inventory.

## Why Inconclusive may persist even after fills

- Comfort **food Yes** already averages **$182** vs food No **$259** — branded food-on-site inventory is cheaper on average (observational). Filling blanks to Yes on high-ADR properties helps; filling blanks to No on high-ADR properties keeps them in without and can **worsen** food’s negative delta.
- Priority for food/restaurant: accurately move **high-ADR blanks that truly have food/restaurant** into Yes; accurately tag **high-ADR blanks without dining** as No (honest, but won’t create a +premium by itself).
- Bathroom: high-ADR blanks @ $260 are the main lever — many AutoCamp / Collective / Hinata style units should be **Yes**.

## Success criteria

| Milestone | Done when |
| --- | --- |
| P0 complete | AutoCamp, Huttopia WM, Jellystone NT, SKYE, major Postcard blanks, ULUM, Collective GI tagged |
| Coverage | Bathroom blank units &lt; ~300; food/restaurant/HT blank units cut ≥50% from baseline |
| Product | At least bathroom (and ideally 1+ other) Comfort card leaves Inconclusive **or** documented as true mix confound with evidence |
| Audit | Migration + CSV + short remeasure note under `docs/data/` |

## Out of scope

- Changing Inconclusive UX rules
- Canada Comfort
- Upscale / Luxury / Rustic (already partially backfilled)
- Unit hot tub (not on Amenity Impact card set)

## Deliverables

- `scripts/backfill-comfort-amenities-YYYY-MM-DD.ts`
- `scripts/migrations/backfill-comfort-amenities-YYYY-MM-DD.sql`
- `docs/data/COMFORT_AMENITY_BACKFILL-YYYY-MM-DD.md` (remeasure table)
- Audit CSV under `scripts/.tmp-comfort-amenity-review/`
