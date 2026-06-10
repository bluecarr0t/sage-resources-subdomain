# Supabase magic-link email (Sage branded)

Branded HTML templates for gated-access sign-in live in the repo:

| Template | File | Supabase dashboard slot |
| -------- | ---- | ----------------------- |
| Magic link (OTP / sign-in) | [`docs/email-templates/supabase-magic-link.html`](../email-templates/supabase-magic-link.html) | **Authentication → Email Templates → Magic Link** |
| Confirm signup (if users see “Confirm your signup”) | [`docs/email-templates/supabase-confirm-signup.html`](../email-templates/supabase-confirm-signup.html) | **Authentication → Email Templates → Confirm signup** |

## Recommended setup (one email)

The gated form calls `signInWithOtp` (passwordless), so the **Magic Link** template
is the email that fires. For a clean lead-capture flow you only need **one** email:

1. **Authentication → Providers → Email** → turn **OFF** "Confirm email".
   With it off, new and returning leads both get the **Magic Link** template
   (no separate "Confirm your signup" email). Clicking the magic link is the
   email verification.
2. Brand only the **Magic Link** template (below).

Keep **Confirm signup** branded too only if you intentionally leave "Confirm email"
on — then first-time addresses may receive it instead of the magic link.

## Apply in Supabase

1. Open [Supabase Dashboard](https://app.supabase.com) → project **sage-outdoor-advisory**.
2. Go to **Authentication** → **Email Templates**.
3. Select **Magic Link** (and **Confirm signup** only if "Confirm email" is left on).
4. Set **Subject**:
   - **Magic Link:** `Your sign-in link for the Glamping Market Overview`
   - **Confirm signup:** `Confirm your email — Sage Outdoor Advisory`
5. Paste the **entire HTML** from the matching file into the message body (Source / HTML view if available).
6. Save.

## Brand tokens (editorial theme)

| Token | Value |
| ----- | ----- |
| Page background | `#faf9f3` |
| Outer wash | `#f3f2ec` |
| Primary button | `#4a624a` (sage-600) |
| Link / accent text | `#006b5f` (sage-teal-text) |
| Borders | `#c7d2c7` / `#e3e7e3` |
| Logo | `https://resources.sageoutdooradvisory.com/logos/sage-logo-dark.png` |

Templates use table layout and inline styles for Gmail/Outlook compatibility.

## Required auth settings

Under **Authentication → URL Configuration**:

- **Site URL:** `https://resources.sageoutdooradvisory.com` (root only — **not** `/en` or any locale path; a locale Site URL sends users to `/en?code=…` instead of `/auth/callback`)
- **Redirect URLs:** include  
  `https://resources.sageoutdooradvisory.com/auth/callback` and  
  `https://resources.sageoutdooradvisory.com/auth/callback?redirect=**` (wildcard so the `redirect` query param is allowed) and  
  `http://localhost:3003/auth/callback`

Under **Authentication → Providers → Email**:

- Email enabled
- For passwordless magic links, **Confirm email** can stay on; new users may receive **Confirm signup** until confirmed—brand that template too.

## Email rate limit: set to **30 / hour** (required for production)

Supabase’s **built-in** mail is capped at **2 emails/hour** for the whole project. You
cannot type a higher number until custom SMTP (or a Send Email hook) is configured.
The dashboard shows: *“Custom SMTP or Send Email hook is required to update this configuration.”*

### Step 1 — Fix SMTP (pick one)

**Option A — Use built-in mail only (quick test, still 2/h max)**

1. **Authentication → Emails → SMTP**
2. Turn **OFF** “Enable custom SMTP” (do not leave it ON with placeholder values like `your.smtp.host.com`).
3. Save.

You stay at **2 emails/hour**. Fine for a single test; not enough for real traffic or QA.

**Option B — Custom SMTP (recommended; unlocks **30/h**)**

1. Create an SMTP provider account (e.g. [Resend](https://resend.com), SendGrid, Postmark, or Google Workspace).
2. Verify the sending domain (e.g. `sageoutdooradvisory.com`) and create an API key / SMTP password.
3. **Authentication → Emails → SMTP** → turn **ON** “Enable custom SMTP” and fill **real** values:

   | Field | Example |
   | ----- | ------- |
   | Sender email | `noreply@sageoutdooradvisory.com` (must be allowed by your provider) |
   | Sender name | `Sage Outdoor Advisory` |
   | Host | Provider host (e.g. Resend: `smtp.resend.com`) |
   | Port | `465` (SSL) or `587` (TLS) per provider docs |
   | Username | Provider SMTP user (often `resend` or your API key user) |
   | Password | Provider SMTP password / API key |
   | Minimum interval per user | `60` seconds |

4. Save and send a test from the provider dashboard if available.

**Important:** If custom SMTP is ON but host/user/password are still placeholders, auth emails may fail even when the UI shows success.

### Step 2 — Set project email rate to **30**

1. **Authentication → Rate Limits**
2. **Rate limit for sending emails** → change **2** to **30** `emails/h`
3. Click **Save changes**

Our app also limits **3 requests per email per hour** (Upstash), which stays below the 30/h project cap.

### When rate limited

Auth logs show `over_email_send_rate_limit` / `429: email rate limit exceeded` and **no** `mail.send`.

- Wait for the hourly window to reset, or test with a fresh address.
- Do not submit the form more than once per minute per address (Supabase per-user cooldown).

The app returns HTTP **429** with a clear message when Supabase reports a rate limit (instead of “Check your email” with no email sent).

## Custom sender (optional)

Default sender is `Supabase Auth <noreply@mail.app.supabase.io>`. For a `@sageoutdooradvisory.com` From address, use custom SMTP (Option B above). See [Supabase auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Test

1. Request access on `/glamping-market-overview` with a test inbox.
2. Confirm subject, logo, button, and link land on `/auth/callback?redirect=/glamping-market-overview`.
3. Click the link in the **same browser** used to submit the form (PKCE).
4. If no email arrives, check Supabase → Logs → Auth for `mail.send` vs `over_email_send_rate_limit`.

## Template variables

Supabase replaces these automatically—do not remove:

- `{{ .ConfirmationURL }}` — sign-in / confirm link (required)
- `{{ .Email }}` — recipient (used in footer)

See [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
