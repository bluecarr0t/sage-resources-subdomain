# Google Sheets to Maps Page - Implementation Guide

## Overview

This guide covers multiple approaches to create a maps page using data from Google Sheets. Choose the approach that best fits your needs:

1. **Public Google Sheet as JSON** (Simplest - for public read-only data)
2. **Google Sheets API via Next.js API Route** (Recommended - secure and flexible)
3. **Direct Client-side Fetch** (Simple but exposes sheet ID)

## Approach 1: Public Google Sheet as JSON (Simplest)

### Setup Steps:

1. **Make your Google Sheet public:**
   - Open your Google Sheet
   - Click "Share" → "Change to anyone with the link"
   - Set permissions to "Viewer"

2. **Publish your sheet:**
   - File → Share → Publish to web
   - Choose the sheet/tab you want
   - Select "Comma-separated values (.csv)" or "Web page"
   - Copy the published URL

3. **Get the Sheet ID from the URL:**
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit#gid=[GID]
   ```

4. **Use the JSON endpoint format:**
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/gviz/tq?tqx=out:json&sheet=[SHEET_NAME]
   ```

### Advantages:
- ✅ No authentication needed
- ✅ Very simple implementation
- ✅ No server-side code required

### Disadvantages:
- ❌ Sheet must be public
- ❌ Limited query capabilities
- ❌ No real-time updates (cached by Google)

---

## Approach 2: Google Sheets API via Next.js API Route (Recommended)

This is the most secure and flexible approach, especially for private sheets or when you need more control.

### Setup Steps:

1. **Create a Google Cloud Project and enable Sheets API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or use existing)
   - Enable "Google Sheets API"
   - Create credentials (Service Account or OAuth)

2. **For Service Account (Recommended for server-side):**
   - Create Service Account
   - Download JSON key file
   - Share your Google Sheet with the service account email
   - Add credentials to `.env.local`:

   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your-sheet-id
   ```

3. **Install dependencies:**
   ```bash
   npm install google-spreadsheet
   ```

### Advantages:
- ✅ Works with private sheets
- ✅ Secure (credentials on server)
- ✅ Full API capabilities
- ✅ Better error handling

### Disadvantages:
- ⚠️ Requires Google Cloud setup
- ⚠️ More complex initial setup

---

## Approach 3: Direct Client-side Fetch (Quick but less secure)

Only use this for public sheets or testing.

### Implementation:
Create a utility function that fetches directly from Google Sheets JSON endpoint.

### Advantages:
- ✅ Quick to implement
- ✅ No server-side code

### Disadvantages:
- ❌ Sheet must be public
- ❌ Exposes sheet ID in client code
- ❌ Limited error handling

---

## Recommended Implementation

We'll implement **Approach 2** (Google Sheets API via API Route) as it's the most production-ready, but also provide utilities for Approach 1 (Public JSON) for simplicity.

## Next Steps

1. Choose your approach based on your needs
2. Follow the setup steps for your chosen approach
3. Use the provided components/utilities to create your maps page
4. Customize the data mapping to match your Google Sheet structure

## Data Structure Requirements

Your Google Sheet should have these columns (adjust as needed):
- `name` or `property_name` - Property name
- `lat` or `latitude` - Latitude
- `lon` or `longitude` or `lng` - Longitude
- `city` - City name
- `state` - State abbreviation
- `address` - Full address (optional)
- Any other fields you want to display

The mapping utility will help convert your sheet columns to the expected format.

