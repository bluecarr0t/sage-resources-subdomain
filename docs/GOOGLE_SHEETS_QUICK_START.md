# Google Sheets Map - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Prepare Your Google Sheet

Your Google Sheet needs these columns:
- **Required:** `lat` or `latitude` and `lon` or `longitude` (or `lng`)
- **Recommended:** `name` or `property_name`
- **Optional:** `city`, `state`, `address`, `description`, `url`, `type`

**Example Sheet Structure:**
```
name          | lat      | lon       | city      | state | description
--------------|----------|-----------|-----------|-------|------------------
Property 1    | 40.7128  | -74.0060  | New York  | NY    | Great location
Property 2    | 34.0522  | -118.2437 | Los Angeles | CA | Beachfront
```

### Step 2: Make Your Sheet Public

1. Open your Google Sheet
2. Click **Share** → **Change to anyone with the link**
3. Set permission to **Viewer**
4. Copy the link or note the Sheet ID

**Find your Sheet ID:**
The Sheet ID is in the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### Step 3: Create Your Map Page

You have two options:

#### Option A: Use the Dynamic Route (Easiest)

Create a page at `/map-sheet/[sheetId]` where `[sheetId]` is your Google Sheet ID.

**Example URL:**
```
https://yoursite.com/map-sheet/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

**Optional Query Parameters:**
- `sheetName` - Name of the specific sheet/tab (if you have multiple tabs)
- `title` - Custom map title
- `description` - Custom description

**Example with parameters:**
```
https://yoursite.com/map-sheet/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms?sheetName=Properties&title=My Properties
```

#### Option B: Create a Custom Page

Create a new page file and use the component directly:

```typescript
// app/my-map/page.tsx
'use client';

import dynamic from 'next/dynamic';

const GoogleSheetMap = dynamic(
  () => import('@/components/GoogleSheetMap'),
  { ssr: false }
);

export default function MyMapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">My Properties</h1>
      <GoogleSheetMap
        sheetId="YOUR_SHEET_ID_HERE"
        sheetName="Sheet1" // Optional
        mapTitle="Property Map"
        mapDescription="Explore our properties"
      />
    </div>
  );
}
```

### Step 4: Test It!

1. Start your dev server: `npm run dev`
2. Navigate to your map page
3. You should see markers on the map!

## 📋 Column Name Variations Supported

The component is flexible and supports common variations:

**Latitude fields:**
- `lat`, `latitude`, `Latitude`, `LAT`

**Longitude fields:**
- `lon`, `lng`, `longitude`, `Longitude`, `LNG`, `LONGITUDE`

**Name fields:**
- `name`, `property_name`, `Name`, `Property`, `title`, `Title`

**Location fields:**
- `city`, `City`, `CITY`
- `state`, `State`, `STATE`
- `address`, `Address`, `ADDRESS`

## 🎨 Customization

### Change Map Center/Zoom

Edit `components/GoogleSheetMap.tsx`:

```typescript
const defaultCenter = {
  lat: 40.7128,  // Your default latitude
  lng: -74.0060, // Your default longitude
};

const defaultZoom = 10; // Zoom level (higher = more zoomed in)
```

### Add More Filters

You can extend the component to filter by other fields (property type, price range, etc.) by modifying the `GoogleSheetMap` component.

### Customize Info Window

Edit the `InfoWindow` content in `GoogleSheetMap.tsx` to display different fields or styling.

## 🔒 Private Sheets (Advanced)

For private sheets, you'll need to:
1. Set up Google Cloud Service Account
2. Install `google-spreadsheet` package
3. Add credentials to `.env.local`
4. Update the API route to use service account

See `GOOGLE_SHEETS_MAP_GUIDE.md` for detailed instructions.

## 🐛 Troubleshooting

### No markers showing?

1. **Check coordinates:** Make sure your `lat` and `lon` columns have valid numbers
2. **Check column names:** Use lowercase with underscores (e.g., `property_name` not `Property Name`)
3. **Check sheet is public:** The sheet must be publicly accessible
4. **Check browser console:** Look for error messages

### "Failed to fetch sheet data" error?

1. Verify the Sheet ID is correct
2. Make sure the sheet is public (Share → Anyone with the link → Viewer)
3. Check if the sheet name is correct (if using `sheetName` parameter)

### Map not loading?

1. Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`
2. Verify the API key has Maps JavaScript API enabled

## 📝 Example Google Sheet

You can use this template:

| name | lat | lon | city | state | description | url |
|------|-----|-----|------|-------|-------------|-----|
| Property A | 40.7128 | -74.0060 | New York | NY | Great location | https://example.com |
| Property B | 34.0522 | -118.2437 | Los Angeles | CA | Beachfront | https://example.com |

## 🎯 Next Steps

- Add more columns to your sheet for richer data
- Customize the map styling and markers
- Add search functionality
- Filter by multiple criteria
- Export your map data

For more advanced features, see `GOOGLE_SHEETS_MAP_GUIDE.md`.

