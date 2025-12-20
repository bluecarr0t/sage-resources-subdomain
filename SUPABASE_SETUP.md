# Supabase Setup Guide

This project uses Supabase with the new API keys format. Follow these steps to configure your Supabase connection.

## Step 1: Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API** (or **Project Settings** → **API Keys**)
4. Look for the **Publishable and secret API keys** section (not the legacy keys)

## Step 2: Create `.env.local` File

Create a `.env.local` file in the project root with the following content:

```env
# Supabase Configuration
# Use the new API keys format (Publishable and Secret keys)

# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Publishable Key (safe for browser/client-side use)
# This key starts with "sb_publishable_"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here

# Secret Key (server-side only - NEVER expose to client)
# This key starts with "sb_secret_"
# Required for server-side operations (API routes, Server Components, etc.)
SUPABASE_SECRET_KEY=sb_secret_your_key_here
```

## Step 3: Where to Find Your Keys

### Project URL
- Found in: **Settings** → **API** → **Project URL**
- Format: `https://xxxxxxxxxxxxx.supabase.co`

### Publishable Key
- Found in: **Settings** → **API** → **Publishable key**
- Format: Starts with `sb_publishable_`
- **Safe to use in browser** - This is what you need for client-side code

### Secret Key (Required for server-side operations)
- Found in: **Settings** → **API** → **Secret key** (under "Publishable and secret API keys")
- Format: Starts with `sb_secret_`
- **Never expose this in client-side code** - Only use on the server
- Allows privileged access - bypasses Row Level Security (RLS)
- Use in: API routes, Server Components, Server Actions, backend services

## Step 4: Important Notes

### Row Level Security (RLS)
- The publishable key is safe to use in the browser **only if** you have Row Level Security (RLS) enabled on your tables
- Make sure to configure RLS policies for all your tables to protect your data

### Key Migration
- Supabase is transitioning from legacy keys (`anon`, `service_role`) to new keys (`publishable`, `secret`)
- This project uses the new keys format for better security and future compatibility
- Legacy keys will be deprecated in late 2026

### Environment Variables
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- **Never put your Secret key in a `NEXT_PUBLIC_` variable** - it would be exposed to users!
- Use `SUPABASE_SECRET_KEY` (no `NEXT_PUBLIC_` prefix) for server-side only
- The `.env.local` file is automatically ignored by git (it's in `.gitignore`)

### When to Use Each Key

**Client-Side (Browser):**
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- For Client Components (`'use client'`)
- Respects Row Level Security (RLS) policies
- Safe to expose in browser

**Server-Side:**
- Use `SUPABASE_SECRET_KEY` (no `NEXT_PUBLIC_` prefix)
- For Server Components, API Routes, Server Actions
- Bypasses RLS - use with caution
- Never exposed to the browser

## Step 5: Set Up Google OAuth (Recommended for Google Workspace Teams)

If you're using Google Workspace and want team members to sign in with their Google accounts:

👉 **See [SUPABASE_GOOGLE_OAUTH_SETUP.md](./docs/SUPABASE_GOOGLE_OAUTH_SETUP.md) for detailed instructions**

This allows users to sign in with a single click using their existing Google accounts, and you can restrict sign-ins to your Google Workspace domain.

## Step 6: Using Supabase Clients

### Client-Side Usage (Browser)

In Client Components, use the default export:

```typescript
'use client';
import { supabase } from '@/lib/supabase';

// This respects RLS policies
const { data, error } = await supabase
  .from('your_table')
  .select('*');
```

### Server-Side Usage (API Routes, Server Components)

In Server Components or API Routes, use the server client:

```typescript
import { createServerClient } from '@/lib/supabase';

// In a Server Component or API Route
const supabase = createServerClient();

// This bypasses RLS - use carefully!
const { data, error } = await supabase
  .from('your_table')
  .select('*');
```

### Example: API Route

```typescript
// app/api/data/route.ts
import { createServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('your_table')
    .select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}
```

## Step 6: Test Your Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000/map` to test your Supabase connection

## Production Deployment (Vercel)

When deploying to Vercel, add all three environment variables:

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (important for server-side operations)

**Note:** Make sure `SUPABASE_SECRET_KEY` does NOT have the `NEXT_PUBLIC_` prefix in Vercel either!

## Troubleshooting

- **Connection fails**: Double-check that your keys are correct and copied completely
- **Key doesn't work**: Make sure you're using the new "Publishable key", not the legacy "anon" key
- **RLS errors**: Enable Row Level Security on your tables and configure appropriate policies

## Additional Resources

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

