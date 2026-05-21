# East Zion Resort — lodging / site research (May 2026)

**Sources:** [eastzionresort.com/lodging](https://www.eastzionresort.com/lodging), category pages, [Guesty booker](https://reservationseastzionresort.guestybookings.com/properties) (57 listings).

## Campuses

| Campus | Address | Product lines |
|--------|---------|---------------|
| **The Hillside** | 490 E State St, Orderville UT 84758 | Yurts, Glamping Tents, Mirror Houses, Modern Cabins, Treetop Cabins, Airstreams, Stargazer Cabins |
| **The Escape** | 125 S Center St, Orderville UT | Tiny Homes, The Original Treehouse |
| **Lodge / Cliffs** | 708 Red Rock Dr / Red Rock Dr | The Lodge (+ adjacent Farmhouse Suite), Zion Cliffs Cabin |

## Lodging menu (category site names)

From `/lodging` and nav — use these as **DB `site_name` categories** (Capella/Sal Salis pattern):

1. **Glamping Tent** — 10 units: #1–#10 ([glamping-tents](https://www.eastzionresort.com/glamping-tents))
2. **Yurt** — 10 units: #1–#10 ([yurts](https://www.eastzionresort.com/yurts))
3. **Stargazer Cabin** — named units: Hidden Abode, Star Gazer, Red Hollow, Wild Sage (+ Valley View listed on stargazer page; also a modern cabin on Guesty)
4. **Mirror House** — Mirror Mountain, Mirror Zion, Mirror Overlook ([mirror-house-rentals](https://www.eastzionresort.com/mirror-house-rentals))
5. **Treetop Cabin** — 10 units: #1–#10 ([treetop-cabins](https://www.eastzionresort.com/treetop-cabins))
6. **Airstream** — Airstream Dream, Adventure, Legacy, Canyon, Landing ([airstream-camping](https://www.eastzionresort.com/airstream-camping))
7. **Modern Cabin** — Iron Cliff, Blackstone, Desert Sand, Mountain View ([zion-cabins](https://www.eastzionresort.com/zion-cabins))
8. **Tiny Home** — #1–#6 ([tiny-houses5-6](https://www.eastzionresort.com/tiny-houses5-6))
9. **The Original Treehouse** — single unit ([treehouse](https://www.eastzionresort.com/treehouse))
10. **Zion Cliffs Cabin** — historic log cabin ([family-rentals](https://www.eastzionresort.com/family-rentals))
11. **The Lodge** — sleeps up to 36 + Farmhouse Suite, 708 Red Rock Dr ([lodge](https://www.eastzionresort.com/lodge))

**Guesty** lists **57** bookable properties (marketing titles; many map 1:1 to named units above). Sample from-rates (May 2026): Airstreams ~$89–94/night, Glamping-adjacent cabins ~$106–159, Mirror ~$133–153, Lodge ~$549/night.

## Resort amenities (lodging page)

2 pools, lazy river, kiddie pool, 3 hot tubs, pickleball, via ferrata, ROAM/FareHarbor tours, 73-acre event venue, Wi‑Fi, A/C, grills, firepits, stargazing.

## DB plan

- Anchor **12182**: `site_name` **Glamping Tent** (was Safari Tent)
- **12183**: keep **Yurt**, unify `property_id`
- Insert 9 sibling category rows; `property_total_sites` = 57; `url` = lodging + Guesty
