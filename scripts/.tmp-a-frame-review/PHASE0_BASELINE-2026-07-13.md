# A-Frame USA — Phase 0 baseline (2026-07-13)

Audit of `all_sage_data` A-Frame inventory vs Hipcamp `A Frame` gap.

Re-run:

```bash
npx tsx scripts/analyze-a-frame-usa-inventory.ts
```

## Summary

| Metric | Count |
|--------|------:|
| Sage USA `A-Frame` rows | 31 |
| Reclass queue (any A-Frame signal, wrong unit_type) | 21 |
| Recommended retype | 1 |
| Skip (property already has A-Frame) | 2 |
| Ambiguous (review) | 2 |
| Description-only signal | 16 |
| Hipcamp USA distinct A Frame listings | 103 |
| Hipcamp already-in-Sage (name+state) | 14 |
| Hipcamp net-new candidates | 89 |

## Current Sage A-Frame inventory

| id | Property | Site | City, ST | ADR |
|----|----------|------|----------|-----|
| 10948 | Lost Lake Resort | A-frame | Hood River, OR | 208.75 |
| 9759 | Nature Nook Retreats | A-Frame Cabin | Greenville, SC | 178.75 |
| 9965 | Paloma Lake | A-Frame Cabins | Braithwaite, LA | 276.67 |
| 9670 | Starlight Haven at Weiss Lake | A-Frame Cabin | Cedar Bluff, AL | 175 |
| 9714 | Lost Woods Farm & Forest | A-Frame Cabin | Boyne Falls, MI | 176.25 |
| 12916 | Camp Wandawega | A-Frame | Elkhorn, WI | 400 |
| 9739 | Tops'l Farm | A-Frame Cabin | Waldoboro, ME | 211.25 |
| 9983 | Tiny Town Campground | A-Frames | Emigrant, MT | 128.67 |
| 10879 | Cedar Bloom Farm | A-Frame Cabin | Cave Junction, OR | 176.25 |
| 13097 | Callicoon Hills | A-Frame Cabins | Callicoon Center, NY |  |
| 10259 | Khushatta Hills Ranch | A-Frame | Coldspring, TX | 150 |
| 9984 | Tobacco River Ranch Glamping | A-Frame | Eureka, MT | 106.83 |
| 10480 | Bison Creek Ranch | A-Frames | East Glacier, MT | 200 |
| 10028 | Treetopia Campground | A-Frame Cabin | Catskill, NY | 270 |
| 13098 | The Charmadillo | A-Frame Cabins | Center Point, TX |  |
| 13103 | 22 West Cabins & Recreation | Moose Haven A-Frame | Walden, CO |  |
| 13107 | Solstice Farms | A-Frame Microcabin | Loomis, CA |  |
| 13112 | Good Creek Meadows | A-Frame | Olney, MT |  |
| 13099 | Punkin Hollow Resort | A-Frame Cabins | Stanton, KY |  |
| 13104 | The Hohnstead Glamping Cabins | Transforming A-Frame | Bonner, MT |  |
| 13109 | The Ridge at Stanley Gap | A-Frame | Blue Ridge, GA |  |
| 13114 | Willenborg Woods | A-Frame | Charleston, IL |  |
| 13100 | Nolla A-Frames Near Yosemite | Nolla A-Frame | Colfax Springs, CA |  |
| 13106 | Piney Hills Campground | A-Frame Cabins | Mauk, GA |  |
| 13111 | Noble Pine Campground | A-Frame | Mammoth Cave, KY |  |
| 13101 | Bentonville Bike Camp | Mini A-Frames | Bentonville, AR |  |
| 13105 | Fall Creek Retreats | Transforming A-Frame | Purlear, NC |  |
| 13110 | Happy Hollow Homestead | A-Frame | Marengo, IN |  |
| 13102 | Bear Woods Resort and Campground | A-Frame Cabins | Bear Lake, MI |  |
| 13108 | Crystal Ranch | A-Frame Cabins | Golden, CO |  |
| 13113 | Maine Guide Company | A-Frame | Carmel, ME |  |

## Phase 1 retype targets (recommended_action=retype)

- id 10504 **Mohican Adventures** / A-Frame, Frye: `Cabin` → `A-Frame` (Loudonville, OH)

## Ambiguous (do not auto-retype)

- id 10009 **Lumen Nature Retreat** / Luxury A-Frame Tents: `Tiny Home` — mixed or tent-shaped signal
- id 10032 **Happydale Retreat** / A-Frame/Cabin: `Tiny Home` — mixed or tent-shaped signal

## Exports

| File | Purpose |
|------|---------|
| `sage-a-frame-inventory.csv` | Current USA A-Frame rows |
| `reclass-queue.csv` | Mislabeled / sibling candidates |
| `hipcamp-gap-queue.csv` | Distinct Hipcamp A Frame listings + match status |

## Phase 1 / 2 handoff

1. **Phase 1:** Retype clear `site_name` A-Frame rows; skip properties that already have an `A-Frame` sibling.
2. **Phase 2:** Research net-new USA A-Frames from Hipcamp gap + OpenAI discovery; write candidates to `openai-candidates.jsonl`.
3. **Phase 3:** Curated insert into `all_sage_data` with `discovery_source=web_research_a_frame_us_2026_07_13`.
