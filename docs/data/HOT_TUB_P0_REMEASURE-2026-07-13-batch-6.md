# Hot tub P0 remeasure — text/web Yes batch 6 (2026-07-13)

## Applied

| Batch | Migration | Updates |
|-------|-----------|--------:|
| 6 Manual Yes | `scripts/migrations/backfill-hot-tub-unit-p0-2026-07-13-batch-6.sql` | 9 |

Script: `scripts/backfill-hot-tub-batch-6-text-yes-2026-07-13.ts`  
Audit: `scripts/.tmp-hot-tub-review/manual-hot-tub-batch6-2026-07-13.csv`

### Manual Yes (site_name / description + web verify)

| id | Property / site | Prior | Notes |
|----|-----------------|-------|-------|
| 88, 10269 | Sinya on Lone Man Creek | blank | Private cowboy/jacuzzi deck tub |
| 10282 | Open Sky Star Seeker | No → Yes | Ensuite copper soaking tub |
| 9800, 9801 | Stay Nantahala Tranquil Haven / Creekside Cove yurts | No → Yes | Site titles “w/ Hot Tub”; FAQ each yurt |
| 10886 | Onera Wimberley Treehouse | No → Yes | Each Spyglass/Greenhouse private cedar tub |
| 11591 | Boonies Farm Domes | blank | Private wood-fired hot tubs |
| 10346 | Glamping Collective Ultra Luxe Dome | No → Yes | Private deck tub (sibling Accessible already Yes) |
| 10344 | Asheville Glamping Mountain View Dome | No → Yes | Description + Luxe Dome product line |

### Explicitly not Yes

- Stay Nantahala MoonShadow / Cozy cabins — aggregated cabin SKUs; not every cabin has a private tub
- Open Sky Milky Way / Desert Rose / Juniper — no private tub on accommodations page
- Zion White Bison / East Zion / Terramor — shared resort spas only
- Loving Heart Safari tents — clawfoot bath, not outdoor hot tub

## Firecrawl dry-run (same day)

15 Safari/Cabin blank properties → **0** high-confidence Yes applies (scrape succeeded but no private-tub evidence). Text mining remains the faster Yes path for this pass.

## Amenity Impact — Unit Hot Tub (US, Safari Tent + Cabin, comparable ARDR)

Approximate after batch 6 (open private-commercial; excludes `all_inclusive`):

| Metric | Before (UI ~batch 5) | After batch 6 |
|--------|---------------------:|--------------:|
| unitsWith | ~221 | **~229** |
| avgWith | ~$288 | **~$295** |
| avgWithout | ~$372 | **~$366** |
| rateImpact | **−$83** | **~−$71** |

Safari/Cabin “with” mean still dominated by Jellystone Cabins (122 @ ~$238). Batch 6 added Sinya (~6 @ ~$417) and Open Sky Star Seeker (2 @ ~$664), which lifted avgWith and narrowed the gap.

Overview cache key remains `v3-unit-hot-tub-safari-cabin` — hard refresh / wait for revalidate to see UI update.
