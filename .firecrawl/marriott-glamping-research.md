# Marriott Glamping Research (2026-05-21)

## Brand structure (`glamping_brands`)

| Slug | Display name | Tier |
|------|----------------|------|
| `marriott` | Marriott | portfolio |
| `marriott-outdoor-collection` | Outdoor Collection by Marriott Bonvoy | sub_brand → marriott |
| `postcard-cabins` | Postcard Cabins | sub_brand → marriott-outdoor-collection |

## Already in `all_glamping_properties` (brand backfill only)

- **Postcard Cabins** — 29 US locations (complete vs Marriott’s 29-outpost count)
- **Al Maha** (Dubai) — Luxury Collection desert tents → linked to `marriott`

## New rows (`research_status = in_progress`)

### Outdoor Collection — Trailborn
| Property | Status | Slug |
|----------|--------|------|
| Trailborn Highlands | Open | `trailborn-highlands-nc` |
| Trailborn Surf & Sound | Open | `trailborn-surf-and-sound-nc` |
| Trailborn Grand Canyon | Open | `trailborn-grand-canyon-az` |
| Trailborn Mendocino Hillside | Under Construction | `trailborn-mendocino-hillside-ca` |
| Trailborn Jackson Hole | Open (updated from rejected) | `trailborn-jackson-hole-wy` |

### Luxury / safari (Marriott portfolio)
| Property | Status | Slug |
|----------|--------|------|
| Mapito Safari Camp, Serengeti | Open | `mapito-safari-camp-serengeti-tz` |
| JW Marriott Masai Mara Lodge | Open | `jw-marriott-masai-mara-lodge-ke` |
| The Ritz-Carlton, Masai Mara Safari Camp | Open | `ritz-carlton-masai-mara-safari-camp-ke` |
| JW Marriott Mount Kenya Rhino Reserve Safari Camp | Under Construction (Jul 2026) | `jw-marriott-mount-kenya-rhino-reserve-ke` |

## Sources

- https://www.marriott.com/brands/outdoor-collection.mi
- https://www.trailborn.com/
- https://www.marriott.com/luxury/destinations/safari
- Marriott press / Travel Weekly / The Points Guy (2025–2026)

## Migration

`scripts/migrations/add-marriott-glamping-resorts-2026-05-21.sql`
