# Job Pipeline review calendar events (Google Calendar)

When a consultant **submits** or **resubmits** a project for review, the app can create a 30-minute calendar block on the **project manager’s** primary Google Calendar (same routing as the submit-for-review email).

## Prerequisites

1. **Google Calendar API** enabled on the same GCP project as the pipeline service account.
2. **Service account** credentials in `GOOGLE_SERVICE_ACCOUNT_JSON` (or email + private key).
3. **Domain-wide delegation** in Google Workspace Admin:
   - Security → Access and data control → API controls → Domain-wide delegation
   - Add the service account’s OAuth client ID
   - Scope: `https://www.googleapis.com/auth/calendar.events`
4. The PM’s mailbox must be a Workspace user (e.g. `harsell@sageoutdooradvisory.com`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PIPELINE_CALENDAR_ENABLED` | Yes (prod) | Must be `true` to create events |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | Same service account used for pipeline Sheets sync |
| `GOOGLE_CALENDAR_TIMEZONE` | No | Defaults to `America/New_York` |
| `PIPELINE_CALENDAR_TEST_RECIPIENT` | No | When set, all review events go to this user’s calendar (staging) |

## What gets created

- **Title:** `Review: Job #… — Client` (or `Resubmit review: …`)
- **When:** 9:00–9:30 AM on the **next business day** after submission (skips weekends; not tied to the job due date)
- **Description:** job context (including due date), author note, link to `/admin/job-pipeline`
- **Reminders:** popup 15 min before, email 60 min before
- **Resubmit:** updates the same calendar event (matched by stable `iCalUID`) instead of creating a duplicate

Triggered from `notifyPipelineJobChanges` after a successful `submit_for_review` / `resubmit` review action (same path as email + Slack).

## Production rollout checklist

1. **`PIPELINE_CALENDAR_ENABLED=true`** — set on Vercel Production (required to create events).
2. **`GOOGLE_SERVICE_ACCOUNT_JSON`** (or email + private key) — must be present on Vercel; same credentials as pipeline Sheets cron sync. Calendar creation is skipped when missing even if `PIPELINE_CALENDAR_ENABLED=true`.
3. **Google Calendar API** enabled on the GCP project.
4. **Domain-wide delegation** configured with scope `https://www.googleapis.com/auth/calendar.events`.
5. **Redeploy** after env changes so serverless functions pick up new variables.
6. **Preview/staging:** set `PIPELINE_CALENDAR_TEST_RECIPIENT` to route all review events to one mailbox while testing.

## Manual test

```bash
PIPELINE_CALENDAR_ENABLED=true \
PIPELINE_CALENDAR_TEST_RECIPIENT=harsell@sageoutdooradvisory.com \
npm run test:pipeline-review-calendar
```

Then confirm the event appears on the primary calendar for `harsell@sageoutdooradvisory.com`.
