# Month-by-month comps workbook reference

Canonical file: `Data — Sparta TN 38583 RV Comps — 2025 Month by Month.xlsx`.

## Sheet order (must match)

| # | Sheet | Contents |
| --- | --- | --- |
| 1 | Comp Set Monthly | Three labeled sets via `comp_set`. Sorted A–Z by `property_name`, then year, month. Occupancy, ADR, rebuilt RevPAR (`occ × median / 100`), min/max, site count, `distance_miles`. Color scales on rates and occupancy. |
| 2 | Destination Parks | Elm Hill and Watts Bar full-park RV. Not in MARKET AVERAGE. |
| 3–6 | Comp Rate/Occupancy 2025–2026 | Heatmaps from the primary three sets (one row per park). |
| 7–10 | Market Rate/Occupancy 2025–2026 | Heatmaps from 100-mile RV. Column B = `distance_in_miles`. |
| 11 | Bell Tent Comps | Hipcamp bell / safari / canvas tent property-months. |
| 12 | `Market Monthly {N}mi` | Campspot **RV only** in the radius. Immediately left of Notes. |
| 13 | Notes | Includes the OTA occupancy footnote. |

Do not add Season Summary Mar-Nov, Comp Set Sites 2025, or Market Sites 2025 {N}mi. Do not add a Hipcamp+Campspot long-form first tab. Do not emit live Excel pivots named `2025` / `2026`.

## Occupancy definition (footnote every file)

Campspot occupancy is **OTA reservation occupancy**: reserved Campspot nights ÷ available Campspot nights for the filtered sites. It is not occupied sites ÷ total park sites, and it is not STR/census occupancy. Parks with annuals, drive-up, or other OTAs will look emptier than they are.

## Sparta labeled sets

Classify from **listed RV inventory** (sitedetails), not only sites present in 2025 monthly analytics. Park size = RV site count. FHU count = sites with water + sewer + 30A/50A (or `amenity_full_hookup`).

| `comp_set` | Rule |
| --- | --- |
| Local 0-25mi RV | ≤25 miles, 15–80 RV sites, drop mobile-home parks, drop destination parks, **and** require waterfront views or property access |
| Waterfront SKUs | Site **name** matches waterfront / lakefront / on-river / lake-river-creek view or access. Exclude Non-Waterfront, inland, van/tent-only (unless the name also has RV). Destination parks stay in the appendix even if they have waterfront SKUs. |
| 25-80 site FHU | 25–80 FHU RV sites in the radius at waterfront-access parks. Drop Elm Hill / Watts Bar and inland FHU analogs. Full Throttle may appear as a row if it has waterfront access. |
| Destination appendix | Name matches Elm Hill or Watts Bar. Full-park RV on Destination Parks only. |

**Waterfront access** (required for Local and FHU; implied for Waterfront SKUs): Campspot property `Waterfront` or `Beach` on `core_amenities` / `basic_amenities`, **or** any listed RV site name matching the view/access pattern above. Do not use `Waterpark`. Do not use generic `--amenity waterfront` as this gate.

Keep Full Throttle out of any average until it has a full March–November (9 months with occ > 5%). Exclude it by name even if 2026 has ≥6 open months.

Park sizing uses listed inventory so a 23-site park is not dropped just because 2025 analytics show fewer sites.

## RevPAR and averages

- Rebuild RevPAR as occupancy × median rate / 100 after rate blanking. Do not use warehouse `revpar`.
- A park needs ≥6 months with occupancy > 5% to enter MARKET AVERAGE.
- Destination parks and Full Throttle are excluded from every average.

## Heatmaps

Two pairs:

- **Comp** = primary three sets, one row per park (if a park is in more than one set, keep Local, then FHU, then Waterfront).
- **Market** = 100-mile RV, including destination parks.

Row = `property_name`, then `distance_in_miles`, then month columns. Last row `Grand Total` (distance blank).

- Occupancy A1: `AVERAGE of avg_occupancy_rate_pct`
- Rate A1: `AVERAGE of median_retail_daily_rate`
- A2 `property_name`, B2 `distance_in_miles`, C2+ month headers `JAN`–`DEC` (not 1–12). C1 = `month`
- Occupancy CF: formula 0 / percentile 50 / formula 100 on **month values only** (`C3:…`)
- Rate CF: min / percentile 50 / max, same colors
- Colors: `#CC4125` / `#FFFFFF` / `#6AA84F`
- 12-month sheets use `sqref="C3:Z1000"`; partial years use `C3:{lastCol}1000`
- Gridlines off; freeze property_name + distance; column A width 28.75
- Tab order is **Rate years, then Occupancy years** (not Occupancy first)

## Hipcamp bell tents

Include SKUs whose category or name is bell-tent, safari tent, or canvas tent. Do not treat generic `tents` / `rv-tent` as bell-tent comps. Do not analog bell-tent ADR from RV ADR.

## Amenity filter semantics (generic CLI)

Filters apply to **sites**, then property-month occupancy and ADR are re-aggregated from those sites only.

Campspot match: parent `sitedetails.amenities` object keys OR `propertydetails.core_amenities` / `basic_amenities` arrays (there is no `propertydetails.amenities` column). Wi-Fi aliases include `Internet Access`.

| User phrase | `--amenity` / `--unit-type` | Campspot keys |
| --- | --- | --- |
| hot tubs only | `--amenity hot-tub` | Hot Tub, Hot tub, Private Hot Tub |
| Wi-Fi | `--amenity wifi` | Wi-Fi, Internet Access |
| waterfront | `--amenity waterfront` | Waterfront (generic CLI only; Sparta Comp parks use park Waterfront/Beach amenities plus view/access SKU names) |
| pool | `--amenity pool` | Pool |
| pets | `--amenity pets` | Pets |
| RV only | `--unit-type rv` | category ILIKE `%rv%` |
| 50A FHU | `--amenity 50-amp --amenity full-hookup` | 50-Amp + Water Hook-Up |

Unknown token: query distinct keys, then pass the literal warehouse label.

```sql
SELECT key, count(*)
FROM campspot.sitedetails sd,
LATERAL jsonb_object_keys(sd.amenities::jsonb) AS key
WHERE key ILIKE '%tub%'
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

## Rate blanking

Blank median/mean/min/max when occupancy ≤ 5% (unless ≥ 5 sites still have a non-placeholder rate) and always blank `$1011.50`, `$1026.67`, `$705.06`.

## Sparta export

```bash
npx tsx scripts/export-campspot-sparta-tn-38583-100mi.ts
```

Center: `35.9259, -85.4641`, zip `38583`, 100 miles.

## Old 34205 occupancy-only file

The previous skill output was a long-form Hipcamp+Campspot sheet plus Occupancy/Rate tabs (`{stem} Occupancy.xlsx`). That is **not** the deliverable anymore. `writeOccupancyRateXlsx` remains only as a heatmap helper used by the comps writer.
