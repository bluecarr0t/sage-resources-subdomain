# Post-deploy SEO checklist (GSC + Semrush)

Run this **1–2 weeks** after deploying legacy redirects, glamping locale consolidation, map `noindex` on filtered URLs, and sitemap updates.

## Google Search Console

1. **Performance (Search results)**  
   - Filter by **Page** and confirm `/en/guides/`, `/en/glossary/`, `/en/property/`, `/en/glamping/` gain impressions while **unprefixed** `/guides`, `/glossary`, `/property` and **`/fr|es|de/glamping/`** drop toward zero.

2. **Indexing → Pages**  
   - Watch **“Crawled – currently not indexed”** and **“Duplicate, Google chose different canonical than user”** for old URLs; expect a temporary spike then decline.

3. **Sitemaps**  
   - Resubmit `https://resources.sageoutdooradvisory.com/sitemap.xml` if needed. Spot-check child sitemaps list only **`en`** for glossary, properties, and glamping hub URLs.

4. **Map URLs**  
   - Confirm parameterized `/…/map?...` URLs show **noindex** in URL Inspection while plain `/…/map` stays indexed.

## Semrush (optional)

- Re-run **Position Tracking** for the same keyword set used in planning; expect English queries to align with **`/en/glamping/...`** and property/guide canonicals.

## Regression

- Manually open a legacy URL in an incognito window: `/guides/feasibility-study-process-timeline` → **301** to `/en/guides/...`.  
- Open `/fr/glamping/near-national-parks` → **301** to `/en/glamping/near-national-parks`.
