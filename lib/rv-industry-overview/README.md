# RV Industry Overview data layer

**Entry point:** `getCampspotRvOverviewPageData()` in `campspot-rv-overview-page-data.ts` — one unified Campspot + RoverPass scan, fold in TypeScript, Postgres snapshot, Next.js tag cache.

## Standalone chart fetchers (removed)

`fetchCampspot*ChartData` / `getCampspot*ChartData` in individual `campspot-*-chart-data.ts` files performed **Campspot-only** full-table scans and are **removed** to avoid drift from the unified pipeline (no RoverPass, duplicate IO).

Use:

- `getCampspotRvOverviewPageData()` — page load
- `recomputeCampspotRvOverviewPageData()` — refresh / ETL
- `aggregateCampspotRowsTo*` / `fold*` — unit tests and fold logic

## Analyst controls (admin UI)

- `?source=all|campspot` — combined scan vs Campspot-only prefold (`campspotOnly` on payload; refresh snapshot after deploy)
- `?year=2024|2025|both` — visual emphasis on YoY charts (trends, resort size)
- `?rate=retail_annual|retail_seasonal` — documents which rate columns apply (season chart uses seasonal fields)
- RoverPass rules: `docs/data/RV_OVERVIEW_ROVERPASS_PARITY.md`, `lib/rv-industry-overview/rv-overview-source-parity.ts`
- Export pack (ZIP + README one-pager): client button; map blank capture → `GET /api/admin/rv-industry-overview/map-export`

## Maintainability

- **No legacy scanners** in `campspot-*-chart-data.ts` — enforced by `__tests__/lib/rv-industry-overview/rv-overview-no-legacy-fetch.test.ts`
- **Snapshot sanitize on read** — `sanitizeRvOverviewPageDataPayload` in `readRvOverviewPayloadFromPg`
- **Row caps** — `CAMPSPOT_RV_OVERVIEW_MAX_ROWS` / `ROVERPASS_RV_OVERVIEW_MAX_ROWS` (env); `scanMeta` + `hitRowCap` on refresh API
- **Audit** — `refresh-cache` calls `logAdminAudit` (`resource_id: rv-industry-overview`)
- **Runbook** — `docs/data/PHASE4_DOWNSTREAM_REFRESH.md` (snapshot versioning after deploy)

### Test coverage gaps (known)

- No Playwright/visual regression for 11 charts + maps yet — add under `e2e/` when the admin test harness is introduced.
- `html2canvas` capture is not unit-tested (browser-only); file stem + payload sanitize are covered in Jest.
