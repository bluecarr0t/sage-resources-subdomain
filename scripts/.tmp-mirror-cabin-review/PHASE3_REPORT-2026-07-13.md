# Phase 3 Mirror Cabin report (2026-07-13)

Mode: **live**

## Aliases

Added to `lib/glamping-unit-type-normalize.ts` → `Mirror Cabin`:

- mirror cabin(s), mirrored cabin(s), mirror/mirrored house(s)
- glass cabin(s), glass house(s)
- ood / ööd house(s), ood mirror house/cabin

Tests: `__tests__/lib/glamping-unit-type-normalize.test.ts` (pass).

## Discovery

Script: `scripts/research-mirror-cabin-glamping-us.ts`

- Tavily multi-query + Firecrawl + GPT extract
- Dedupes vs `all_sage_data`; artifacts under `scripts/.tmp-mirror-cabin-review/`
- Automated passes resurfaced mostly Phase 1–2 inventory (Two Capes, Bolt Farm, Cameron Ranch, Tu Tu' Tun, Paradise Ranch, Glamp Michigan)
- Manual web expand confirmed **Oak Ranch Resort** (Graham, TX) as net-new hospitality
- Seed URLs now reserved ahead of Tavily budget so Firecrawl always hits known stay pages

## Applied

| id | Property | Units | Type | Status |
|----|----------|------:|------|--------|
| 13118 | Glamp Michigan / ÖÖD Mirror House | 2 | sibling | `in_progress` |
| 13119 | Oak Ranch Resort / Mirror House | 2 | net-new | `in_progress` |

`discovery_source`: `ood_mirror_cabin_web_expand_2026_07_13`

## Rejected / not retyped

- **The Glamping Collective Glass Cabin / Luxe Glass Cabin** (ids 10490, 10491, 11600): view-glass wall cabins, not mirrored cladding / ÖÖD — keep `Cabin`
- **Space Cowboys Mirrored Space Pod**: leave `Dome`
- **Terranova Nirvana Mirror glamping dome**: leave `Dome`

## Artifacts

- `scripts/research-mirror-cabin-glamping-us.ts`
- `scripts/insert-mirror-cabin-phase3-web-expand-2026-07-13.ts`
- `phase3-discovery-results.jsonl` / `phase3-already-in-sage.csv` / `phase3-discovery-queue.csv`
- `phase3-mirror-cabin-2026-07-13.sql`
