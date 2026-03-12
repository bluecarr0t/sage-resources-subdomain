# How to Add Your First User (Yourself)

This guide walks you through adding yourself (`harsell@sageoutdooradvisory.com`) to the `managed_users` table.

## Step 1: Sign In Once (Create Auth Record)

**You must sign in via Google OAuth first** to create your record in Supabase's `auth.users` table.

1. Make sure the login page is deployed/running
2. Go to `/en/login` (or your locale)
3. Click "Continue with Google"
4. Sign in with your Google account (harsell@sageoutdooradvisory.com)
5. You'll see an "Access denied" message (this is expected - you're not in `managed_users` yet)
6. You'll be automatically signed out, but your account is now in `auth.users`

## Step 2: Add Yourself to managed_users

You have two options:

### Option A: Using the Script (Recommended)

1. Make sure you have the Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_your_key_here
   ```

2. Run the script:
   ```bash
   npx tsx scripts/add-managed-user.ts harsell@sageoutdooradvisory.com admin "Nick Harsell"
   ```

3. The script will:
   - Find your user in `auth.users` by email
   - Add you to `managed_users` with admin role
   - Confirm the addition

### Option B: Manual SQL (If Script Doesn't Work)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Users**
3. Find your user (search for `harsell@sageoutdooradvisory.com`)
4. Copy your **User UID** (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)

5. Go to **SQL Editor** and run:

```sql
INSERT INTO managed_users (user_id, email, role, display_name, is_active)
VALUES (
  'YOUR-USER-UID-HERE',  -- Replace with the UUID from step 4
  'harsell@sageoutdooradvisory.com',
  'admin',
  'Nick Harsell',  -- Optional: your display name
  true
);
```

**Important:** Replace `YOUR-USER-UID-HERE` with the actual UUID from the auth.users table.

## Step 3: Verify Access

1. Go back to `/en/login`
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should now be redirected to the home page (no more "Access denied"!)

## Troubleshooting

### "User not found in auth.users"

**Cause:** You haven't signed in via Google OAuth yet.

**Solution:** 
1. Go to `/en/login`
2. Click "Continue with Google" and complete sign-in
3. Even if you get "Access denied", your account is now in `auth.users`
4. Run the script again or use the SQL method

### Script Can't Find Your User

If the script can't find your user even after signing in:

1. Check Supabase Dashboard → Authentication → Users
2. Verify your email appears there
3. Use the Manual SQL method (Option B) instead

### Wrong Email in Auth Users

If your Google account email doesn't match `harsell@sageoutdooradvisory.com`:

1. Check what email appears in Supabase Dashboard → Authentication → Users
2. Use that email when running the script or in SQL

## Next Steps

Once you've added yourself:

- You can now sign in and access the application
- Add other team members using the same process
- Manage users via SQL or create a user management interface
