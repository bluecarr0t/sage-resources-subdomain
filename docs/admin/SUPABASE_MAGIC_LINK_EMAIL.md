# Supabase magic-link email (Sage branded)

Branded HTML templates for gated-access sign-in live in the repo:

| Template | File | Supabase dashboard slot |
| -------- | ---- | ----------------------- |
| Magic link (OTP / sign-in) | [`docs/email-templates/supabase-magic-link.html`](../email-templates/supabase-magic-link.html) | **Authentication → Email Templates → Magic Link** |
| Confirm signup (if users see “Confirm your signup”) | [`docs/email-templates/supabase-confirm-signup.html`](../email-templates/supabase-confirm-signup.html) | **Authentication → Email Templates → Confirm signup** |

## Apply in Supabase

1. Open [Supabase Dashboard](https://app.supabase.com) → project **sage-outdoor-advisory**.
2. Go to **Authentication** → **Email Templates**.
3. Select **Magic Link** (and **Confirm signup** if new users get that email instead).
4. Set **Subject** (suggestions):
   - Magic Link: `Your Sage sign-in link`
   - Confirm signup: `Confirm your email for Sage Resources`
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

## Custom sender (optional)

Default sender is `Supabase Auth <noreply@mail.app.supabase.io>`. For a `@sageoutdooradvisory.com` From address, configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) in Supabase (e.g. Google Workspace, SendGrid, Resend).

## Test

1. Request access on `/glamping-market-overview` with a test inbox.
2. Confirm subject, logo, button, and link land on `/auth/callback?redirect=/glamping-market-overview`.
3. Click the link in the **same browser** used to submit the form (PKCE).

## Template variables

Supabase replaces these automatically—do not remove:

- `{{ .ConfirmationURL }}` — sign-in / confirm link (required)
- `{{ .Email }}` — recipient (used in footer)

See [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
