# Capella Ubud — site research (May 2026)

## Property overview

- **Brand:** Capella Hotels & Resorts (Bill Bensley design)
- **Location:** Keliki Village rainforest, ~4.5 mi from central Ubud, Bali, Indonesia
- **Inventory:** 23 teak-floored tented suites (no trees felled per AFAR / property copy)
- **Address:** Jl. Raya Dalem, Banjar Triwangsa Desa Keliki, Kecamatan Tegallalang Ubud, Gianyar Bali 80561, Indonesia
- **Phone:** +62 361 2091888 | **Email:** info.ubud@capellahotels.com
- **Marketing:** https://capellahotels.com/en/capella-ubud/accommodation
- **Booking engine:** Synxis (`hotel=3217`, `chain=21430`) — https://be.synxis.com/

## Accommodation categories (Capella site, May 2026)

| Site name | Bedrooms | Pool | Notes |
|-----------|----------|------|-------|
| Keliki Tent | 1 | Heated private pool, valley views | Copper tub; indoor/outdoor showers; deck + daybed |
| Valley Tent | 1 | Plunge pool, jungle views | Largest 1BR category per site copy |
| Forest Tent | 1 | Plunge pool, lush panoramas | Buggy access |
| Terrace Tent | 1 | Plunge pool, forest views | Forest-front |
| Two Bedroom Lodge | 2 | Private 19 sqm pool | Oriental-themed family lodge |

## Guest services (included)

Breakfast at Mads Lange; Officers' Tent afternoon tea/cocktails; airport transfers (4+ nights); Ubud centre transfers; Capella Culturist 24h; welcome duffel; photo shoot; The Cistern heated pool; in-tent refreshments; Illy coffee/tea; Bamford toiletries; laundry (4 pcs/person); bedtime ritual; Camp Rangers activities; The Armory gym; Wi‑Fi throughout.

## Rates

- **AFAR Hotels We Love (Apr 2026):** from **~$650 USD**/night (list minimum; category-specific ADRs vary).
- **Synxis sample requested:** arrive 2026-10-14, depart 2026-10-16, 1 adult (user URL, IDR) / 2 adults (USD retest). Room cards and nightly totals did not render in automated browser scrape (SPA / bot protection); re-quote in live Synxis for travel dates.
- **User booking URL (IDR):** `https://be.synxis.com/?adult=1&arrive=2026-10-14&chain=21430&child=0&currency=IDR&depart=2026-10-16&hotel=3217&lang=en-US&locale=en-US&productcurrency=IDR&rooms=1&start=availresults`

## DB enrichment plan

- Anchor row **id 12187**: rename site **Keliki Tent** (was Keliki Valley Tent), `rate_avg` = 650 (AFAR from-rate).
- Insert siblings: Valley Tent, Forest Tent, Terrace Tent, Two Bedroom Lodge.
- `property_total_sites` = 23; `discovery_source` = `web_research_capella_ubud_synxis_2026_05`.
