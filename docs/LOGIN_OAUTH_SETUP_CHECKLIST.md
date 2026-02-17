# Login Page – Google OAuth Setup Checklist

Use this checklist to finish setting up Google OAuth for https://resources.sageoutdooradvisory.com/login.

## ✅ Google Cloud Console (Already Configured)

From your screenshot, these are already set:

- **Client ID:** `815164485871-04mplq6ko4nb2kr1ur7np170kvcas28c.apps.googleusercontent.com`
- **Authorized JavaScript origins:** `http://localhost:3001`, `https://resources.sageoutdooradvisory.com`
- **Authorized redirect URI:** `https://mdlniwrgrszdhzwxjdal.supabase.co/auth/v1/callback`
- **Client secret:** Created (copy from Google Cloud Console if needed)

---

## 1. Supabase Dashboard – Google Provider

1. Go to [Supabase Dashboard](https://app.supabase.com) → your project
2. Open **Authentication** → **Providers**
3. Select **Google**
4. Turn **Enable Sign in with Google** ON
5. Enter:
   - **Client ID:** `815164485871-04mplq6ko4nb2kr1ur7np170kvcas28c.apps.googleusercontent.com`
   - **Client Secret:** from Google Cloud Console (Credentials → your OAuth client → copy secret)
6. Save

---

## 2. Supabase Dashboard – URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   https://resources.sageoutdooradvisory.com
   ```
3. Under **Redirect URLs**, add:
   ```
   https://resources.sageoutdooradvisory.com/**
   https://resources.sageoutdooradvisory.com/login
   https://resources.sageoutdooradvisory.com/admin
   http://localhost:3001/**
   http://localhost:3001/login
   ```
4. Save

---

## 3. Vercel Environment Variables

Ensure these are set for **Production**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mdlniwrgrszdhzwxjdal.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable key (starts with `sb_publishable_`) |
| `SUPABASE_SECRET_KEY` | Your secret key (starts with `sb_secret_`) |

After changes, redeploy the app.

---

## 4. Add First User to `managed_users`

After the first successful Google sign-in:

1. Go to Supabase → **Authentication** → **Users**
2. Find your user and copy the **User UID**
3. Run:
   ```bash
   npx tsx scripts/add-managed-user.ts your-email@sageoutdooradvisory.com admin "Your Name"
   ```
   Or insert manually in SQL Editor (see [ADD_FIRST_USER.md](./ADD_FIRST_USER.md))

---

## 5. Test the Flow

1. Visit https://resources.sageoutdooradvisory.com/login
2. Click **Continue with Google**
3. Sign in with an allowed domain (`@sageoutdooradvisory.com` or `@sagecommercialadvisory.com`)
4. You should be redirected to `/admin` after access checks pass

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Confirm the redirect URI in Google Cloud Console is exactly `https://mdlniwrgrszdhzwxjdal.supabase.co/auth/v1/callback` |
| "Access denied" after sign-in | Add the user to `managed_users` (see step 4) |
| Stuck on "Loading..." | Check Supabase URL and keys in Vercel; redeploy if needed |
| "Invalid redirect URL" | Add the redirect URLs to Supabase → Authentication → URL Configuration → Redirect URLs |

---

## OAuth Flow Summary

1. User clicks **Continue with Google** on `/login`
2. Redirect to Google → user signs in
3. Google redirects to Supabase callback
4. Supabase redirects to `/login` with tokens in the URL hash
5. `LoginForm` processes the hash and establishes the session
6. Domain and `managed_users` checks run
7. If allowed, redirect to `/admin` (or `?redirect=` path)
