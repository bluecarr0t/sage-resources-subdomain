# Luxury private bathroom investigation — 2026-07-13

## Question

Why do some US Luxury Amenity Impact units show as “without” private bathroom when Luxury might imply ensuite?

## Answer

**Luxury tier ≠ always ensuite.** Several published Luxury properties intentionally use shared or semi-private baths. Others were mis-tagged.

### Real “No” (keep)

| Property | Units (approx) | Evidence |
| --- | ---: | --- |
| Camp Olowalu tentalows + group cabins | 27 | Private outdoor shower; toilets shared / his-hers separate from cabins |
| Treebones yurts (+ hut) | ~18 | Shared heated lodge restrooms; Autonomous Tent is the ensuite SKU |
| Zion Ponderosa glamping tents | 19 | Shared shower house |
| El Capitan safari tent + yurt | 2 | Shared bathhouse |
| Alpenglow view tents | 2 | Shared common baths |
| Westgate standard Glamping | 1 | Assigned bathhouse, not ensuite |

### Corrected to Yes (were No or blank)

| Property | Change |
| --- | --- |
| El Capitan Cabins / Cedar Cabin | No/blank → Yes |
| Lakedale Canvas Cottage | No → Yes |
| Sonoma Zipline treehouses | No → Yes (in-unit compost toilet) |
| Treebones Autonomous Tent | No/blank → Yes |
| Westgate Luxury Glamping | No → Yes |
| Glamping Collective, Onera, Borealis, Orca Island, Rimrock, Green O, Treehouse Utopia, Lost Horizon, Zion Tiny Home | blank → Yes |

## Applied

- Script: `scripts/backfill-luxury-private-bathroom-2026-07-13.ts`
- Migration: `scripts/migrations/backfill-luxury-private-bathroom-2026-07-13.sql`
- Cache: amenity impact `v6-luxury-private-bathroom`

## Remeasure (open rated US Luxury, unit-weighted)

| | Units | Avg ADR |
| --- | ---: | ---: |
| With private bath | **363** | **$668** |
| Without (real shared/semi-private) | **85** | **$371** |
| Impact (with − without) | | **+$297** |

Prior UI (~287 with @ $703, without @ $534, +$169) mixed high-ADR **blank** luxury SKUs into “without.” Filling those blanks to Yes and leaving true shared-bath inventory as No drops the without average (Zion/Olowalu/Treebones) and widens the measured ensuite premium.

Hard-refresh Amenity Impact after cache key `v6-luxury-private-bathroom`.
