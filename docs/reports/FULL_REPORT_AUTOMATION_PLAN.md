# Full Feasibility Report Automation Plan

**Date:** 2026-08-06 (updated with FS Template Parity implementation)
**Goal:** Automate building complete feasibility study reports (60–130 page Word narrative + full Excel financial model) from an initial set of inputs (client/company name, address, parcel info, unit mix, financing terms).

**Parity decisions (locked):**
- RV workbook delivered as live `.xlsx` (macros stripped from foundation `.xlsm`).
- STDB/ESRI: analyst uploads export; automation imports into Market Profile ring sheets (no live STDB API).
- Progress: NDJSON stream on `generate-draft` (`stream: true`), comps-v2 pattern.
- Templates rebased from foundation files under `templates/{glamping,rv}/` — see `templates/README.md`.

**Evidence base:** Deep analysis of 8 past reports (DOCX + XLSX pairs) spanning 2023–2026 and four market types:

| Study | Year | Type | Product |
|---|---|---|---|
| 26-107A-01 Spencer, TN | 2026 | RV + Glamping | Feasibility Study (current format, fully linked) |
| 26-105A-01 Buffalo Junction, VA | 2026 | Glamping | Market Analysis (current format) |
| 26-114A-01 Bridgeport, TX | 2026 | RV Resort | Appraisal (for comparison) |
| 26-116A-01 Corinth, KY | 2026 | RV Resort | Appraisal (outline) |
| 23-196A-06 St. Augustine, FL | 2023 | RV | Feasibility Study |
| 23-179A-05 Centre, AL | 2023 | Cabin | Feasibility Study |
| 23-103A-01 Briggsville, WI | 2023 | Campground | Appraisal (outline) |
| 23-129A-03 North Egremont, MA | 2023 | Glamping | Feasibility Study (outline) |

Plus a full audit of the existing `lib/ai-report-builder/` pipeline and `generate-draft` endpoint.

---

## 1. Key findings from the report corpus

### 1.1 The workbook is the system of record; the Word doc is a render target

Every financial number in the narrative (exec summary tables, rate/occupancy projections, pro forma, financing, IRR) is paste-linked from ~15 named ranges in the Excel model via OLE links (e.g. `10 yr PF!R2C2:R58C13`, `Financing!R27C14:R44C16`, `IRR!R31C13:R31C15`). The narrative is assembled *around* the model, not the other way.

### 1.2 The intake form already defines the "initial set of inputs"

Every workbook since at least 2023 contains a `ToT (Intake Form)` sheet — a stable field bank that is the single parameter source for the whole model: client block (owner name, phone, legal business name, address, report purpose), property block (resort name, type, full address, county, acres, parcel numbers, purchase year/price), up to 7 unit slots (type, quantity, description each), amenities free-text, phasing/approvals/engineering status, utilities Q&A, financing terms (LTC %, interest rate, term), attractions/target-market Q&A, and a confidentiality flag for competitor calls. **This is the natural schema for the automation's input form.**

### 1.3 The manual process is already a scripted pipeline

The 2026 workbook template embeds its own SOP: ALL-CAPS tabs (`PROJ. OVERVIEW`, `AREA & DEMAND INDICATORS`, `SUPPLY & COMPS`, `RATES & OCC. PROJ.`, `DEVELOPMENT COSTS`…) contain verbatim ChatGPT prompts, STDB/FEMA click-paths, phone scripts for assessors and planning departments, and Loom links. Automation means executing this existing runbook programmatically — not inventing a new methodology.

### 1.4 The dominant quality failures are template hygiene, not math

Observed across every sampled report: stale cross-project data (Arizona client in an Alabama workbook; Seattle ESRI sheets and a "Chattanooga" cost multiplier in a Virginia report; Texas parks in a Tennessee report; Florida land sales narrative in a Texas appraisal), broken OLE links ("Error! Not a valid link." throughout Buffalo Junction's delivered doc), `#REF!` formulas, and orphaned sections. **Deterministic generation from a validated data store eliminates exactly the defect class the current process suffers from.**

### 1.5 The narrative skeleton is stable; content divides cleanly into 5 types

The ~18-section skeleton below has been stable across years and market types. Every block is one of: BOILERPLATE (identical across reports), PARAMETERIZED (template + property values), DATA-TABLE (rendered from the model or external data), NARRATIVE-JUDGMENT (analyst prose), or FIGURE (map/photo/chart).

### 1.6 The financial model is a deterministic chain with ~10 judgment inputs

```
ToT Intake ──► Site Dev Cost (MVS $/site × multipliers)
          ──► Unit Costs (component build-up per unit type)
          ──► Add'l Bldg Improvements
                    └─► Total Project Cost ──► loan sizing (loops back to intake)
                                          ──► RE Taxes (assessed value × ratio × mill levy)
Sage DB pivots + AirDNA + Best Comps ──► Rate Projection (indicators + ★subject rates)
                                     ──► Occupancy Projection (indicators + ★stabilized occ + ramp)
                    └─► Monthly PF (Year 1) ──► 10-Year PF ──► Financing (DCR, CoC, payback)
                                                          ──► IRR (equity yield, reversion)
```

★ = analyst judgment. The full judgment list: subject projected low/peak rate per unit type; stabilized low/peak occupancy per unit type; quality scores (0–5) for subject and comps; the "Real Market Adj." cost multiplier (~1.3); per-unit build costs; marketing Year 1/2 dollar overrides; staffing counts/wages; assessment ratio + mill levy (assessor call); loan terms; the seasonal month split (4 low / 8 peak). Everything else is arithmetic.

---

## 2. Report anatomy and automation difficulty

| # | Section | Type | Automation | Data needed |
|---|---|---|---|---|
| 1 | Cover / TOC / Transmittal / Certification / Scope | BOILERPLATE + PARAM | **EASY** — mail-merge | Intake |
| 2 | Executive Summary | PARAM + DATA-TABLE + JUDGMENT | **MEDIUM** — assembles from all other sections | Model outputs |
| 3 | SWOT Analysis | JUDGMENT (large reusable bullet library) | **HARD (LLM-assisted)** | Everything |
| 4 | Project Overview | DATA-TABLE + PARAM + FIGURE | **EASY–MEDIUM** | Intake, client photos/site plan |
| 5 | Site Analysis (14 fixed attributes) | PARAM + FIGURE | **MEDIUM** | Parcel/GIS, FEMA flood, FWS wetlands, FEMA NRI wildfire, zoning |
| 6 | Development Costs | DATA-TABLE | **MEDIUM–HARD** | MVS cost data (licensed), vendor quotes, multipliers |
| 7 | Industry Overview (8–15 pp) | BOILERPLATE (2 variants: RV, glamping; refreshed annually) | **EASY** | Annual stats refresh |
| 8 | Area Analysis (state/county/city) | PARAM (already LLM-generated today) | **EASY–MEDIUM** | Geography names, census facts |
| 9 | Demand Indicators (8–15 pp) | DATA-TABLE + FIGURE + PARAM | **MEDIUM** | ESRI/STDB drive-time demographics, WeatherSpark, tourism economics, NPS IRMA + state park visitation, traffic counts |
| 10 | Supply & Competition | DATA-TABLE + JUDGMENT | **MEDIUM–HARD** | Sage DB pivots, AirDNA, planning-dept calls |
| 11 | Comparables | JUDGMENT + DATA-TABLE | **HARD** | Comp selection, rate scraping, occupancy calls, quality scoring |
| 12 | Rate Projection | DATA-TABLE + ★judgment | **MEDIUM–HARD** — indicators auto; subject rate is analyst-approved | Comps, Sage pivots |
| 13 | Occupancy Projection | DATA-TABLE + ★judgment | **MEDIUM–HARD** — same pattern | AirDNA, hotel data, comp calls |
| 14 | Revenue Projection | DATA-TABLE | **EASY** (given drivers) | Model |
| 15 | Operating Expenses (per-line build-up) | PARAM + DATA-TABLE | **EASY–MEDIUM** | Wages, utility costs, assessor data, expense comparables |
| 16 | 10-Year Pro Forma + Monthly PF | DATA-TABLE | **EASY** (given drivers) | Model |
| 17 | Feasibility Conclusion (DCR, CoC, IRR, verdict) | DATA-TABLE + JUDGMENT | **EASY math / HARD verdict** | Model, RealtyRates benchmarks |
| 18 | Assumptions & Limiting Conditions / Qualifications | BOILERPLATE | **EASY** | — |

Rough authoring-effort split by page share: ~35% is EASY (boilerplate/mail-merge/model tables), ~45% is MEDIUM (data pipelines + LLM drafting over real data), ~20% is HARD (judgment + fieldwork, where the target is *assist and pre-fill*, not replace).

---

## 3. Current pipeline vs. target

The existing `lib/ai-report-builder/` pipeline (entry: `app/api/admin/reports/generate-draft/route.ts`) is a **draft scaffolding tool covering ~25–35% of narrative work and ~0% of the financial model**:

**Works today:** input validation; enrichment (geocode, `feasibility_comp_units` ADR benchmarks, comps from 6 sources, state-level Census/GDP, Tavily web research, WeatherSpark); 5 parallel GPT-4o sections (exec summary, transmittal, SWOT, site analysis, demand indicators); Marshall & Swift-style dev-cost tables via the Site Builder cost engine; DOCX assembly into the real RV/glamping templates (docxtemplater + OOXML surgery); XLSX intake-sheet fill + comps dump; audit logging and storage.

**Missing / broken (in priority order):**

1. **No financial model is computed.** No rate/occupancy projection, pro forma, NOI, financing, DCR, CoC, or IRR — and the generated "feasibility conclusion" is a canned sentence claiming "an adequate internal rate of return" that was never calculated (integrity risk).
2. Two generated sections (`letter_of_transmittal`, `comparables_analysis`) are silently dropped — templates lack their placeholders.
3. Financial/Area/Supply sections of the DOCX retain the **previous project's stale content** — the exact defect class the corpus shows analysts already struggle with.
4. Demographics are state-level 2020 ACS; the real reports need 60/120/180-minute drive-time profiles (ESRI/STDB).
5. No AirDNA, no NPS/state-park visitation, no tourism economics, no FEMA flood/wetlands/wildfire figures, no maps of any kind.
6. Past-report comps are filtered by state only, with `distance_miles` copied from the *original* study — not distance to the new subject.
7. Dev costs: soft costs hardcoded 15%, land = $0, unknown unit types silently skipped; regenerate route skips dev costs entirely.
8. XLSX round-trips through SheetJS CE (drops charts/styling); only the intake sheet is written — none of the model's driver cells.
9. Synchronous request (no job queue/progress); fact-check heuristics are buggy; guardrails/RAG off by default.

---

## 4. Target architecture

**Core principle: model-first, narrative-second.** Compute the entire financial model deterministically in TypeScript from a validated project record; render the Excel workbook and the Word tables from the *same computed values*; use LLMs only for prose over real data. Replace OLE links with generated native tables. Every value carries provenance.

```
┌─────────────┐   ┌──────────────────┐   ┌───────────────────┐   ┌──────────────┐
│ 1. INTAKE    │──►│ 2. ENRICHMENT     │──►│ 3. ASSUMPTIONS     │──►│ 4. MODEL      │
│ (ToT schema) │   │ connectors w/     │   │ auto-proposed +    │   │ engine (TS)   │
│              │   │ provenance store  │   │ analyst-approved   │   │ deterministic │
└─────────────┘   └──────────────────┘   └───────────────────┘   └──────┬───────┘
                                                                        │
┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────▼──────┐
│ 7. REVIEW & QA    │◄──│ 6. ASSEMBLY         │◄──│ 5. NARRATIVE GENERATION      │
│ gates + analyst   │   │ DOCX + XLSX + maps  │   │ section generators (LLM +   │
│ workflow          │   │                     │   │ templates + boilerplate lib) │
└──────────────────┘   └────────────────────┘   └─────────────────────────────┘
```

### 4.1 Intake (project record)

Expand the `generate-draft` input schema to the full ToT field bank (§1.2). Store as a first-class `report_projects` record (not just `reports` columns): client block, property block, unit slots (typed against the Site Builder unit taxonomy so cost mapping never silently skips), amenities/utilities/attractions free-text, financing terms, flags (`report_type`: feasibility | market analysis; `confidential_calls`). Validate with zod. The existing report-builder UI grows into a multi-step intake form mirroring the paper form analysts already send clients.

### 4.2 Enrichment connectors (each: fetch → normalize → store with source + timestamp)

| Data | Source | Status |
|---|---|---|
| Geocode + county | Google Maps | ✅ exists |
| Drive-time demographics (60/120/180 min) | ESRI/STDB API (licensed — firm already pays for STDB) or Census ACS + isochrone (TravelTime/Mapbox) fallback | ❌ build — highest-value connector |
| Parcel / assessment / taxes | County GIS + assessor scrape (Regrid API as general solution) | ❌ build |
| FEMA flood zone | FEMA NFHL API (`msc.fema.gov` layers) | ❌ build |
| Wetlands | FWS Wetlands Mapper WMS | ❌ build |
| Wildfire risk | FEMA NRI API (EAL rating) | ❌ build |
| Climate + operating season | WeatherSpark (exists, flaky charts) → supplement NOAA normals for data, keep WS charts via headless screenshot | ⚠️ upgrade |
| NPS visitation | NPS IRMA Stats API (`irma.nps.gov/STATS`) | ❌ build |
| State park visitation | Per-state sources; cache in a `park_visitation` table | ❌ build (semi-manual refresh) |
| Tourism economics (state/county spending) | State tourism offices / Dean Runyan / trade.gov; annual cached tables | ❌ build (annual refresh job) |
| STVR market (rates/occ) | AirDNA API (subscription) | ❌ build |
| Sage comp database | `all_sage_data`, `hipcamp`, `all_roverpass_data_new`, `campspot`, `feasibility_comparables`, `feasibility_comp_units` | ✅ exists — fix distance ranking (geocode past-report comps once, store lat/lng) |
| Comp rates (booking-engine scrape) | Firecrawl/Tavily agent per comp, seasonal grid (mid-week/weekend/holiday × low/peak) — the workbook's own scraping prompt defines the exact output table | ⚠️ upgrade from regex |
| Emerging competitors | LLM web search + planning-department call script generated for analyst | ⚠️ assist only |
| Financing benchmarks | RealtyRates survey (manual quarterly table) | ❌ build (quarterly refresh) |
| Construction costs | Digitize the MVS tables used (Sections 63/66/99 + multipliers) into `cce_cost_rows`-style tables; Site Builder engine already computes from catalogs | ⚠️ extend |
| Wages / utilities | BLS OES + state minimum wage table + EIA electricity rates | ❌ build |

### 4.3 Financial model engine (the centerpiece — `lib/feasibility-model/`)

Implement the workbook's calculation chain (§1.6) as a pure, unit-tested TypeScript module. Inputs: project record + assumption set. Outputs: every table the report needs (site dev costs, unit costs, total project cost, RE taxes, rate projections, occupancy ramp, monthly PF Year 1, 10-year PF, financing/DCR/CoC/payback, IRR with reversion).

- **Assumption objects with three states:** `proposed` (heuristic from indicators — e.g. subject rate = quality-adjusted comp average, occupancy = indicator average ± quality delta), `analyst_set`, `locked`. The engine runs on any state; the report can't ship until judgment assumptions are `analyst_set`.
- Mirror the model's structure exactly (validated against the sampled workbooks' numbers — e.g. Buffalo Junction: TDC $14,440,166, Yr-5 NOI $1,809,995, DCR 1.59, IRR 18.5%) so analysts trust it.
- Reuse `lib/site-builder/cost-calculator.ts` for unit/site costs; add soft-cost/contingency/FF&E/interest-reserve lines currently stubbed.

### 4.4 Narrative generation

- **Section generators with explicit data contracts** — each of the 18 sections is a function `(projectRecord, enrichment, modelOutput) → SectionContent` where SectionContent = prose blocks + tables + figures + citations. No section may cite a number that isn't in its inputs.
- **Boilerplate library** (DB-backed, versioned): Industry Overview RV + glamping variants, scope/certification/assumptions/qualifications, SWOT bullet bank, expense-section lead-ins. Annual refresh workflow replaces today's "whatever was in the template."
- **LLM prose** (Area Analysis, guest experience, demand conclusion, SWOT draft, exec summary synthesis): keep the current provider layer but upgrade models, generate against the structured data record with mandatory citations, and apply the demand-rubric scoring already codified in the workbook (population thresholds per drive-time ring) so conclusions are rule-anchored.
- **Figures:** static maps via Google Static Maps/Mapbox (location, competitors, parks); FEMA/wetlands/wildfire maps via headless-browser screenshot of the official viewers (the SOP's exact click-paths); WeatherSpark charts via screenshot; STDB infographic via API export. Client photos/site plans uploaded through the intake UI.

### 4.5 Assembly

- **DOCX:** move from OOXML regex surgery toward a fully placeholder-driven template (add the missing `{letter_of_transmittal}`, `{comparables_analysis}`, per-section table anchors; docxtemplater loops for tables). Purge all stale linked-object remnants from templates once. Native Word tables replace OLE links — kills the "Error! Not a valid link." class forever.
- **XLSX:** switch to ExcelJS (styles/charts survive). Write the intake sheet AND the driver cells (rates, occupancy, cost lines, financing terms) into the real model template so the delivered workbook remains a live, analyst-editable model whose formulas recompute — with a validation pass asserting workbook outputs equal engine outputs (catches template drift).
- Keep the Cost Analysis XLSX export as is (already ExcelJS).

### 4.6 Review workflow & QA gates

- **Job queue with progress** (enrichment can take minutes): stages surfaced in the UI; resumable; artifacts versioned.
- **Assumption review screen:** the ~10 judgment drivers presented with their indicator evidence (comp tables, AirDNA, Sage pivots) side by side; analyst adjusts and locks; regenerate is cheap and deterministic.
- **Automated QA gates** (blocking, not advisory): geography consistency (every place name in output ∈ subject's state/county/city set — would have caught every stale-data defect in the corpus); cross-artifact number consistency (DOCX tables ≡ XLSX ≡ engine); completeness (every section landed; no `[Image placeholder]` above threshold; no `#REF!`/broken fields); citation coverage on numeric claims; intake echo-check (parcel, acres, unit counts appear correctly everywhere).
- **Analyst task list** auto-generated for the irreducibly human steps: occupancy calls (with the script + phone numbers pre-filled), assessor call (assessment ratio/mill levy), planning-department calls, site-visit photo checklist.

---

## 5. Phased roadmap

### Phase 0 — Fix what exists (small, immediate)
Add missing template placeholders; blank or regenerate stale financial/Area/Supply template sections; fix regenerate-route dev-cost omission; geocode past-report comps and rank by true distance; fix fact-check bugs; make `include_web_research`/`market_type` defaults consistent. **Outcome: current drafts stop shipping wrong-project content.**

### Phase 1 — Financial model engine + live XLSX (the unlock)
Build `lib/feasibility-model/` mirroring the workbook chain; validate against ≥5 past workbooks' numbers; assumption objects with proposed/analyst/locked states; ExcelJS assembly writing driver cells; feed computed tables into exec summary, revenue/expenses/pro forma/feasibility-conclusion sections. Remove the canned IRR sentence. **Outcome: the report's financial core — the part clients pay for — is generated and internally consistent. Coverage jumps from ~30% to ~55–60%.**

### Phase 2 — Data connectors
Drive-time demographics (ESRI/STDB or isochrone+ACS), FEMA flood/wetlands/wildfire, NPS IRMA + state parks, tourism economics tables, AirDNA, parcel/assessor, wages/utilities, RealtyRates table. Provenance store + annual/quarterly refresh jobs. **Outcome: Demand Indicators, Site Analysis, Supply & Competition become data-complete; coverage ~70–75%.**

### Phase 3 — Full narrative + figures
Section generators for all 18 sections; boilerplate library with versioning; map/screenshot figure generation; comp rate-scraping agent producing the seasonal rate grid; SWOT/exec-summary synthesis over the full record. **Outcome: a complete first-draft report; coverage ~80–85% of authoring effort.**

### Phase 4 — Review workflow + QA gates
Job queue + progress UI; assumption review screen; blocking QA gates; analyst task list for calls/fieldwork; report diffing between regenerations. **Outcome: production-grade process; analyst time shifts to judgment and verification only.**

### Phase 5 (optional) — Adjacent products
The appraisal shares ~60% of this machinery (area/industry/comps/revenue/expenses/pro forma). Add the appraisal-only layer (land sales, improved sales grids, cap-rate development, reconciliation, USPAP wrapper) as an alternative back end on the same NOI stream; market analyses are already a subset (feasibility minus dev-costs/financing depth).

---

## 6. What stays human (by design)

Comp selection and verification; occupancy/assessor/planning-department calls (scripted + pre-filled by the system); quality scoring; final subject rate/occupancy sign-off; site visit + photography; the go/no-go feasibility verdict; client-specific recommendations. The system's job is to make these the *only* things an analyst does.

## 7. Principal risks

1. **Model-engine trust** — mitigate by regression-testing against historical workbooks and shipping a live Excel model analysts can audit.
2. **ESRI/STDB licensing for API use** — confirm terms; isochrone+ACS fallback loses some fields (consumer spending) but covers the rubric inputs.
3. **MVS cost data licensing** — the digitized subset must stay within the firm's license; costs drift, so keep the "Real Market Adj." as an explicit analyst dial.
4. **Template brittleness** — one-time template rebuild with explicit anchors is a prerequisite for reliable assembly; budget it in Phase 1.
5. **LLM fabrication** — contained by data contracts + citation gates + geography checks; prose sections never introduce numbers.
