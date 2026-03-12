# Create Report Draft — Pipeline Documentation

**Page:** `/admin/create-report-draft`  
**API:** `POST /api/admin/reports/generate-draft`  
**Purpose:** Generate an AI-assisted feasibility study draft (DOCX or XLSX) from minimal property input.

---

## Overview

The Create Report Draft flow lets analysts generate a first-draft feasibility study by entering property details (name, location, unit mix, etc.). The system enriches the input with database benchmarks and geocoding, generates an executive summary via OpenAI, and assembles a DOCX or XLSX using templates.

---

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. UI (CreateReportDraftClient)                                                 │
│     User fills form → validates → POST /api/admin/reports/generate-draft        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2. API Route (generate-draft/route.ts)                                         │
│     • Auth: isManagedUser, isAllowedEmailDomain                                 │
│     • Parse & validate JSON body                                                │
│     • Build ReportDraftInput                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  3. Enrich (lib/ai-report-builder/enrich.ts)                                    │
│     Runs in parallel:                                                           │
│     • Benchmarks: feasibility_comp_units by unit_category (low/peak ADR)        │
│     • Comparables: feasibility_comparables by state (sample names)              │
│     • Geocode: address → lat/lng                                                │
│     • Web research (optional): Tavily for tourism/market context                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                         │
                    ▼                                         ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│  4a. DOCX Path                       │    │  4b. XLSX Path                        │
│  • generateExecutiveSummary (OpenAI)  │    │  • assembleDraftXlsx (template + data) │
│  • assembleDraftDocx (template +     │    │  • Return XLSX blob (no DB write)       │
│    executive_summary)                │    └──────────────────────────────────────┘
└──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  5. Persist (DOCX only)                                                          │
│     • Insert report into reports table                                           │
│     • Upload DOCX to report-uploads/{report_id}/report.docx                     │
│     • Update report with docx_file_path                                         │
│     • logAdminAudit                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  6. Response                                                                     │
│     • DOCX: blob + Content-Disposition attachment                                │
│     • XLSX: blob (template only, no report record)                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. UI — `app/admin/create-report-draft/`

| File | Role |
|------|------|
| `page.tsx` | Server component; exports metadata, renders client |
| `CreateReportDraftClient.tsx` | Form, validation, fetch, progress indicator, download |

**Form fields:**
- `property_name` (required)
- `address_1` (optional)
- `city`, `state`, `zip_code` (city, state required)
- `acres` (optional)
- `unit_mix` (type + count per row)
- `client_entity` (optional)
- `study_id` (optional; auto-generated if blank)
- `market_type` (outdoor_hospitality, glamping, rv, etc.)
- `include_web_research` (optional; when checked, fetches Tavily context for DOCX only)

**Actions:**
- **Generate DOCX** — Full pipeline: enrich → AI summary → assemble → save report → download
- **Export XLSX Template** — Enrich → assemble XLSX from template → download (no report record)

### 2. API Route — `app/api/admin/reports/generate-draft/route.ts`

- **Auth:** Session required; `isAllowedEmailDomain`; `isManagedUser`
- **Validation:** property_name, city, state required; ZIP format; acres ≥ 0; study_id format
- **Study ID:** Auto-generated as `DRAFT-YYYYMMDD-{8 hex chars}` if not provided
- **Format:** `format: 'docx' | 'xlsx'` in body; defaults to `docx`

### 3. AI Report Builder — `lib/ai-report-builder/`

| Module | Purpose |
|--------|---------|
| `enrich.ts` | Fetch benchmarks, comparables, geocode, optional Tavily (parallel) |
| `tavily-context.ts` | Tavily web search for tourism/market context |
| `generate.ts` | OpenAI GPT-4o executive summary |
| `assemble-docx.ts` | Docxtemplater: template + placeholders → DOCX |
| `assemble-xlsx.ts` | XLSX template + cell mapping → spreadsheet |
| `types.ts` | ReportDraftInput, EnrichedInput, BenchmarkRow, GeneratedSections |

---

## Enrichment Details

**Web research (optional)** — When "Include web research" is checked:
- Uses Tavily API (`TAVILY_API_KEY`) to fetch market context
- Queries: tourism stats, outdoor hospitality market, property-specific development news
- Results appended to AI prompt as supplementary context (benchmarks remain primary)
- Adds ~10–20 seconds; skipped for XLSX export

**Benchmarks** (`feasibility_comp_units`):
- Filter by `unit_category` (from unit_mix, via `normaliseUnitCategory`)
- Aggregate `low_adr`, `peak_adr` by category
- Output: `{ unit_category, avg_low_adr, avg_peak_adr, sample_count }[]`

**Comparables** (`feasibility_comparables`):
- Filter by `state`
- Up to 5 `comp_name` values
- Output: comma-separated string for AI prompt

**Geocoding** (`lib/geocode`):
- Input: address_1, city, state, zip_code, country
- Output: `{ lat, lng }` for report record

---

## AI Generation

**Model:** OpenAI `gpt-4o`  
**Temperature:** 0.4  
**Max tokens:** 800  

**Prompt includes:**
- Property name, location, acres, unit mix, client
- Regional benchmarks (JSON)
- Sample comparables (if any)
- Instruction to reference data, avoid fabrication, acknowledge limited data

---

## Templates

**Storage:** Supabase `report-templates` bucket  
**Market-type mapping:**
- `glamping` → `glamping/template.docx`, `glamping/template.xlsx`
- `rv`, `rv_glamping`, default → `rv/template.docx`, `rv/template.xlsx`

**DOCX placeholders:** `{property_name}`, `{location}`, `{client_entity}`, `{report_date}`, `{executive_summary}`

**Fallback:** Local `templates/feasibility-draft.docx` if Supabase fetch fails

---

## Storage & Database

| Resource | Location |
|----------|----------|
| Report record | `reports` table |
| DOCX file | `report-uploads/{report_id}/report.docx` |
| Templates | `report-templates/{market_type}/template.docx` |

---

## Related Docs

- [CREATE_REPORT_DRAFT_AUDIT.md](./CREATE_REPORT_DRAFT_AUDIT.md) — Issues, improvements, future features
- [CPO_INTERNAL_TOOLING_RECOMMENDATIONS.md](./CPO_INTERNAL_TOOLING_RECOMMENDATIONS.md) — Strategic context for Report Draft Generator
