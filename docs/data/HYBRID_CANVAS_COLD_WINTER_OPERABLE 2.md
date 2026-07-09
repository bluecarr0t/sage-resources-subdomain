# Cold-winter operable hybrid canvas/cabin properties (US)

Tier **A** cohort: properties where **hybrid canvas/cabin units can operate in a cold, freezing environment** (heated/insulated product + winter bookings for that SKU). Researched 2026-06-01; Sage Database snapshot 2026-06-01.

| Property | City, state | Winter-operable SKU(s) | Units (est.) | ADR (USD)¹ | Winter rate (wd / we)² | Season (canvas SKU) | Heat / envelope | URL |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| **The Ranch at Rock Creek** | Philipsburg, MT | **Trapper Cabin**; **Sweet Grass Cabin** (canvas–wood–stone hybrids) | 1 + 1 (property total ~2 winter canvas cabins) | —³ | $4,428 / $4,428³ | **Year-round** (these two SKUs only) | In-floor **hydronic heat**; gas or wood stove; en-suite bath; cedar soaking tub | [Winter glamping](https://theranchatrockcreek.com/winter-glamping-in-montana/) · [Glamping](https://theranchatrockcreek.com/accommodation/glamping/) |
| **Backland** | Williams, AZ | **Nature suites** (all canvas hybrid SKUs at property): Backland Suite; Sky Suite; Grand Suite; Grand Sky Suite ADA | 4 (1 per SKU) | **$532** weighted⁴ | $425–520 / $500–585 (by SKU) | **Year-round** | Insulated tents; **heat-pump / automatic climate control**; en-suite bath; ~7,000 ft plateau—expect freezing nights | [Luxury tents](https://www.travelbackland.com/luxury-tented-lodging) |
| **Cave Lakes Canyon** | Kanab, UT | **Canvas Cabin** (waterfront canvas cabin w/ full bath) | —⁵ | **$220** | $220 / $220 | **Year-round** | **HVAC** (heat + A/C); full bathroom; private fire pit; high-desert winter freezes | [Cabins](https://www.cavelakes.com/cabins) · [Resort](https://www.cavelakes.com/) |

¹ Unit-weighted mean of `rate_avg_retail_daily_rate` on listed Sage rows where applicable. Rock Creek winter canvas is **all-inclusive** resort pricing—not comparable to standalone nightly ADR at Battenkill-scale properties.

² From `rate_winter_weekday` / `rate_winter_weekend` on `all_glamping_properties` where populated.

³ Sage has **Classic Canvas Cabin** and **Family Canvas Cabin** (4 units each, ~$4,326–4,428 ADR, winter rates populated)—brand site states those are **spring–fall only**; **Trapper** and **Sweet Grass** are the **year-round** winter canvas SKUs and are **not broken out as separate rows** in Sage yet.

⁴ Backland: (501 + 540 + 531 + 556) / 4 ≈ $532 at qty 1 each.

⁵ `quantity_of_units` null on Canvas Cabin row; property also has **Waterfront Tent** (Safari Tent, ~$173 ADR)—**excluded** from this cohort (not the canvas-cabin hybrid SKU).

---

## Sage row IDs (for data work)

| Property | `id` | `site_name` in Sage | Notes |
| --- | ---: | --- | --- |
| The Ranch at Rock Creek | 10171 | Family Canvas Cabin | Map to **Sweet Grass** or seasonal SKU—verify |
| The Ranch at Rock Creek | 10172 | Classic Canvas Cabin | Map to **Trapper** or seasonal SKU—verify |
| Backland | 9932–9935 | Backland / Sky / Grand / Grand Sky Suite ADA | Aligned with winter-operable product |
| Cave Lakes Canyon | 9604 | Canvas Cabin | Aligned; update URL to `https://www.cavelakes.com/` |
| Cave Lakes Canyon | 9605 | Waterfront Tent | Not in cold-winter canvas cohort |

---

## Excluded at same properties (not winter canvas)

| Property | SKU | Why excluded |
| --- | --- | --- |
| The Ranch at Rock Creek | Classic Canvas Cabin; Family Canvas Cabin | Open **spring–fall only** per [glamping page](https://theranchatrockcreek.com/accommodation/glamping/) |
| Cave Lakes Canyon | Waterfront Tent | Safari tent product, not canvas-cabin hybrid |

---

## Suggested data fixes

1. Add Sage unit lines for **Trapper Cabin** and **Sweet Grass Cabin** (or relabel 10171/10172 with correct `site_name` + `operating_season_months`).
2. Set **Classic / Family Canvas Cabin** `operating_season_months` to seasonal (not 12).
3. Cave Lakes: fix `url` to `https://www.cavelakes.com/`; populate `quantity_of_units` on Canvas Cabin.
