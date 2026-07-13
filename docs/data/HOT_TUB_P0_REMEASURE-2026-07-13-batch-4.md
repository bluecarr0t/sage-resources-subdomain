# Hot tub P0 remeasure — Manual No/Yes + Amenity Impact (2026-07-13 batch 4–5)

## Applied

| Batch | Migration | Updates |
|-------|-----------|--------:|
| 4 Manual No | `scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-4.sql` | 24 |
| 5 Manual Yes | `scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-5.sql` | 6 |

Script: `scripts/backfill-hot-tub-manual-no-yes-2026-07-13.ts`  
Audit: `scripts/.tmp-hot-tub-review/manual-hot-tub-pass-2026-07-13.csv`

### Manual No (Wave A)
Huttopia US (except Chaplain), Costanoa (+ shared `property_hot_tub` Yes), AutoCamp Russian River/Catskills, Collective Governors Island + Hill Country, Two Capes Mirror Cabin, Postcard Hocking Hills / Shenandoah North blanks.

### Manual Yes (Wave B)
- North Texas Jellystone Cabins (in-room Jacuzzi) — 122 units
- Paws Up Montana luxury cabins (private outdoor tubs) — 28 units
- Huttopia Paradise Springs Chaplain Cabin
- Bolt Farm Mirror Cabins (corrected prior `No` → `Yes`) — 5 units
- Tu Tu' Tun ÖÖD Glass Cabins (outdoor soaking tubs)
- Oakey Mountain Mirror Häus (outdoor bath)

East Zion Mirror House left `No` (shared resort hot tubs only).

## Coverage (rated US Glamping open private-commercial)

| Metric | After batch 3 | After Manual No/Yes |
|--------|--------------:|--------------------:|
| Full US explicit `unit_hot_tub` | ~61% | **~67%** unit-weighted |
| Safari/Cabin explicit | ~70% | **~80%** unit-weighted |
| Safari/Cabin blank units | — | **~700** |
| Rated units with `unit_hot_tub=Yes` | ~366 | **~492–501** |

Safari/Cabin ≥95% gate: **not met** (~80%). Remaining blanks are lower-weight long-tail after clearing high-weight brands.

## Amenity Impact — Unit Hot Tub

| Scope | unitsWith | avgWith | avgWithout | rateImpact |
|-------|----------:|--------:|-----------:|-----------:|
| National (all types) | ~501 | $383 | $329 | **+$53** |
| Safari Tent + Cabin | ~249 | $425 | $395 | **+$29** |

National premium recovered after growing the Yes sample (Jellystone + Paws Up + Bolt Farm Mirror). Overview now shows **Safari/Cabin within-type** for Unit Hot Tub (other amenities remain national).

## Overview code

- [`lib/fetch-glamping-amenity-impact.ts`](../lib/fetch-glamping-amenity-impact.ts) — Unit Hot Tub fold only for Safari Tent / Cabin
- [`lib/glamping-amenity-impact.ts`](../lib/glamping-amenity-impact.ts) — `isUnitHotTubOverviewUnitType`, key-scoped `foldAmenityImpactRow`
- Section footnote updated in `GlampingAmenityImpactSection.tsx`
