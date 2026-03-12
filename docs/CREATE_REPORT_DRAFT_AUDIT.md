# Create Report Draft — Detailed Audit

**Page:** `/admin/create-report-draft`  
**Date:** March 2025  
**Scope:** Issues, improvements, and future features for the AI Report Builder MVP.

---

## 1. Issues (Bugs & Edge Cases)

### 1.1 Critical

| Issue | Location | Description |
|-------|----------|-------------|
| **No page metadata** | `app/admin/create-report-draft/page.tsx` | Page lacks `Metadata` export for SEO/title. Other admin pages (dashboard, site-design) use `export const metadata`. Create Report Draft is client-only; add a layout or wrapper with metadata. |
| **`crypto.randomUUID()` browser support** | `page.tsx:24` | `crypto.randomUUID()` is supported in modern browsers but may fail in older environments. Consider a fallback: `crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`` |
| **Empty unit mix sent as `[]`** | API + generate.ts | When user leaves default row with count 0 or removes all valid rows, `unit_mix` is `[]`. AI prompt says "Not specified" — acceptable. But benchmarks query uses `unitCategories` from `unit_mix`; with `[]` no benchmarks are fetched. Consider explicit "No unit mix specified" in prompt. |
| **Report created before DOCX upload** | `generate-draft/route.ts:105-129` | Report is inserted with `docx_file_path: null`, then file is uploaded, then updated. If upload succeeds but the update fails, the report would have no `docx_file_path`. Add a transaction or retry for the update. |

### 1.2 Moderate

| Issue | Location | Description |
|-------|----------|-------------|
| **Unit type → category mapping gaps** | `enrich.ts` + `normaliseUnitCategory` | `UNIT_TYPES` includes "Bell Tent", "Bubble Tent", "Glamping Pod", "Shepherd's Hut", "Silo", "Tipi", "Wall Tent" — these map to `other` or `tent`. Benchmarks for `other` may be noisy (mixed unit types). Consider surfacing "Limited benchmark data for this unit type" in the UI. |
| **No request timeout** | `page.tsx` | Fetch has no `AbortController`/timeout. Generation can take 30+ seconds; user may refresh or navigate away. Add timeout (e.g. 90s) and cancel on unmount. |
| **Success message clears on next submit** | `page.tsx:62` | `setSuccess(null)` on submit clears the previous success message. If user generates again quickly, the "downloaded successfully" message disappears. Consider keeping it until next success or explicit dismiss. |
| **Study ID collision** | `generateStudyId()` | `DRAFT-YYYYMMDD-xxxx` uses 4 random hex chars (~65K combinations). Under heavy use, collisions are possible. Consider 6–8 chars or a UUID suffix. |
| **Template missing in Vercel build** | `assemble-docx.ts` | Template is loaded from `templates/feasibility-draft.docx`. Ensure the file is committed and included in the build. The `create-feasibility-draft-template.ts` script must be run before first deploy if the template is not in git. |

### 1.3 Minor

| Issue | Location | Description |
|-------|----------|-------------|
| **ZIP validation** | `page.tsx` | ZIP code is free text. No format validation (e.g. 5 or 9 digits for US). |
| **Acres can be negative** | `page.tsx` | `min={0}` on input, but `parseFloat(acres)` can produce NaN or negative if user types invalid data. Server validates but could show inline error. |
| **Duplicate unit types** | `page.tsx` | User can add multiple rows with same unit type (e.g. 2× Cabin). That is valid (e.g. Phase 1 vs Phase 2) but may confuse benchmarks — we aggregate by category. No issue, but consider a note. |
| **`BodyInit` cast** | `generate-draft/route.ts:175` | `docxBuffer as unknown as BodyInit` is a type escape. Works in Node/Next.js but is fragile. Prefer `new Response(docxBuffer)` or ensure Buffer is accepted. |

---

## 2. Improvements

### 2.1 UX

| Improvement | Priority | Description |
|-------------|----------|-------------|
| **Progress indicator** | High | Show multi-step progress: "Enriching data…" → "Generating summary…" → "Assembling document…". Requires API changes (streaming or status polling) or at least a clearer loading message. |
| **Link to created report** | High | After success, show a link to `/admin/reports/[studyId]` so user can view/edit the new draft. Currently we only download; the report exists in DB. |
| **"View in Past Reports"** | Medium | Add a link to filter Past Reports by the new `study_id` or open the report detail page directly. |
| **Address field** | Medium | Add optional `address_1` for street address. Improves geocoding and would populate the DOCX if we add it to the template. |
| **Market type selector** | Medium | Add dropdown: Glamping, RV, RV & Glamping, Marina, etc. (match `MARKET_TYPE_OPTIONS` from past-reports). Default "outdoor_hospitality" is broad. |
| **Unit mix subtotal** | Low | Show "Total units: X" below the unit mix list. |
| **Study ID format hint** | Low | Placeholder says "e.g. 25-100A-01" — add a small note: "Leave blank to auto-generate DRAFT-YYYYMMDD-xxxx". |
| **Dismiss success/error** | Low | Add a dismiss button for success and error messages. |
| **Form persistence** | Low | Consider `sessionStorage` to restore form if user accidentally navigates away during generation. |

### 2.2 Accessibility

| Improvement | Priority | Description |
|-------------|----------|-------------|
| **Form labels** | High | Unit mix rows use a parent `<label>` but the Select/Input lack `id`/`htmlFor`. Ensure each field has an associated label for screen readers. |
| **Loading state announcement** | Medium | Add `aria-live="polite"` and `aria-busy` during loading so screen readers announce the state change. |
| **Error focus** | Low | When `setError()` is called, focus the first invalid field or an error summary for keyboard users. |

### 2.3 Code Quality

| Improvement | Priority | Description |
|-------------|----------|-------------|
| **Extract US_STATES** | Low | Move `US_STATES` to `lib/constants.ts` or `lib/us-states.ts` for reuse. |
| **Validate study_id format** | Low | If user provides study_id, validate format (e.g. `^\d{2}-\d{3}[A-Z]?-\d{2}$` or allow DRAFT-*). Reject invalid formats with a clear error. |
| **Centralize report insert payload** | Low | The insert object in the API route is large. Consider a `buildReportInsertPayload()` helper for consistency with other report-creation flows. |
| **Docxtemplater error handling** | Medium | If `doc.render()` throws (e.g. missing placeholder), the error may be opaque. Catch and rethrow with a clearer message. |

### 2.4 Performance

| Improvement | Priority | Description |
|-------------|----------|-------------|
| **Parallel enrichment** | Medium | `enrich.ts` runs: (1) benchmarks query, (2) comparables query, (3) geocode. (1) and (2) can run in parallel with `Promise.all`. Geocode can run in parallel too. |
| **Benchmark query optimization** | Low | Add `.limit(5000)` or aggregate in SQL to avoid pulling large datasets. Current approach fetches all rows and aggregates in JS. |
| **Template caching** | Low | Template is read from disk on every request. Consider caching the template buffer in memory (invalidated on deploy). |

---

## 3. Future Features

### 3.1 Phase 2 — Richer Output

| Feature | Description |
|---------|-------------|
| **XLSX generation** | Generate a companion XLSX with Comps Summ., Rates Proj., etc. from benchmarks. Match the structure expected by `parseWorkbook`. |
| **Additional DOCX sections** | Add Market Analysis, SWOT, Recommendations via AI. Extend `GeneratedSections` and the template. |
| **Template selection** | Allow user to pick a template (e.g. "Feasibility Study", "Appraisal") with different placeholders. |
| **Custom placeholders** | Let user add custom text snippets (e.g. "Report Purpose") that get injected into the template. |

### 3.2 Phase 3 — Smarter Generation

| Feature | Description |
|---------|-------------|
| **Comparable suggestion** | Before generating, show "Suggested comparables from your region" and let user select which to include. |
| **Benchmark preview** | Show "Based on X properties in [state], median ADR for [unit type] is $Y" before generation. |
| **Claude as alternative** | Add Anthropic/Claude as an optional provider. Provider-agnostic interface in `generate.ts`. |
| **Section-level regeneration** | Allow "Regenerate executive summary" from the report detail page without recreating the whole draft. |
| **Web research (Tavily)** | Optional: fetch market context from the web (demographics, tourism stats) to enrich the prompt. |

### 3.3 Phase 4 — Workflow

| Feature | Description |
|---------|-------------|
| **Draft from existing report** | "Create draft from template" — use an existing report as a template, change key fields, regenerate. |
| **Batch generation** | Upload a CSV of properties (name, city, state, …) and generate multiple drafts. |
| **Review workflow** | Integrate with `report_sections` and status (Draft → In Review → Approved). |
| **Version history** | Store previous versions of generated drafts when user regenerates. |

---

## 4. Security & Compliance

| Item | Status | Notes |
|------|--------|-------|
| **Auth** | OK | Uses `isManagedUser`, `isAllowedEmailDomain` — consistent with other admin routes. |
| **Input sanitization** | OK | Trimmed strings, parsed numbers. No raw HTML injection. |
| **Rate limiting** | Missing | No rate limit on `generate-draft`. Long-running + OpenAI cost. Consider rate limit (e.g. 10/hour per user). |
| **Audit logging** | OK | `logAdminAudit` records action. Uses `action: 'upload'` with `generated_draft: true` in details. |
| **AI disclaimer** | Missing | Generated content should include a disclaimer: "AI-assisted draft; requires human review." Add to template or prompt. |

---

## 5. Summary Table

| Category | Count |
|----------|-------|
| Critical issues | 4 |
| Moderate issues | 5 |
| Minor issues | 4 |
| UX improvements | 9 |
| A11y improvements | 3 |
| Code quality improvements | 4 |
| Performance improvements | 3 |
| Future features (Phase 2–4) | 12 |

---

## 6. Recommended Next Steps

1. **Immediate:** Add page metadata, link to created report after success, and rate limiting.
2. **Short-term:** Progress indicator, address field, market type selector, parallel enrichment.
3. **Medium-term:** XLSX generation, additional DOCX sections, comparable suggestion.
4. **Long-term:** Claude support, batch generation, review workflow.
