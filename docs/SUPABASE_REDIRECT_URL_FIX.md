# Fixing Supabase OAuth Redirect to Replit Instead of Localhost

If Google OAuth is redirecting to a Replit URL instead of your local development server, you need to update the Site URL in Supabase.

## The Issue

Supabase uses the **Site URL** setting to determine where OAuth callbacks should redirect. If this is set to a Replit URL (or any other URL), OAuth will redirect there instead of your local development server.

## Solution: Update Supabase Site URL

### For Local Development:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Update the **Site URL** to:
   ```
   http://localhost:3001
   ```
   (Or whatever port your dev server uses - `3000`, `3001`, etc.)

5. Under **Redirect URLs**, add:
   ```
   http://localhost:3001/**
   ```
   (This allows redirects to any path on localhost)

6. Click **Save**

### For Production:

When deploying to production (Vercel, etc.), update the Site URL to your production domain:
- Site URL: `https://your-production-domain.com`
- Redirect URLs: `https://your-production-domain.com/**`

## Additional Notes

- The `redirectTo` parameter in `LoginForm.tsx` should still work and override the Site URL for the final redirect, but Supabase needs a valid Site URL to process the OAuth callback
- You may need to have different Site URLs for development vs production, or use environment-specific Supabase projects
- Changes to Site URL settings take effect immediately (no restart needed)

## Verification

After updating:
1. Clear your browser cookies/localStorage for localhost
2. Try the Google login flow again
3. You should now be redirected back to `localhost:3001/login` (or wherever your redirectTo points) instead of Replit
