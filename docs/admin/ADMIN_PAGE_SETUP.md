# Admin Page Setup

The `/admin` page displays all columns from the `all_glamping_properties` table in organized, collapsible groups.

## Features

- **Authentication Required**: Only users with authorized email domains and in the `managed_users` table can access
- **Organized Column Groups**: Columns are organized into logical categories:
  - Basic Information
  - Dates & Tracking
  - Location
  - Capacity & Sites
  - Operating Season
  - Pricing & Performance (2024, 2025, Future)
  - Seasonal Rates
  - Basic Amenities
  - Recreation & Entertainment
  - RV & Vehicle Features
  - Utilities & Hookups
  - Activities
  - Location Features
  - Food & Dining
  - Accommodation Features
  - Services & Rentals
  - Google Places Data
  - Property Status & Classification
- **Collapsible Groups**: Click on any group to expand/collapse and view columns
- **Responsive Design**: Works on desktop and mobile devices

## Access

After logging in via `/login`, users are automatically redirected to `/admin`.

## Redirect URL Configuration

**Important**: If you're seeing redirects to a Replit URL after OAuth login, you need to update your Supabase redirect URLs:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **URL Configuration**
3. Update:
   - **Site URL**: Your production domain (e.g., `https://yourdomain.com`)
   - **Redirect URLs**: Add your production URLs:
     - `https://yourdomain.com/**`
     - `http://localhost:3000/**` (for local development)
     - `http://localhost:3001/**` (if using port 3001)

The redirect URL should match your actual application domain, not Replit.

## Security

The admin page implements the same security checks as the login flow:
1. User must be authenticated
2. User's email must be from `@sageoutdooradvisory.com` or `@sagecommercialadvisory.com`
3. User must exist in the `managed_users` table with `is_active=true`

If any check fails, the user is signed out and redirected to `/login`.
