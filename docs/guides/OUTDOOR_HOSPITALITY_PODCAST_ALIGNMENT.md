# Outdoor Hospitality Podcast — Phase 0 Alignment

**Status:** Phase 1 complete; Phase 2 contextual links in progress (2026-05-25)  
**Podcast:** [The Outdoor Hospitality Podcast](https://www.outdoorhospitalitypod.com/) (Sage Outdoor Advisory)  
**Link source:** `resources.sageoutdooradvisory.com` (glossary, guides, footer)

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| **Primary CTA on resources** | Feasibility consultation remains primary (`sageoutdooradvisory.com/contact-us`). Podcast is always secondary. |
| **Default podcast destination** | Site home or `/episodes/` when no episode mapping exists (Phase 1). Episode deep links in Phase 2. |
| **Tone** | Educational: “hear from operators” — not a second sales CTA. |
| **Language** | English only for podcast callouts (matches glossary/guide body content today). |
| **UTM source** | `resources` |
| **UTM campaign** | `podcast` |
| **UTM medium** | `footer`, `glossary-index`, `glossary-sidebar`, `guides-index`, `glossary-term`, `guides-page` |
| **UTM content** | Page slug or placement id (e.g. `adr`, `feasibility-studies-complete-guide`) |
| **Implementation** | `lib/outdoor-hospitality-podcast.ts` + `buildPodcastUrl()` |
| **Rebrand** | Done — legacy “Unique Hospitality Podcast” blog URLs in guides replaced with `outdoorhospitalitypod.com` episode links |

### Example URLs (Phase 1)

```
https://www.outdoorhospitalitypod.com/?utm_source=resources&utm_medium=footer&utm_campaign=podcast
https://www.outdoorhospitalitypod.com/episodes/?utm_source=resources&utm_medium=glossary-sidebar&utm_campaign=podcast&utm_content=adr
```

---

## Phase 1 placements (implemented)

| Placement | Medium | Default URL |
|-----------|--------|-------------|
| Site footer → Connect | `footer` | Podcast home |
| Glossary index (below consultation CTA) | `glossary-index` | Podcast home |
| Guides index (below consultation CTA) | `guides-index` | Podcast home |
| Glossary term sidebar → Quick links | `glossary-sidebar` | `/episodes/` + `utm_content={term.slug}` |

---

## Phase 2 — Tier A glossary ↔ episode matrix (implemented)

Contextual links use **episode deep links** with `utm_medium=glossary-term` (glossary) or `utm_medium=guides-page` (guides). Max **1–2 podcast links per page**.

Helpers:

- `lib/podcast-episode-paths.ts` — episode path constants
- `lib/glossary-podcast-links.ts` — Tier A term → episode map
- `lib/guide-podcast-links.ts` — pillar guide section → episode map
- `lib/podcast-content-links.ts` — `buildPodcastEpisodeUrl()`
- `components/podcast/PodcastContextLinks.tsx` — in-body renderer (SEO placement preserved)

| Glossary slug | Suggested episode (title) | Rationale |
|---------------|---------------------------|-----------|
| `adr` | Are your units priced correctly? (Jasper Ribbers) | Pricing / ADR operations |
| `ardr` | Same as ADR | Listed vs realized rates |
| `occupancy-rate` | Outdoor Hospitality Myth Busting (Harrison / Heineke) | Benchmarks & myths |
| `revpar` | Myth busting or pricing episode | Revenue metrics |
| `feasibility-study` | Meet Your Host: Shari Heilala | Sage feasibility positioning |
| `appraisal` | Ben Wolff — selling to a public REIT | Transactions / value |
| `noi` | Ben Wolff or bank/financing episodes | Income-focused |
| `cap-rate` | REIT / transaction episodes | Exit & valuation |
| `dscr` | Financing / portfolio builder episodes | Lender metrics |
| `glamping` | Sarah Dusek (Few & Far / Under Canvas) | Glamping operator scale |
| `glamping-resort` | Glamping Collective (Pt 1/2) or Under Canvas acquisition | Resort development |
| `rv-resort` | RV-forward guest episodes | RV resort operations |
| `campground` | HoneyTrek — 300+ site visits | Campground / outdoor stays |
| `market-analysis` | Myth busting or Shari data deep dive | Market sizing |
| `competitive-analysis` | HoneyTrek or comp-focused interviews | Field research |
| `revenue-projections` | Pricing / feasibility-adjacent | Pro forma context |
| `income-approach` | Appraisal / REIT episodes | Valuation methods |
| `pro-forma` | Joe Lisa / portfolio episodes | Development finance |

*Episode paths: confirm on [Episodes](https://www.outdoorhospitalitypod.com/episodes/) before Phase 2 — Podpage slugs may differ from RSS titles.*

---

## Phase 2 — Guide ↔ episode matrix (priority pillars)

| Guide slug | Suggested episodes |
|------------|-------------------|
| `feasibility-studies-complete-guide` | Shari host intro; bank/financing founder stories |
| `property-appraisals-complete-guide` | Ben Wolff REIT; transaction roundtables |
| `glamping-industry-complete-guide` | Paws Up / AutoCamp / Wildhaven; Under Canvas acquisition |
| `how-to-start-glamping-business` | Founder stories (Live Oak Lake, Sandy Vans, Joe Lisa) |
| `glamping-market-trends-2025` | Myth busting; data deep dive with Shari |
| `what-banks-look-for-feasibility-study` | Portfolio / financing episodes |

**Rebrand cleanup (complete):** `lib/guides/industry.ts`

| Former blog link | New destination |
|------------------|-----------------|
| `…/blog/the-unique-hospitality-podcast-lessons-in-launching-paws-up-autocamp-wildhaven/` (glamping industry case studies) | [Lessons from Paws Up, AutoCamp & Wildhaven](https://www.outdoorhospitalitypod.com/lessons-from-launching-paws-up-autocamp-and-wildhaven-from-mr-outdoor-hospitality-gms-story/) + `utm_medium=guides-page&utm_content=glamping-industry-complete-guide` |
| Same blog URL (how to start a glamping business intro) | [Isaac French / Live Oak Lake](https://www.outdoorhospitalitypod.com/isaac-french-of-live-oak-lake-less-but-better-in-hospitality-and-living-life/) and [Sandy Vans founder story](https://www.outdoorhospitalitypod.com/glamping-on-wheels-the-story-behind-sandy-vans-and-building-a-350k-van-founder-story/) + `utm_content=how-to-start-glamping-business` |

No remaining `unique-hospitality-podcast` URLs in application code (verified via repo search).

---

## Measurement (Phase 4 prep)

- GA4: existing outbound click handler (`GoogleAnalytics.tsx`) — filter hostname `outdoorhospitalitypod.com`, group by `utm_medium` / `utm_content`.
- Review quarterly: add mappings for new episodes; drop low CTR placements.

---

## Podpage reverse links (manual, off-repo)

On [About](https://www.outdoorhospitalitypod.com/about/) and high-traffic episode pages, add:

- Glossary hub: `https://resources.sageoutdooradvisory.com/en/glossary`
- Guides hub: `https://resources.sageoutdooradvisory.com/en/guides`
- Topic-specific glossary URLs from matrix above

---

## Open items for stakeholder sign-off

- [x] UTM naming: `resources` / `glossary` / `guides` mediums (approved)
- [ ] Confirm Shari “Meet Your Host” episode slug for glossary sidebar “start here” (optional: swap `/episodes/` for deep link).
- [x] Tier A glossary list — implemented (no `dscr` term in glossary; skipped)
- [x] Guide rebrand URL replacements — complete in `lib/guides/industry.ts` (2 locations)
