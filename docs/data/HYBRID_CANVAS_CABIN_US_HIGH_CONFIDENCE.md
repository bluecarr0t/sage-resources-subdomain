# US hybrid canvas/cabin properties (high confidence)

Curated list of properties with explicit site naming or clear hybrid SKUs (canvas-on-platform / hard-sided luxury tent product). Sourced from `all_glamping_properties` (Sage Database).

**Canonical `unit_type`:** Prefer **`Canvas Cabin`** for hardwall+canvas hybrids (bath/porch modules + canvas envelope). Prefer **`Cabin Tent`** for portable soft-wall tent-cabin / tentalow products. Use **`Canvas Cottage`** when the operator labels the SKU as such. Do not park Canvas Cabin hybrids under Safari Tent or Cabin Tent.

**ADR:** Unit-weighted retail ADR (`rate_avg_retail_daily_rate` × `quantity_of_units`) across hybrid-classified rows only. Rows missing `quantity_of_units` count as 1 for weighting. Does not apply seasonal `rate_*` fields or IQR screening.

**Winter (cold climate):** Can the **hybrid canvas/cabin SKU** be operated in a **cold, freezing environment** (snow, sub-freezing nights)? Based on property websites and FAQs (researched 2026-06-01). “Cold-capable” means the product is heated/insulated and the property accepts winter bookings for that unit type—not merely that the brand has winter rates in Sage.

**As of:** 2026-06-01

| Property | State | Status | Hybrid units | ADR | Winter ops (canvas/cabin) | Heat / build (when open) | Sources |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| Backland | AZ | Open | 4 | $532 | **Yes — year-round** | Insulated nature suites; heat pump / automatic climate control; en-suite bath | [Lodging](https://www.travelbackland.com/luxury-tented-lodging) |
| AutoCamp Yosemite | CA | Open | 18 | $428 | **No — seasonal** (verify Luxury Tent window) | Luxury Tent + Classic Cabin Suite; climate control when operating | [Yosemite](https://autocamp.com/yosemite/) |
| Mendocino Grove | CA | Open | 71 | $309 | **No — ~May–Sep/Oct** | Heated mattress pads when open; closed Dec–Apr | [FAQ](https://mendocinogrove.com/faq) |
| Dunton River Camp | CO | Open | 8 | $2,241 | **No — Jun–mid-Oct** | Gas stove in tent when open; full en-suite | [FAQ](https://www.duntondestinations.com/river-camp/frequently-asked-questions/) |
| Camp Olowalu | HI | Open | 21 | $167 | N/A (tropical) | Tentalows; not a cold-climate use case | — |
| Bristol Cabins | ID | Open | 2 | $90 | **Likely yes — property year-round** | Historic cabins have heat; tent-cabins custom canvas—confirm winter tent booking | [Site](https://bristolcabins.org/) |
| Moose Creek Ranch | ID | Open | 5 | $182 | **No for glamping tents in winter** | Wood-sided “glamping cabins” have interior wood stove; **winter lodging page lists cabins/RV only**, not tent SKUs | [Winter](https://moosecreekranch.com/winter-accommodations/) |
| Terramor Outdoor Resort | ME | Open | 63 | $529 | **No — ~mid-May–mid-Oct** | Climate-controlled tents when open | [Bar Harbor](https://terramoroutdoorresort.com/our-locations/bar-harbor/) |
| Paws Up Montana | MT | Open | 36 | $1,425 | **No — mid-May–mid-Oct** | Ensuite tents: heat, heated floors when open; winter = homes/hauses | [Glamping](https://www.pawsup.com/glamping/) |
| The Ranch at Rock Creek | MT | Open | 8 | $4,326 | **Yes — year-round (2 SKUs)** | **Trapper & Sweet Grass:** in-floor hydronic heat + stove; Classic/Family canvas **spring–fall only** | [Winter glamping](https://theranchatrockcreek.com/winter-glamping-in-montana/) |
| Huttopia White Mountains | NH | Open | 92 | $262 | **No — ~May–Oct** | Trappeur: **wood stove**; Canadienne less heat—shoulder-season only | [Huttopia](https://americas.huttopia.com/en/site/white-mountains/) |
| Battenkill Glamping Resort | NY | Open | — | $175 | **No — May 1–Oct 31** | Duraflame electric “woodstove” + A/C when open | [FAQ](https://battenkillresort.com/faq/) |
| Camp Orenda | NY | **Closed** | 6 | $275 | Closed (permanent) | Was canvas cabin product | — |
| Firelight Camps | NY | Open | 14 | $310 | **No — seasonal (~May–Oct)** | **4 “electric” tents** with heaters; rest blankets/hand warmers only | [FAQ](https://firelightcamps.com/faq) |
| Valley Overlook | OH | Open | 16 | $117 | **No for canvas SKU** | Canvas cabin: **no HVAC**; 4-season **hard cabins** separate product | [Booking](https://booking.staylist.app/valleyoverlook/booking/details?category=2438) |
| Camp Dakota | OR | Open | 7 | $141 | **No — Apr–Sep only** | Cabin tents: **unheated**; yurts (not canvas) have wood stove year-round | [Cabin tents](https://www.campdakota.com/cabin-tent-rentals) |
| Cave Lakes Canyon | UT | Open | — | $220 | **Yes — year-round** | Canvas cabins: **HVAC**; winter guest reports | [Cabins](https://www.cavelakes.com/cabins) |
| ULUM Moab | UT | Open | 50 | $604 | **No — ~late Mar–late Oct** | Wood stove + heated mattress pads when open | [Accommodations](https://www.ulumresorts.com/moab/accommodations/) |
| Lakedale | WA | Open | 29 | $271 | **No — Apr–Oct glampground** | Canvas cabins: no electricity/heat; **yurts/cabins** for winter | [FAQ](https://www.lakedale.com/lakedale-faq/) |
| Mossquatch Resort | WA | Open | 11 | $265 | **Marginal — open year-round** | Off-grid; **propane fireplace + portable heaters**; damp Olympic winter | [Hipcamp listing](https://www.hipcamp.com/en-US/land/washington-mossquatch-resort-lz9hjj8v) |
| Washington Glamping | WA | Open | — | $226 | **No — seasonal (~Jun+)** | Electric fireplace when open; Leavenworth area | [Site](http://www.washingtonglamping.com/) |

## Winter summary (cold-environment operability)

| Tier | Count | Properties |
| --- | ---: | --- |
| **A — Cold-winter capable** (year-round or explicit winter canvas ops with real heat/HVAC) | 3–4 | **The Ranch at Rock Creek** (Trapper, Sweet Grass only), **Backland**, **Cave Lakes Canyon**; **Bristol** (confirm tent-cabin) |
| **B — Open in winter but weak for freezing canvas** (propane/off-grid, no HVAC) | 1 | **Mossquatch Resort** |
| **C — Heated canvas when open, but closed in winter** | 14 | Battenkill, Firelight, Huttopia WM, Terramor, Mendocino, Lakedale, Washington Glamping, Dunton, Paws Up, ULUM, Camp Dakota, Moose Creek (tents), AutoCamp (tent), Valley Overlook (canvas) |
| **N/A / closed** | 2 | Camp Olowalu (HI); Camp Orenda (closed) |

### Related portfolio brands (not in table above)

These hybrid operators are **seasonal in cold regions**—canvas SKUs are generally **not winter-operable** despite `rate_winter_*` sometimes being null in Sage:

- **Under Canvas** — All camps **closed in winter**; `operating_season_months` 4–8; no published winter retail (see `scripts/migrations/under-canvas-operating-season-months.sql`).
- **Collective Retreats** — **May–October** (e.g. Governors Island); Tiny Cabin / Summit / Journey+ not winter products in NYC/CO/TX.
- **Open Sky** — Utah desert; **safari canvas with en-suite** when open; verify current season window on [stayopensky.com](https://www.stayopensky.com/) (high desert can freeze at night but product is built for comfort when operating).

### Database vs reality gaps to fix

| Property | Sage `operating_season_months` | Web-verified canvas season |
| --- | --- | --- |
| Battenkill | 12 | May–Oct |
| Firelight Camps | 12 | Seasonal (~May–Oct) |
| Camp Dakota | 6 / “year-round” copy in description | Cabin tents Apr–Sep only |
| Dunton River Camp | 12 | Jun–mid-Oct |
| AutoCamp Yosemite | 12 | Confirm Luxury Tent season |

Suggested new fields: `canvas_winter_operable` (yes/no/marginal), `winter_heat_type`, `season_open` / `season_close` verified date.

## Reproduce

- ADR cohort: `queries/hybrid_canvas_cabin_us_high_confidence_adr.sql`
- Season fields: `operating_season_months`, `season_open_month`, `season_close_month` on `all_glamping_properties`
