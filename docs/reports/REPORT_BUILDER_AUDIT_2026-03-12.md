# Report Builder Audit — March 12, 2026

**Test Subject:** RV Park at Seabrook, 4275 SR 109, Pacific Beach, WA 98571
**Template:** `templates/rv/template.docx` (RV)
**Study ID:** DRAFT-20260312-37cf71cf (rerun of 26-134A-03)
**Pipeline Runtime:** ~31 seconds
**Output Files:**
- DOCX: 5,567 KB (down from ~28 MB after media stripping)
- XLSX: 620 KB

---

## 1. What Worked

### 1.1 Media Stripping (New)
The `stripUnreferencedMedia` function correctly identified and removed **132 orphaned media files (~32.4 MB)** from the DOCX zip archive. The output shrank from ~28 MB to ~5.6 MB. The 13 remaining media files are legitimately referenced in headers, footers, or the cover page section before "Project Overview."

### 1.2 Form Placeholder Rendering
All `{property_name}`, `{city}`, `{state}`, `{address_1}`, `{acres}`, `{report_date}`, `{study_id}`, and other form-filled placeholders rendered correctly. Zero unfilled `{placeholder}` tags remain in the output. The "Not specified" and "Not yet verified" fallbacks did not appear (input data was complete).

### 1.3 Enrichment Pipeline
- Geocoding resolved correctly for Pacific Beach, WA.
- County population and GDP data retrieved from Census API.
- Tavily web research returned 8 comparable properties.
- Data sources recorded: `feasibility_comp_units, geocode, tavily_web_research, county-population, county-gdp, census_api, tavily_market_context`.

### 1.4 XLSX Generation
40 sheets generated successfully. The `Comparables` sheet is populated with 8 web-sourced comps including Property Name, City, State, Unit Type, and source attribution.

### 1.5 Highlight Stripping
Two-phase highlight stripping ran without errors. Form-filled values are not highlighted; only template static text that needs author review retains highlights.

### 1.6 Duplicate Study ID Handling
Fixed `.maybeSingle()` errors when multiple reports share the same `study_id`. The API now uses `.order('created_at', { ascending: false }).limit(1)` to always resolve the most recent report.

---

## 2. Issues Found

### 2.1 CRITICAL: Image Replacement Regex Spans Paragraph Boundaries

**Impact:** 13 out of 21 document sections are completely missing from the generated DOCX.

**Missing sections:** Site Analysis, Development Costs, Industry Overview, Area Analysis, Demand Indicators, Supply and Competition Analysis, Comparables, Rate Projection, Occupancy Projection, Revenue Projection, Operating Expenses, 10 Year Pro Forma, Feasibility Conclusion.

**Root cause:** The regex in `replaceTemplateImagesWithPlaceholders`:

```
/<w:p\b[\s\S]*?<w:drawing>[\s\S]*?<\/w:drawing>[\s\S]*?<\/w:p>/g
```

The `[\s\S]*?` quantifier, while non-greedy, can still match across `</w:p>...<w:p>` boundaries. When a text-only paragraph precedes a paragraph containing `<w:drawing>`, the regex matches from the first `<w:p>` all the way to the `</w:p>` of the drawing paragraph, consuming all intervening text.

**Evidence:**
- Template has 2,048 paragraphs after "Project Overview," of which only 137 contain `<w:drawing>`.
- The regex produced 137 matches, but the max match length was **63,535 characters** — spanning dozens of paragraphs.
- The first match consumed the entire Table of Contents sub-section listing: "Site Analysis, Development Costs, Industry Overview, Area Analysis, Demand Indicators..."
- Generated document text is only 34.4% of the template text (51,075 vs 148,503 chars).

**Sections that survived:** Table of Contents (partial), Letter of Transmittal, Scope of Work, Executive Summary, SWOT Analysis, Project Overview (heading only), Assumptions and Limiting Conditions, Qualifications.

**Fix required:** Replace the single-pass regex with a two-step approach:
1. Match individual paragraphs with `/<w:p\b[\s\S]*?<\/w:p>/g`
2. Test each matched paragraph for `<w:drawing>` presence
3. Replace only matching paragraphs

### 2.2 HIGH: AI-Generated Sections Not Inserted into DOCX

**Impact:** The AI generates executive summary, SWOT analysis, letter of transmittal, site analysis, and comparables analysis text — but most of it is never visible in the final DOCX.

**Root cause:** The placeholders `{letter_of_transmittal}`, `{comparables_analysis}`, and `{site_analysis}` do not exist in the RV template. Docxtemplater silently ignores render data for missing placeholders.

The RV template's Letter of Transmittal is already structured with individual field placeholders (`{client_contact_name}`, `{client_entity}`, `{property_name}`, etc.) rather than a single `{letter_of_transmittal}` block — this is actually better since the LoT has specific formatting and structure. However, the AI-generated `letter_of_transmittal` text (a full prose letter) has no insertion point.

The `{executive_summary}` and `{swot_analysis}` placeholders DO exist in the template and render correctly. But since those sections immediately precede "Project Overview," their content is only visible if the ToC bug (2.1) doesn't consume them.

**Sections affected:**
| Section | Placeholder in Template | AI Generates Content | Visible in Output |
|---------|------------------------|---------------------|-------------------|
| Executive Summary | Yes | Yes | Yes (but short — template structure limits it) |
| SWOT Analysis | Yes | Yes | Yes |
| Letter of Transmittal | No (uses field-level placeholders) | Yes | No (AI prose ignored) |
| Comparables Analysis | No | Yes | No |
| Site Analysis | No (replaced via XML manipulation) | Yes | Partially (replaceStaticSiteAnalysisSection runs but section is then deleted by 2.1) |

### 2.3 MEDIUM: Remaining 12 Drawings After "Project Overview" Not Replaced

Despite the image replacement pass, 12 `<w:drawing>` elements survive after "Project Overview" in the output. These are likely in XML structures that don't match the regex pattern (e.g., wrapped in `<mc:AlternateContent>` markup, or nested in table cells). With the section-deletion bug (2.1) fixed, these would be visible as stale template images in the output.

### 2.4 LOW: XLSX Comparables Sheet Limited Data

The `Comparables` sheet has only 8 rows from Tavily web research. Distance, rates, and site count fields are mostly empty because Tavily extraction returns limited structured data. No database comps appeared (RoverPass/Campspot tables may not have coverage near Pacific Beach, WA).

### 2.5 LOW: Unit Mix Empty

The rerun used empty `unit_mix` (the source report had no unit_mix data stored). This means the Project Overview table's "Units / Sites," "Unit Mix," and "Total Units / Sites" rows show empty or default values.

---

## 3. Improvements Required (Priority Order)

### P0: Fix Image Replacement Regex (Blocks everything else)

Replace the current regex in `replaceTemplateImagesWithPlaceholders` with paragraph-level matching:

```typescript
function replaceTemplateImagesWithPlaceholders(zip: PizZip): void {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return;

  const xml = file.asText();
  const projectOverviewAnchor = xml.indexOf('<w:t>Project Overview</w:t>');
  if (projectOverviewAnchor < 0) return;

  const prefix = xml.slice(0, projectOverviewAnchor);
  const suffix = xml.slice(projectOverviewAnchor);
  const placeholder =
    '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>' +
    '<w:r><w:t>[Image placeholder - add author-selected image]</w:t></w:r></w:p>';

  // Match individual paragraphs, then replace only those containing drawings
  const updated = suffix.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => {
    if (/<w:drawing[\s>]/.test(para)) return placeholder;
    return para;
  });

  zip.file(xmlPath, prefix + updated);
}
```

### P1: Add Missing Placeholders to RV Template

Run `fix-rv-template.py` (already created) to add `{comparables_analysis}` to the Comparables section. For `{site_analysis}`, the existing `replaceStaticSiteAnalysisSection` XML manipulation approach is correct and doesn't need a placeholder.

The Letter of Transmittal should remain field-level (`{client_contact_name}`, etc.) since the structured format with Sage letterhead is preferable to a raw AI prose block.

### P2: Handle `<mc:AlternateContent>` Image Wrappers

Some DOCX images use `<mc:AlternateContent><mc:Choice>...<w:drawing>...</mc:Choice></mc:AlternateContent>` wrapping. The paragraph-level replacement (P0 fix) should also check for `<mc:AlternateContent` containing drawings.

### P3: Improve Tavily Comp Extraction

The current Tavily extraction returns property names but often lacks structured fields (rates, site counts, distances). Consider:
- Adding a structured extraction prompt that asks the AI to parse rates/sites from search snippets
- Falling back to Haversine distance calculation from geocoded comp addresses
- Cross-referencing Tavily results against database tables to enrich with stored data

---

## 4. Future Features

### 4.1 Section-Aware Template Rendering
Instead of a single-pass image replacement, implement section-aware rendering that:
- Parses the document into logical sections (by heading)
- Preserves section structure and formatting
- Replaces only the content within each section, keeping headings and section breaks
- Allows section-specific logic (e.g., keep Development Costs tables, replace only narrative text)

### 4.2 Dynamic Table Population
Several sections in the RV template contain data tables that should be populated from enrichment data:
- **Development Costs:** Unit costs table, site development costs
- **Rate Projection:** Rate comparison tables from comps
- **Supply & Competition Analysis:** Competitor summary tables
- **Revenue Projection:** Pro forma tables

These could be populated by reading the XLSX template sheets and mapping values into the DOCX tables.

### 4.3 Template Validation CLI
A script that validates a template DOCX before deployment:
- Lists all `{placeholder}` tags and checks they match `renderData` keys
- Flags sections that have no placeholder and will retain stale content
- Reports image counts per section
- Checks for `<mc:AlternateContent>` wrapped images
- Validates `.rels` file consistency

### 4.4 Incremental Report Regeneration
Allow regenerating individual sections without re-running the full pipeline:
- Regenerate just the Executive Summary with updated comps data
- Re-run only Site Analysis with new census data
- Update only the Comparables section after adding new database comps

### 4.5 Author Review UI
A web-based review interface where authors can:
- See all `[Image placeholder]` locations and upload replacement images
- Edit AI-generated text sections inline
- Toggle between template sections and review completion status
- Export the finalized DOCX after all reviews are complete

### 4.6 Comp Quality Scoring
Enhance comparable property selection with a quality score that considers:
- Distance from subject (closer = higher score)
- Similarity of unit types and site count
- Data completeness (has rates, occupancy, amenities)
- Recency of data source
- Source reliability (past Sage report > database > web research)

### 4.7 Template Version Management
Track template versions in Supabase with:
- Version number and changelog
- Diff visualization between versions
- Rollback capability
- Per-market-type template selection (current: RV vs glamping; future: marina, landscape hotel)

---

## 5. Test Results Summary

| Metric | Value |
|--------|-------|
| Pipeline runtime | 31 seconds |
| DOCX file size (before media strip) | ~28 MB |
| DOCX file size (after media strip) | 5.6 MB |
| Media files removed | 132 (32.4 MB) |
| Media files retained | 13 (5.3 MB) |
| Sections present in output | 8 of 21 |
| Sections missing due to regex bug | 13 |
| Unfilled placeholders | 0 |
| Image placeholders inserted | 136 |
| XLSX sheets generated | 40 |
| Comparable properties found | 8 (all from Tavily) |
| AI sections generated | 5 (exec summary, LoT, SWOT, site analysis, comps) |
| AI sections visible in output | 2 (exec summary, SWOT) |
