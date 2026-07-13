# Rustic amenity backfill — 2026-07-13

## Scope

US published open rustic (`glamping_service_tier = 'rustic'`) commercial glamping rows in Amenity Impact cohort (~295 units / 93 rows).

Fields: `unit_private_bathroom`, `property_hot_tub`, `property_food_on_site`, `property_restaurant`.

## Applied

- Script: `scripts/backfill-rustic-amenities-2026-07-13.ts`
- Migration: `scripts/migrations/backfill-rustic-amenities-2026-07-13.sql`
- Audit: `scripts/.tmp-rustic-amenity-review/rustic-amenities-2026-07-13.csv`
- Cache bump: amenity impact `v5-rustic-amenity-backfill`

### High-confidence Yes (examples)

| Amenity | Properties |
| --- | --- |
| Private bathroom | Shady Dell (~9u), Silver Bullet (~10u), Pitch Yellowstone (1), Tarantula Bottling Room (1) |
| Food on site | Tarantula (mini-mart), Paddler’s Village (store), Doe Bay, Downata, Wolfe’s Neck farm store, Sou’wester market |
| Restaurant | Shady Dell Dot’s Diner (corrected No→Yes), Doe Bay Café, Downata poolside restaurant |

### Brand Manual No (shared bath / self-cater)

Wander Camp, Timberline Glamping (all locations), Tarantula non-ensuite sites, Boonies Farm (washrooms / brewery not open), most other shared-bath rustic tents.

## Remeasure — US Rustic Amenity Impact (unit-weighted)

Floor: impact shown at ≥30 with-units; provisional at 15–29; dash below 15.

| Amenity | With units | Avg with | Without units | Avg without | Impact |
| --- | ---: | ---: | ---: | ---: | --- |
| Private Bathroom | 21 | $113 | 274 | $103 | **~+$10** (provisional) |
| Property Hot Tub | 4 | $139 | 291 | $103 | **—** (thin) |
| Food On Site | 79 | $110 | 216 | $102 | **+$8** |
| Restaurant | 15 | $111 | 280 | $104 | **~+$7** (provisional) |

Hard refresh Amenity Impact after cache key `v5-rustic-amenity-backfill`.

## Still blank (low weight; needs site-level research)

Cozy Heron, Glacier View Adventures, Gunnison Glamping Wagons, Key Largo Kampground, Lake Cumberland Glamping, Norwegian Wood Ranch, River Dance Lodge, Roadhouse Ranch & Camp, Somerset Resort, The Eagle’s Nest, Arcady bathroom (food/restaurant filled), Sou’wester bathroom (mixed trailer inventory), Turner Falls food.

Property Hot Tub remains thin on Rustic by design (most brands have none).
