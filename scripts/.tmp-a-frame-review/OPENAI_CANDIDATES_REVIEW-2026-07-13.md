# A-Frame USA — OpenAI candidates review (2026-07-13)

Source: `scripts/research-a-frame-glamping-openai.ts` → `openai-candidates.jsonl` (42 rows).

## Verdict

**Do not bulk-insert the OpenAI candidate list.** Most West/Northeast entries appear hallucinated (invented brand names + non-resolving marketing domains such as `aspenaframelodge.com`, `zionaframecabins.com`, `aframedreams.com`).

## Keep / verify via Hipcamp + official sites

Prefer `hipcamp-gap-queue.csv` (`match_status=net_new_candidate`) and human web verification.

Wave-1 curated inserts (see `scripts/insert-a-frame-us-2026-07-13.ts`):

| Property | City, ST | Evidence |
|----------|----------|----------|
| Callicoon Hills | Callicoon Center, NY | callicoonhills.com/stay/a-frames + Travel+Leisure |
| The Charmadillo | Center Point, TX | thecharmadillo.com — 7 A-frames |
| Punkin Hollow Resort | Stanton, KY | Hipcamp — 5 private A-Frame cabins |
| Nolla A-Frames Near Yosemite | Colfax Springs, CA | nollacabins.com + Hipcamp — 3 Nolla A-frames |
| Bentonville Bike Camp | Bentonville, AR | bentonvillebikecamp.com — mini A-frames |
| Bear Woods Resort and Campground | Bear Lake, MI | Hipcamp/RoverPass — A-frame cabins |
| 22 West Cabins & Recreation | Walden, CO | 22west.net — Moose Haven A-frame |
| The Hohnstead (sibling) | Bonner, MT | Already in Sage as Cabin; sibling A-Frame row |

## Process going forward

1. Run research script for ideation only.
2. Cross-check every candidate against Hipcamp gap + official URL.
3. Insert via curated script with `discovery_source=web_research_a_frame_us_2026_07_13`.
