# Job Pipeline email (Resend)

Transactional email for **Job Pipeline** review-status and due-date changes. Sends via [Resend](https://resend.com) from the verified domain **`alerts.sageoutdooradvisory.com`**.

Supabase magic-link auth (gated content) is **not** on Resend — it keeps the default Supabase email provider.

## Domain and sender

| Item | Value |
|------|-------|
| Sending domain | `alerts.sageoutdooradvisory.com` |
| Default From | `Sage Job Pipeline <active-jobs@alerts.sageoutdooradvisory.com>` |
| Reply-To | `hello@sageoutdooradvisory.com` (configurable) |

Domain verification is done in the Resend dashboard (DNS on Bluehost).

Optional: add DMARC at `_dmarc.alerts.sageoutdooradvisory.com` with `p=none` to start, then tighten after monitoring.

## Environment variables

Set in **Vercel → Project → Environment Variables** (server-only — no `NEXT_PUBLIC_` prefix):

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (prod) | API key from Resend → API Keys |
| `RESEND_FROM_EMAIL` | No | Defaults to `active-jobs@alerts.sageoutdooradvisory.com` |
| `RESEND_REPLY_TO` | No | Reply-To header (recommended: real ops inbox) |
| `PIPELINE_EMAIL_ENABLED` | Yes (prod) | Must be `true` to send; use `false` locally |
| `SITE_URL` | No | Deep link base; defaults to `https://resources.sageoutdooradvisory.com` |

Local development: leave `RESEND_API_KEY` unset or set `PIPELINE_EMAIL_ENABLED=false` so saves never send email.

## What triggers email (MVP)

Emails fire **after a successful job save** when:

1. **Submit for review** / **Resubmit** (`POST /api/admin/project-pipeline/jobs/review-action`) → **project manager** (`projMgr`) with the author's note in the body; optional **Google Calendar** block on the PM's primary calendar when `PIPELINE_CALENDAR_ENABLED=true`
2. **Review status** changes on save (`PUT /api/admin/project-pipeline/jobs` or review-action) → consultant or PM per routing rules
3. **Due date** changes → assigned **Consultant** and/or **Project Manager**

**Recipients:** resolved via `managed_users` + name aliases. The actor is excluded.

Email failure does **not** block the save (best-effort).

## User notification preferences

Each managed user can opt out of specific Job Pipeline **email** types on **`/admin/account`** (click your profile in the sidebar footer). Preferences are stored on `managed_users.pipeline_email_preferences` as JSON.

**Project Manager** vs **Consultant** toggles depend on `managed_users.is_project_manager` (set on **`/admin/users`**):

| `is_project_manager` | Account page shows |
|----------------------|-------------------|
| `false` | Consultant emails only (`reviewStatusChange`, `dueDateChange`) |
| `true` | Project Manager + Consultant emails (all four keys) |

A user marked as Project Manager can still be assigned as a consultant on jobs and receives both sets of notifications when applicable.

| Key | Email type |
|-----|------------|
| `submitForReview` | Submit for review (to project manager) |
| `resubmitForReview` | Resubmit for review (to project manager) |
| `reviewStatusChange` | Review status updates (Consultant or Project Manager) |
| `dueDateChange` | Due date changes (Consultant or Project Manager) |

Defaults are **all enabled** (opt-out). Slack DMs are **not** gated by these toggles.

API:

- `GET /api/admin/account` — profile + preferences for the signed-in user
- `PATCH /api/admin/account/notifications` — update one or more boolean toggles

## Slack DMs (optional)

Set `SLACK_BOT_TOKEN` and `PIPELINE_SLACK_ENABLED=true`. Uses `users.lookupByEmail` for the same recipients as email. Job `authorSlackUsername` is stored for sheet parity; Slack delivery uses managed-user emails.

## Manual QA checklist

1. Set `RESEND_API_KEY` and `PIPELINE_EMAIL_ENABLED=true` in a preview/staging deployment.
2. Open **Job Pipeline** (`/admin/job-pipeline`) as an admin (`pipeline_view_all` or admin role).
3. Pick a job assigned to a consultant with a `managed_users` row (e.g. Luke Marran).
4. Change **Review status** → save → consultant inbox receives “Review update” email.
5. Change **Due date** → save → Consultant and/or Project Manager receive “Due date updated” email.
6. Save a change as the consultant themselves → they should **not** receive their own notification.
7. Unset `RESEND_API_KEY` locally → save still returns 200.
8. Open **`/admin/account`**, disable **Due date changes**, trigger a due-date save → no email; re-enable → email resumes.

### Send all four test templates

```bash
PIPELINE_EMAIL_TEST_RECIPIENT=harsell@sageoutdooradvisory.com npm run test:pipeline-emails
```

Requires `RESEND_API_KEY` and `PIPELINE_EMAIL_ENABLED=true`. Subjects are prefixed with `[TEST]`.

## Code map

| Path | Role |
|------|------|
| `lib/email/resend-client.ts` | Resend send + env gating |
| `lib/email/pipeline-email-templates.ts` | Branded HTML templates |
| `lib/project-pipeline/notifications/email-preferences.ts` | Per-user toggle types + filtering |
| `lib/project-pipeline/notifications/detect-job-changes.ts` | Diff previous vs saved job |
| `lib/project-pipeline/notifications/resolve-recipients.ts` | Consultant → email lookup |
| `lib/project-pipeline/notifications/notify-pipeline-job-change.ts` | Orchestrator + preference gating |
| `app/api/admin/account/route.ts` | Account profile API |
| `app/api/admin/account/notifications/route.ts` | Preference update API |
| `app/admin/account/page.tsx` | Account settings UI |
| `app/api/admin/project-pipeline/jobs/route.ts` | Hook after Supabase upsert |
| `scripts/test-pipeline-emails.ts` | Manual send of all four templates |

## Future extensions

- Sent to client, admin flags, cancelled status
- Sheet-sync–driven changes (cron)
- Daily due-date reminder cron
- Slack DM preferences
