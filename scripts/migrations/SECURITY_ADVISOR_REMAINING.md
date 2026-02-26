# Security Advisor – Manual Fixes

These items require changes in the Supabase Dashboard, not SQL migrations.

## Auth OTP long expiry

**Issue:** Email OTP expiry exceeds 1 hour.

**Fix:** Supabase Dashboard → Authentication → Providers → Email → set **OTP expiry** to 3600 (1 hour) or less.

## Vulnerable Postgres version

**Issue:** Postgres has security patches available.

**Fix:** Supabase Dashboard → Project Settings → Infrastructure → **Upgrade** database.
