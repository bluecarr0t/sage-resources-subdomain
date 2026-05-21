# Hilton outdoor hospitality — May 2026 research

## Scope

Hilton’s outdoor / adventure hospitality footprint relevant to Sage `all_glamping_properties`:

1. **AutoCamp Stays** — Hilton partnership (bookable on hilton.com, Hilton Honors). Sub-brand under portfolio **Hilton**.
2. **Outset Collection by Hilton** — lifestyle outdoor/adventure boutique hotels (launched Oct 2025). First open property: **Slackline Moab** (former Field Station Moab / AutoCamp Hospitality Group).

Excluded (not Hilton corporate outdoor collection):

- **Hilton Head Harbor RV Resort & Marina** — name collision only; unrelated to Hilton Inc.

## AutoCamp Stays (Hilton sub-brand: AutoCamp)

**Official:** [hilton.com AutoCamp Stays](https://www.hilton.com/en/brands/autocamp-stays/), [autocamp.com/locations](https://autocamp.com/locations/)

| Property | City, ST | In Sage DB | Notes |
|----------|----------|------------|-------|
| AutoCamp Asheville | Asheville, NC | Yes | Hilton + autocamp.com |
| AutoCamp Cape Cod | Falmouth, MA | Yes | |
| AutoCamp Catskills | Saugerties, NY | Yes | |
| AutoCamp Hill Country | Fredericksburg, TX | Yes | Opening Q2 2026; not yet on Hilton locations index; `is_open` → Under Construction |
| AutoCamp Joshua Tree | Joshua Tree, CA | Yes | |
| AutoCamp Russian River | Guerneville, CA | Yes | Same site as Hilton listing **AutoCamp Sonoma** (14120 Old Cazadero Rd); do not duplicate Sonoma rows |
| AutoCamp Sequoia | Three Rivers, CA | Yes | |
| AutoCamp Yosemite | Midpines, CA | Yes | |
| AutoCamp Zion | Virgin, UT | Yes | |

**Missing from DB:** None among operating AutoCamp sites. Sonoma = Russian River (see `clean-autocamp-postcard-wander-duplicates.sql`).

## Outset Collection by Hilton

**Official:** [Outset fact sheet](https://stories.hilton.com/outset-collection-by-hilton-fact-sheet), [Slackline Moab press](https://stories.hilton.com/releases/slackline-moab-outset-collection-by-hilton-marks-debut-of-companys-latest-brand)

| Property | City, ST | In Sage DB | Notes |
|----------|----------|------------|-------|
| Slackline Moab, Outset Collection by Hilton | Moab, UT | **Added** | 889 N Main St; 138 rooms; formerly Field Station Moab; [hilton.com/cnymaid](https://www.hilton.com/en/hotels/cnymaid-slackline-moab/) |
| ACME Hotel Chicago | Chicago, IL | No | Urban boutique; not outdoor/glamping inventory |

## Brand registry (migration)

- `hilton` — portfolio
- `autocamp` — sub_brand, parent `hilton` (existing slug; re-tiered from standalone)
- `hilton-outset-collection` — sub_brand, parent `hilton`

Property `brand_id` points at the **leaf** sub-brand (`autocamp` or `hilton-outset-collection`), matching Marriott / Best Western pattern.

## discovery_source

`web_research_2026_05_hilton_outdoor`
