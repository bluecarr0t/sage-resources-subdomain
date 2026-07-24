# Light cleanup — Mirror Cabin (2026-07-13)

Mode: **live**

## 1. Two Capes duplicate

- Property has **four** Mirror Cabins total (not eight).
- Deleted id **9565** (`Mirror Cabin` qty 4) as duplicate of id **10326** (`South Cape Mirror Cabin` qty 4).

## 2. Glamping Collective Glass Cabin

- **Decision: keep `unit_type = Cabin`** on ids 10490, 10491, 11600.
- View-glass wall product, not mirrored cladding / ÖÖD.

## 3. Street / geo enrichment

| id | Property | Address | lat | lon |
|----|----------|---------|-----|-----|
| 13089 | Cameron Ranch Coldspring | 360 England Ln (existing) | 30.567919 | -95.0551909 |
| 13096 | SkyEagle Ridge | 44 Roden Mill Road, Conway AR 72032 | 35.1049594 | -92.3143764 |

SQL: `/Users/nickharsell/Documents/sage-resources-subdomain/scripts/.tmp-mirror-cabin-review/light-cleanup-mirror-cabin-2026-07-13.sql`
