# Phase 1 — Weeks 2–3 (Trust & Schema)

**Completed in repo (May 2026)**

| Task | Status |
|------|--------|
| 1.1 Remove unverified Organization `aggregateRating` (default off; removed map SoftwareApplication rating) | Done |
| 1.2 Visible author byline + Organization author schema (`Sage Outdoor Advisory`) on guides, landings, glossary | Done |
| 1.3 Landing Review JSON-LD synced with visible testimonials (`lib/content-testimonials.ts`) | Done |
| 1.4 SSR property summary (`PropertyDetailServerSummary`) passed into client template | Done |
| 1.5 Per-property `lastmod` in `properties.xml` from `updated_at` | Done |

## Author standard

All Sage-published resource content uses:

- **Visible byline:** `Author: Sage Outdoor Advisory`
- **JSON-LD:** `Organization` with `name: "Sage Outdoor Advisory"`

## Post-deploy checks

```bash
# No aggregateRating on homepage Organization schema
curl -s "https://resources.sageoutdooradvisory.com/en" | grep -c '"aggregateRating"' 
# Expect 0 (unless a visible review block adds it later)

# Author visible on a guide
curl -s "https://resources.sageoutdooradvisory.com/en/guides/feasibility-studies-complete-guide" | grep "Author:"

# Property SSR summary in HTML
curl -s "https://resources.sageoutdooradvisory.com/en/property/under-canvas-zion" | grep 'id="property-summary"'

# Per-property lastmod in sitemap (not all identical)
curl -s "https://resources.sageoutdooradvisory.com/sitemaps/properties.xml" | grep lastmod | sort -u | head -5
```

## Related

- [PHASE_0_WEEK1_CHECKLIST.md](./PHASE_0_WEEK1_CHECKLIST.md)
