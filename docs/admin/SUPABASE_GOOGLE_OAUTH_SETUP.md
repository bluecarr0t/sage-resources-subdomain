# Supabase Google OAuth Setup for Google Workspace

This guide will help you set up Google OAuth authentication in Supabase, optimized for Google Workspace teams.

## Benefits of Google OAuth for Google Workspace

- ✅ **Single Sign-On (SSO)** - Users sign in with their existing Google accounts
- ✅ **No password management** - More secure, no password breaches
- ✅ **Domain restriction** - Can restrict sign-ins to your Google Workspace domain
- ✅ **Easy onboarding** - Team members can join without creating new accounts
- ✅ **Better UX** - One-click sign-in is faster and easier

## Step 1: Configure Google OAuth in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **Internal** (for Google Workspace) or **External**
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if using External (until you publish)
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Sage Subdomain Marketing" (or your app name)
   - **Authorized JavaScript origins**: 
     ```
     http://localhost:3000
     https://your-production-domain.com
     ```
   - **Authorized redirect URIs**: 
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```
     (Replace `your-project-ref` with your Supabase project reference)
7. Copy the **Client ID** and **Client Secret** - you'll need these for Supabase

## Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Enable Google provider
6. Enter your **Client ID** and **Client Secret** from Google Cloud Console
7. **Optional but Recommended for Google Workspace**: 
   - Under "Advanced Settings", you can add domain restrictions
   - Or use the `hd` (hosted domain) parameter in code (see LoginForm.tsx)

### Domain Restriction (Google Workspace Only)

To restrict sign-ins to your Google Workspace domain:

**Option 1: In Supabase Dashboard (Recommended)**
- In the Google provider settings, look for "Authorized domains"
- Add your Google Workspace domain (e.g., `yourdomain.com`)

**Option 2: In Code (LoginForm.tsx)**
- Uncomment and modify the `hd` parameter in `handleGoogleSignIn`:
  ```typescript
  queryParams: {
    hd: 'yourdomain.com', // Replace with your Google Workspace domain
  },
  ```

**Option 3: Post-Authentication Hook (Most Flexible)**
- Use Supabase Auth hooks to verify email domain after sign-in
- This allows you to handle unauthorized domains gracefully

## Step 3: Update Environment Variables

No additional environment variables are needed - Supabase handles the OAuth flow server-side. Your existing Supabase configuration is sufficient:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SUPABASE_SECRET_KEY=sb_secret_your_key_here
```

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/en/login` (or your locale)
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to your app

## Step 5: Verify User Creation

After a successful Google sign-in, check your Supabase dashboard:

1. Go to **Authentication** → **Users**
2. You should see a new user with their Google email
3. The user will have `email_confirmed_at` set automatically (Google handles email verification)

## Troubleshooting

### "redirect_uri_mismatch" Error

- Verify the redirect URI in Google Cloud Console matches exactly:
  `https://your-project-ref.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes

### Users from Outside Your Domain Can Sign In

- Enable domain restriction in Supabase dashboard or use the `hd` parameter
- Consider implementing a post-auth hook to verify domain and sign out unauthorized users

### OAuth Consent Screen Shows "Unverified App"

- This is normal for internal Google Workspace apps
- For external apps, you'll need to verify your app with Google (only if you need users outside your org)
- For internal Google Workspace apps, this won't affect functionality

## Security Best Practices

1. **Always restrict to your Google Workspace domain** for team-only apps
2. **Use Row Level Security (RLS)** in Supabase to protect your data
3. **Verify user email domains** in your application logic if needed
4. **Monitor authentication logs** in Supabase dashboard regularly

## Next Steps

- Consider implementing user roles/permissions in your database
- Set up email templates in Supabase for welcome emails
- Configure session management (token refresh, session duration)

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Workspace Admin Guide](https://support.google.com/a/topic/25838)
