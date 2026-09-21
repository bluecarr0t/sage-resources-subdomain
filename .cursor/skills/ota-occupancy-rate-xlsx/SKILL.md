---
name: ota-occupancy-rate-xlsx
description: >-
  Builds the Sage month-by-month RV comps workbook matching Data — Sparta TN
  38583 RV Comps — 2025 Month by Month.xlsx: three labeled Campspot sets
  (local 0–25 mi RV, waterfront SKUs, 25–80 site FHU), destination appendix,
  Comp vs Market heatmaps, Hipcamp bell-tent comps, Market Monthly, Notes.
  Use when the user asks for an occupancy xlsx, rate heatmap, 34205-style
  occupancy file, comps occupancy by zip, monthly Campspot occupancy by radius,
  or a month-by-month RV comps workbook.
---

# Month-by-month Campspot comps workbook

Produce the same workbook as `Data — Sparta TN 38583 RV Comps — 2025 Month by Month.xlsx`. Do not rebuild Excel XML by hand. Do not emit the older 34205 long-form occupancy file.

**Do not emit** these tabs (removed from the canonical file): Season Summary Mar-Nov, Comp Set Sites 2025, Market Sites 2025 {N}mi.

Required inputs (ask only for what is missing):

1. **Location** — US zip, or city + state (include both zip and city/state when known)
2. **Range** — radius in miles
3. **Additional info** — optional. Examples: RV only, Wi-Fi, waterfront, hot tubs only

Defaults: years `2025,2026`; Campspot RV for market sheets; season March–November. Sparta’s Comp Set is three labeled groups of **waterfront-access** parks, not a named park list. Heatmaps are two pairs: Comp (primary sets) and Market (100-mile RV).

## Run this command

Sparta / 38583 (canonical layout):

```bash
npx tsx scripts/export-campspot-sparta-tn-38583-100mi.ts
```

Generic radius + amenity filter (omits Destination Parks and Bell Tent Comps unless those arrays are passed):

```bash
npx tsx scripts/build-ota-occupancy-rate-xlsx.ts --zip 38583 --city Sparta --state TN --radius 100 --unit-type rv --amenity wifi
npx tsx scripts/build-ota-occupancy-rate-xlsx.ts --zip 34205 --radius 50 --unit-type rv --amenity hot-tub
```

Write to `~/Downloads/Data — {City} {ST} {zip} [RV ]Comps — 2025 Month by Month.xlsx` and `reports/`.

Do not open a one-off SQL dump unless the CLI fails or the amenity token is unknown.

## Quality bar (must all pass)

Copy this checklist and complete it before handing the file over:

```
- [ ] Filename is Data — {City} {ST} {zip} [RV ]Comps — 2025 Month by Month.xlsx
- [ ] Sheet order: Comp Set Monthly, Destination Parks, Comp Rate 2025, Comp Rate 2026, Comp Occupancy 2025, Comp Occupancy 2026, Market Rate 2025, Market Rate 2026, Market Occupancy 2025, Market Occupancy 2026, Bell Tent Comps, Market Monthly {N}mi, Notes (each name ≤ 31 characters)
- [ ] No Season Summary, Comp Set Sites, or Market Sites tabs
- [ ] Comp Set Monthly is three labeled sets via comp_set: Local 0-25mi RV, Waterfront SKUs, 25-80 site FHU. Sorted A–Z by property_name (then year, month)
- [ ] Every Comp Set park has waterfront views or property access (Campspot Waterfront or Beach amenity, or a view/access SKU name). Inland FHU analogs are excluded. Do not treat Waterpark as waterfront
- [ ] Watts Bar and Elm Hill are only on Destination Parks (and in 100-mile RV). They are not on Comp Set Monthly and not in any MARKET AVERAGE
- [ ] Comp Set Monthly columns match COMPS_PROPERTY_COLUMNS (includes comp_set and distance_miles)
- [ ] Market Monthly is Campspot RV only, immediately left of Notes
- [ ] RevPAR is occupancy × median rate / 100 after rate blanking (warehouse revpar unused)
- [ ] Parks need ≥6 months with occupancy > 5% to enter a set average. Full Throttle is a row, never in an average, until it has a full March–November
- [ ] Occupancy color scale: formula 0 / percentile 50 / formula 100, colors #CC4125 / #FFFFFF / #6AA84F
- [ ] Rate color scale: min / percentile 50 / max, same three colors (never 0–100)
- [ ] Comp Set Monthly color-scales median_retail_daily_rate, mean_retail_daily_rate, and avg_occupancy_rate_pct with those same rules
- [ ] Comp heatmaps = primary three sets (one row per park). Market heatmaps = 100-mile RV. Column B is distance_in_miles; JAN–DEC; Rate tabs before Occupancy; Grand Total is unweighted property mean
- [ ] Gridlines off on heatmap tabs; column A ≈ 28.75; color scale starts at C (not distance)
- [ ] Bell Tent Comps are Hipcamp bell / safari / canvas SKUs only. Do not analog them from RV ADR
- [ ] Notes include the OTA occupancy footnote
- [ ] Placeholder rates $1011.50 / $1026.67 / $705.06 stay blank
- [ ] File copied to Downloads; parks in each labeled set reported
```

## Extra filters

Map phrases to CLI flags. Known amenity tokens: `hot-tub`, `wifi`, `waterfront`, `pool`, `pets`, `full-hookup`, `50-amp`, `private-bathroom`. Unit types: `rv`, `tent`, `lodging`, or a warehouse category substring.

`--property-name "Elm Hill RV Resort"` keeps the generic Comp Set Monthly to named parks (ILIKE). `--name-city "Mountaineer Campground|Townsend"` adds a name+city match. Do not use that named-list path for Sparta.

If the user names an amenity that is not in that list, look up warehouse keys (see [reference.md](reference.md)) and pass the literal label as `--amenity "Hot Tub"`.

## After the CLI

1. Confirm the Downloads path exists and the 13 tabs above are present.
2. If occupancy 2026 has fewer months than 2025, that is expected (partial year).
3. Tell the user the file path, the parks in each labeled set, and that Campspot occupancy is OTA reservation occupancy, not park occupancy. Do not treat the file as feasibility-study ready.

## Implementation map

- Sparta three-set export: `scripts/export-campspot-sparta-tn-38583-100mi.ts`
- Generic builder: `scripts/build-ota-occupancy-rate-xlsx.ts`
- Set classifiers: `lib/ota-comps-set-rules.ts` / `lib/ota-sparta-comp-sets.ts`
- Campspot pull: `lib/ota-campspot-month-by-month-export.ts`
- Workbook layout: `lib/ota-comps-month-by-month-xlsx.ts`
- Heatmap color scale: `lib/ota-occupancy-rate-xlsx.ts`
- Amenity aliases: `lib/ota-occupancy-amenity-aliases.ts`
- Layout and set rules: [reference.md](reference.md)
