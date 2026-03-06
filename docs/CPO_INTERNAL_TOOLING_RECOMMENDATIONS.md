# Internal Tooling & Features — CPO Recommendations

**Prepared for:** Sage Outdoor Advisory  
**Date:** March 4, 2025  
**Context:** Internal tooling for feasibility studies, appraisals, revenue projections, and market studies. Leveraging 300+ past reports, Hipcamp, RoverPass, Campspot, and manual data. Current workflow: Excel + Word + Dropbox.

---

## Executive Summary

Sage is the leading firm in outdoor hospitality consulting and appraisal in the United States, with 350+ completed studies and the largest proprietary glamping database. Your current admin tools already ingest XLSX workbooks and DOCX narratives, parse comparables, and surface analytics. The opportunity is to **reduce manual Excel/Word work, improve reviewer collaboration, and leverage AI + historical data** to accelerate delivery and improve consistency.

---

## 1. Market Position & Data Assets (Research Summary)

### 1.1 Sage’s Position

- **Services:** Feasibility studies, appraisals, revenue projections, market studies for RV resorts, campgrounds, glamping, outdoor resorts, marinas
- **Differentiators:** 350+ completed projects, largest glamping database, AGA Top 50 Glamping Vendors 2024
- **Report structure:** Executive summary, market analysis, competitive analysis, financial projections (pro forma, NOI, ROI), site analysis, risk assessment, strategic recommendations

### 1.2 Data Assets (from codebase)

| Asset | Scope | Use |
|-------|--------|-----|
| **300+ past reports** | Structured comparables, pro forma, occupancy, rates | Training, benchmarking, templates |
| **all_glamping_properties** | Glamping properties, rates, amenities | Comparables, market mapping |
| **all_roverpass_data** | RoverPass sites (RV, tent, cabin, glamping) | RV/campground comparables |
| **Hipcamp** | ~60K sites, winter rates, occupancy, unit types | Glamping + winter demand |
| **Campspot** | (assumed similar to RoverPass) | RV/campground data |
| **RIDB** | Federal campsites | Public-sector context |
| **Manual research** | Proprietary field research | High-quality validation |

---

## 2. Current Pain Points (Inferred from Workflow)

| Pain | Impact |
|------|--------|
| Excel/Word manual assembly | Slow, error-prone, version drift |
| Dropbox-only collaboration | No structured review, comments, or approval workflow |
| Copy-paste from data sources | Inconsistent formatting, missed comparables |
| Recreating similar sections | Duplication across studies |
| Reviewer feedback loop | Scattered comments, unclear status |

---

## 3. Recommended Internal Tooling & Features

### 3.1 Phase 1 — Accelerate Existing Workflow (3–6 months)

#### A. **AI-Assisted Comparable Selection**

**What:** When starting a new study, the analyst selects location (city/state), unit mix, and market type. The system suggests comparables from:

- Past feasibility studies (300+ reports)
- all_glamping_properties
- RoverPass / Hipcamp / Campspot (unified search)

**How:** Extend the existing comparables search with:

- **“Suggest from past studies”** — Find studies in the same state/region with similar unit mix; surface their comparables as candidates
- **“Suggest from data”** — Fuzzy search by property name, state, unit category, ADR range; rank by distance and amenity match
- **AI summary** — One-click: “Summarize why these 5–8 comparables are appropriate for this market”

**Value:** Cuts comparable research time by 50%+; improves consistency with historical methodology.

---

#### B. **Report Draft Generator (AI + Templates)**

**What:** From a minimal input (client name, location, unit mix, market type), generate a **draft DOCX** with:

- Executive summary (AI-generated, grounded in comparable data)
- Market analysis (pulled from past studies in same region)
- Competitive summary (from suggested comparables)
- Placeholder sections for site analysis, financials, recommendations

**How:**

- Use `parseDocxReport` output schema as the target structure
- Train or prompt an LLM on anonymized past executive summaries + market sections
- Inject real data: ADR by unit type, occupancy trends, regional benchmarks from your DB
- Output DOCX via a template engine (e.g., docx-templates, or Mammoth for round-trip)

**Value:** Analyst edits and refines instead of writing from scratch; faster first draft.

---

#### C. **Structured Review & Approval (Replace Dropbox)**

**What:** In-app review workflow instead of Dropbox:

- **Reviewer assignment** — Assign a study to an internal reviewer
- **Section-level comments** — Comment on specific sections (executive summary, market, financials)
- **Status:** Draft → In Review → Revisions Requested → Approved
- **Audit trail** — Who changed what, when (you already have `admin_audit_log`)

**How:**

- Add `report_status`, `assigned_reviewer_id`, `review_due_date` to reports
- New UI: Review mode with section anchors and comment threads
- Notifications (email or in-app) when status changes

**Value:** Clear ownership, traceable feedback, no lost comments in Dropbox.

---

### 3.2 Phase 2 — Data & AI Differentiation (6–12 months)

#### D. **Benchmark & Revenue Projection Assistant**

**What:** When building pro forma revenue:

- **Benchmark by region/unit type** — “What ADR and occupancy do similar properties in TX/CO/UT achieve?”
- **Sensitivity analysis** — “If ADR is 10% lower, how does NOI change?”
- **AI suggestion** — “Based on 47 past studies in this region, we typically assume X% occupancy in year 1.”

**How:**

- Aggregate `feasibility_comp_units`, `feasibility_study_summaries`, and `all_glamping_properties` by state, unit_category, property_type
- Expose via API + simple UI (charts, tables)
- LLM summarizes: “For glamping cabins in Colorado, median peak ADR is $X, occupancy Y%”

**Value:** Defensible, data-backed assumptions; less “gut feel.”

---

#### E. **Winter Demand & Seasonal Analysis**

**What:** For northern/ski-adjacent projects, quantify winter demand using:

- Hipcamp winter rates, occupancy, snow-sports flag
- Distance-to-ski analysis (existing `getPropertiesNearNationalPark` pattern)
- Past studies with winter-operating properties

**How:**

- Implement the RFP Winter Demand Framework (you have `RFP_WINTER_DEMAND_FRAMEWORK_SCOPE.md`)
- Add “Winter demand” view to comparables: filter by `snow_sports`, `operating_season_months`, winter ADR
- Report: “X properties within 30 miles operate in winter; median winter ADR $Y”

**Value:** Unique capability for ski-adjacent glamping; fills a gap competitors don’t have.

---

#### F. **Unified Data Explorer**

**What:** Single UI to explore and compare:

- Glamping properties (all_glamping_properties)
- RoverPass sites (all_roverpass_data)
- Hipcamp (when ingested)
- Campspot (when ingested)
- Past study comparables (feasibility_comp_units)

**How:**

- Extend the existing admin client map and comparables UI
- Add filters: source, state, unit type, ADR range, occupancy, amenities
- Export to CSV/Excel for use in reports

**Value:** Analysts stop switching between spreadsheets and DB exports; one source of truth.

---

### 3.3 Phase 3 — Productization (12–18 months)

#### G. **Automated Market Reports (Product)**

**What:** You already offer USA RV Market Report (free) and state/regional reports. Extend to:

- **On-demand custom reports** — Client uploads address + unit mix; system generates a “lite” market report (comparables, benchmarks, 1–2 page summary)
- **Subscription data access** — Clients pay for API or dashboard access to your benchmarks (anonymized)

**Value:** Recurring revenue; scales without linear headcount.

---

#### H. **Appraisal Data Pack**

**What:** For appraisals, auto-generate a “data pack”:

- Comparable sales (from your DB + public records if integrated)
- Income approach inputs (rates, occupancy from your data)
- Cost approach benchmarks (development costs from past studies)

**How:**

- Structure `feasibility_development_costs`, `feasibility_valuation` for reuse
- Template: “Appraisal data pack — [Client] — [Date]” with tables and charts

**Value:** Appraisers spend less time gathering data; more time on analysis and narrative.

---

## 4. Prioritization Matrix

| Initiative | Impact | Effort | Dependencies | Priority |
|------------|--------|--------|--------------|----------|
| A. AI-assisted comparable selection | High | Medium | Existing comparables search | **P0** |
| B. Report draft generator | High | High | DOCX parser, LLM | **P1** |
| C. Structured review workflow | Medium | Medium | Reports schema | **P1** |
| D. Benchmark assistant | High | Medium | Aggregation queries | **P1** |
| E. Winter demand analysis | Medium | Medium | Hipcamp ingestion | **P2** |
| F. Unified data explorer | Medium | Medium | Schema alignment | **P2** |
| G. Automated market reports | High | High | Phase 1–2 | **P3** |
| H. Appraisal data pack | Medium | Medium | Development cost schema | **P3** |

---

## 5. Technical Foundations to Strengthen

| Area | Current State | Recommendation |
|------|---------------|-----------------|
| **Campspot data** | Not clearly in codebase | Ingest and align schema with RoverPass/Hipcamp |
| **Hipcamp** | CSV referenced in RFP | Ingest into DB; unify with glamping_properties |
| **DOCX generation** | Parse only | Add generation (template + data → DOCX) |
| **LLM integration** | Used in `parseDocxReport` (fillMissingFieldsWithLLM) | Extend for summaries, comparable rationale |
| **Review workflow** | None | Add report_status, reviewer, comments |

---

## 6. Quick Wins (Next 30–60 Days)

1. **“Suggest from past studies”** — Add a button on comparables: “Find similar studies” → show studies in same state with similar unit mix; allow importing their comparables.
2. **Benchmark API** — Expose `GET /api/admin/benchmarks?state=CO&unit_category=Cabin` returning median ADR, occupancy, rate ranges from past studies.
3. **Report status field** — Add `status` (draft | in_review | approved) and `assigned_reviewer_id` to reports; simple filter in past-reports UI.
4. **Export comparables to Excel** — One-click export of selected comparables + units to XLSX for pasting into client workbooks.

---

## 7. Summary

Sage’s data moat (300+ reports, Hipcamp, RoverPass, Campspot, manual research) is underused for internal efficiency. The highest-leverage moves are:

1. **AI-assisted comparable selection** — Reduce research time and improve consistency.
2. **Report draft generator** — Shift from writing to editing.
3. **Structured review** — Replace Dropbox with traceable, section-level feedback.
4. **Benchmark assistant** — Make revenue projections defensible and data-driven.

These build on your existing admin tools, parsers, and data schemas. Phase 1 can be delivered in 3–6 months with your current stack (Next.js, Supabase, existing parsers). Phase 2 and 3 extend into productization and new revenue streams.

---

*Document prepared as CPO-style strategic recommendations. Implementation details and resourcing should be validated with engineering and product teams.*
