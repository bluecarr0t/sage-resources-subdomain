# Fixing Google OAuth "org_internal" Error

If you're seeing this error:
```
Access blocked: Sage can only be used within its organization
Error 403: org_internal
```

This means your Google OAuth app is configured as "Internal" (organization-only), but there's a configuration mismatch.

## Solution: Update OAuth Consent Screen Settings

### Option 1: Change to External (Recommended for Testing)

If you want to allow any Google account (or specific test users):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Under **User Type**, change from **Internal** to **External**
5. Click **Save and Continue**
6. Add test users if needed (during development):
   - Scroll to **Test users**
   - Click **Add Users**
   - Add `harsell@sageoutdooradvisory.com`
   - Click **Add**
7. Click **Save and Continue** through the remaining steps

**Note:** If you keep it as External, you'll eventually need to publish the app (if you want users outside your organization), but for now test users will work.

### Option 2: Keep as Internal (Recommended for Production)

If you want to keep it Internal (only your Google Workspace organization):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Make sure **User Type** is set to **Internal**
5. Verify **Publishing status** shows "Testing" or "In production"
6. Check **App domain** matches your organization:
   - Should show your Google Workspace domain (e.g., `sageoutdooradvisory.com`)
7. Make sure you're signing in with an account from the same Google Workspace organization

### Option 3: Verify Your Google Cloud Organization

If using Internal mode, ensure:

1. Your Google Cloud project is in the same organization as your Google Workspace
2. You're signing in with an account from that organization
3. Go to **IAM & Admin** → **Organization** to verify

## After Making Changes

1. **Wait a few minutes** for Google's changes to propagate
2. **Clear your browser cache/cookies** for the login page
3. Try signing in again

## Recommended Configuration for Your Use Case

Since you want to restrict access to your Google Workspace team AND use the `managed_users` allowlist:

1. Set OAuth consent screen to **External** (for now, during setup)
2. Add test users (yourself and team members) during development
3. Use the `managed_users` table as your primary access control
4. Optional: Add `hd` parameter in code to restrict to your domain (see LoginForm.tsx)

This gives you:
- Flexibility during setup
- Better control via `managed_users` table
- No need to publish the OAuth app publicly

## Verify OAuth App Settings

Double-check these settings match your needs:

1. **APIs & Services** → **OAuth consent screen**:
   - User Type: External (or Internal if org matches)
   - Publishing status: Testing (adds test users) or In production
   - Scopes: `email`, `profile`, `openid`

2. **APIs & Services** → **Credentials**:
   - OAuth 2.0 Client ID redirect URI:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

## Still Having Issues?

If the error persists after changing settings:

1. Wait 10-15 minutes for changes to propagate
2. Try an incognito/private browser window
3. Sign out of all Google accounts and sign back in
4. Verify your Supabase redirect URI matches exactly in Google Cloud Console
