# Project pipeline cron sync (production)

Hourly service-account sync keeps `project_pipeline_jobs` fresh so **Job Pipeline** (`/admin/job-pipeline`) stays in sync with the Google Sheet without requiring OAuth backfill on every visit.

## Schedule

- **Route:** `GET/POST /api/cron/sync-project-pipeline`
- **Vercel cron:** `30 * * * *` (hourly at :30 UTC) — see `vercel.json`
- **Tabs synced:** 2026 Jobs → 2020 (all `PROJECT_PIPELINE_SHEET_TABS`)
- **Failure handling:** each tab is attempted independently; retryable errors (quota, timeouts) are retried once. Remaining years still sync if one tab fails. HTTP 500 when any tab is still failing (`failedSheets` in the JSON body).

## Required Vercel env vars

| Variable | Purpose |
|----------|---------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` **or** `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Read pipeline Google Sheet server-side |
| `GOOGLE_PROJECT_PIPELINE_SHEET_ID` | Spreadsheet ID |
| `SUPABASE_SECRET_KEY` (or service role) | Upsert mirror rows |
| `CRON_SECRET` | Recommended — restricts cron to Vercel / Bearer token |

When service account credentials are present, `getProjectPipelineAuthMode()` returns `service_account` and the API sets `cronSyncEnabled: true`.

## OAuth vs service account

| Mode | Mirror source | User experience |
|------|---------------|-----------------|
| **Service account + cron** | Hourly cron + optional manual `npm run sync:project-pipeline` | Job Pipeline loads from Supabase; no connect prompt when mirror has rows |
| **OAuth only** | Per-user browser connect + tab-by-tab oauth-sync | First visitor (or empty mirror) must connect Google Sheets |

**Production recommendation:** configure service account + share the pipeline sheet with the service account email as Viewer. Keep OAuth client ID as fallback for row-segment refresh when quota allows.

## Manual backfill

```bash
npm run migrate:project-pipeline   # once
npm run sync:project-pipeline      # all tabs
```

## Verify in production

1. Vercel → Cron → confirm `sync-project-pipeline` runs successfully each hour.
2. Supabase → `project_pipeline_sync_runs` has recent `completed_at` rows for every year tab.
3. Job Pipeline loads without `requiresOAuth` for users when `countAllProjectPipelineJobsInSupabase` > 0.
