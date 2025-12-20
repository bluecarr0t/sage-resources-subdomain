# Managed Users Setup Guide

This guide explains how to set up and use the `managed_users` table to restrict application access to only manually approved users.

## Overview

The `managed_users` table acts as an **allowlist** - only users added to this table can access your application, even if they successfully authenticate with Google OAuth. This provides an additional layer of access control on top of Google Workspace domain restrictions.

## How It Works

1. User signs in via Google OAuth
2. Supabase creates/authenticates the user in `auth.users`
3. **Before granting access**, the application checks if the user exists in `managed_users` table
4. Only users in `managed_users` with `is_active = true` can access the application
5. Users not in `managed_users` are automatically signed out with an access denied message

## Step 1: Create the Table

Run the SQL script to create the `managed_users` table:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/create-managed-users-table.sql`
4. Click **Run** to execute the script

This will:
- Create the `managed_users` table
- Set up foreign key relationship to `auth.users`
- Enable Row Level Security (RLS)
- Create necessary indexes
- Add helper functions and triggers

## Step 2: Add Your First User (Yourself)

### Option A: Using the Script (Recommended)

After you've signed in at least once via Google OAuth:

```bash
npx tsx scripts/add-managed-user.ts your-email@yourdomain.com admin "Your Name"
```

**Note:** The user must have signed in at least once (via Google OAuth) before you can add them to `managed_users`, as they need to exist in `auth.users` first.

### Option B: Manual SQL

If you know the user's ID from `auth.users`:

```sql
INSERT INTO managed_users (user_id, email, role, display_name, is_active)
VALUES (
  'user-id-from-auth-users',  -- Replace with actual UUID from auth.users
  'your-email@yourdomain.com',
  'admin',  -- or 'user' or 'editor'
  'Your Name',  -- Optional
  true
);
```

To find your user ID:
1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Find your user by email
3. Copy the UUID from the user record

## Step 3: Add Team Members

For each team member:

1. **They sign in once** via Google OAuth (so they're added to `auth.users`)
2. **You add them** to `managed_users` using the script:

```bash
npx tsx scripts/add-managed-user.ts team-member@yourdomain.com user "Team Member Name"
```

### Adding Multiple Users

You can create a simple script or SQL batch:

```sql
-- Example: Add multiple users at once
INSERT INTO managed_users (user_id, email, role, display_name, is_active)
VALUES
  ('uuid-1', 'user1@yourdomain.com', 'user', 'User One', true),
  ('uuid-2', 'user2@yourdomain.com', 'editor', 'User Two', true),
  ('uuid-3', 'user3@yourdomain.com', 'user', 'User Three', true);
```

## User Roles

The `managed_users` table supports three roles:

- **`user`** (default) - Standard user access
- **`editor`** - For users who may need edit permissions (for future features)
- **`admin`** - For administrators who manage other users

Role is stored for future use in implementing permission-based features.

## Managing Users

### Deactivate a User (Without Deleting)

To temporarily disable access without removing the user:

```sql
UPDATE managed_users
SET is_active = false
WHERE email = 'user@example.com';
```

### Reactivate a User

```sql
UPDATE managed_users
SET is_active = true
WHERE email = 'user@example.com';
```

### Remove a User

```sql
DELETE FROM managed_users
WHERE email = 'user@example.com';
```

### Change User Role

```sql
UPDATE managed_users
SET role = 'editor'
WHERE email = 'user@example.com';
```

## Access Control Flow

When a user signs in:

1. **Google OAuth** authenticates them → Creates/updates `auth.users`
2. **LoginForm component** checks `managed_users` table
3. If user exists in `managed_users` AND `is_active = true` → ✅ Access granted
4. If user doesn't exist OR `is_active = false` → ❌ Access denied, user signed out

## Troubleshooting

### "Access denied" Message After Sign-In

**Cause:** User is not in `managed_users` table or `is_active = false`

**Solution:**
1. Check if user exists in `auth.users` (Authentication → Users in Supabase)
2. If they exist, add them to `managed_users`:
   ```bash
   npx tsx scripts/add-managed-user.ts their-email@domain.com
   ```
3. If they don't exist, they need to sign in first (via Google OAuth)

### Script Says "User not found in auth.users"

**Cause:** User hasn't signed in yet

**Solution:**
1. User must sign in via Google OAuth first
2. This creates their record in `auth.users`
3. Then run the script again to add them to `managed_users`

### Users Can Still Access After Being Removed

**Cause:** Browser may have cached session

**Solution:**
- User needs to sign out and sign back in
- Or clear their browser session/cookies
- The check happens on every page load for authenticated routes

## Security Notes

1. **RLS Policies:** The `managed_users` table uses Row Level Security. Only the service role (server-side) can insert/update/delete records. Users can only read their own record.

2. **Service Role Key:** The `add-managed-user.ts` script uses `SUPABASE_SECRET_KEY` to bypass RLS. Keep this key secure and never expose it client-side.

3. **Automatic Sign-Out:** Users not in `managed_users` are automatically signed out after authentication, preventing unauthorized access.

4. **Email Verification:** The table stores email for convenience, but the primary key is `user_id` (UUID from `auth.users`).

## Next Steps

- Consider implementing a user management UI for admins
- Add audit logging for user access attempts
- Implement role-based permissions using the `role` column
- Set up email notifications when users are added/removed

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Script: create-managed-users-table.sql](../scripts/create-managed-users-table.sql)
