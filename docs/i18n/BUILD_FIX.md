# Build Fix for Static Rendering

## Issue
The build was failing because `next-intl` was using dynamic rendering by default. This caused static page generation to timeout.

## Solution
Added `setRequestLocale(locale)` in the locale layout to enable static rendering.

## Changes Made
- Updated `app/[locale]/layout.tsx` to import `setRequestLocale`
- Called `setRequestLocale(locale)` before loading messages

This enables static rendering for all pages, which is required for:
- Static site generation
- Build-time optimization
- Better performance

## Reference
- [next-intl Static Rendering Docs](https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#static-rendering)
