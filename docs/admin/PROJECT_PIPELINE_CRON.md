# Project pipeline cron sync (production)

Hourly service-account sync keeps the **current calendar year** of `project_pipeline_jobs` fresh so **Job Pipeline** (`/admin/job-pipeline`) stays in sync with that Google Sheet tab (e.g. `2026 Jobs`) without requiring OAuth backfill on every visit.

Historical year tabs are not part of the hourly cron. Use Job Pipeline **Refresh** with All Years, or `npm run sync:project-pipeline -- --all`, when older tabs need a full resync.

## Schedule

- **Route:** `GET/POST /api/cron/sync-project-pipeline`
- **Vercel cron:** `30 * * * *` (hourly at :30 UTC) — see `vercel.json`
- **Tab synced:** current UTC calendar year only (`resolveCurrentProjectPipelineSheetTab()`, e.g. `2026 Jobs`). Falls back to the newest known tab if that year is not in `PROJECT_PIPELINE_SHEET_TABS` yet.
- **Failure handling:** retryable errors (quota, timeouts) are retried once. HTTP 500 when the current-year tab is still failing (`failedSheets` in the JSON body).

## Required Vercel env vars

| Variable | Purpose |
|----------|---------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` **or** `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Read pipeline Google Sheet server-side |
| `GOOGLE_PROJECT_PIPELINE_SHEET_ID` | Spreadsheet ID |
| `SUPABASE_SECRET_KEY` (or service role) | Upsert mirror rows |
| `CRON_SECRET` | Recommended — restricts cron to Vercel / Bearer token |

When service account credentials are present, `getProjectPipelineAuthMode()` returns `service_account` and the API sets `cronSyncEnabled: true`.

### Where to put the JSON key

Do **not** commit the downloaded `.json` key to the repo. Paste it into Vercel:

1. [Vercel dashboard](https://vercel.com) → project **sage-resources-subdomain** → **Settings** → **Environment Variables**
2. Create (or edit) **`GOOGLE_SERVICE_ACCOUNT_JSON`**
3. Paste the **entire** key file as the value (it starts with `{` and includes `"type": "service_account"`, `"private_key"`, and `"client_email"`)
4. Enable **Production** and **Preview**
5. **Redeploy** Production so the cron process picks up the variable

The key’s `client_email` is `google-sheets-export@sageai-475215.iam.gserviceaccount.com`. That email is also the app default, so you do not need a separate `GOOGLE_SERVICE_ACCOUNT_EMAIL` variable if you paste the full JSON.

Share the Job Numbers spreadsheet with that address as **Viewer** (Share → add email → Viewer → Send).

For local scripts, put the same JSON in `.env.local` (gitignored):

```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

## OAuth vs service account

| Mode | Mirror source | User experience |
|------|---------------|-----------------|
| **Service account + cron** | Hourly current-year cron + optional manual `npm run sync:project-pipeline` | Job Pipeline loads from Supabase; no connect prompt when mirror has rows |
| **OAuth only** | Per-user browser connect + tab-by-tab oauth-sync | First visitor (or empty mirror) must connect Google Sheets |

**Production recommendation:** configure `GOOGLE_SERVICE_ACCOUNT_JSON` on Vercel and share the pipeline sheet with `google-sheets-export@sageai-475215.iam.gserviceaccount.com` as Viewer. Keep OAuth client ID as fallback for row-segment refresh when quota allows.

## Manual backfill

```bash
npm run migrate:project-pipeline   # once
npm run sync:project-pipeline -- --all   # all year tabs
npm run sync:project-pipeline -- --sheet "2026 Jobs"
```

## Verify in production

1. Vercel → Cron → confirm `sync-project-pipeline` runs successfully each hour.
2. Supabase → `project_pipeline_sync_runs` has a recent `completed_at` row for the current-year tab (e.g. `2026 Jobs`).
3. Job Pipeline loads without `requiresOAuth` for users when `countAllProjectPipelineJobsInSupabase` > 0.
