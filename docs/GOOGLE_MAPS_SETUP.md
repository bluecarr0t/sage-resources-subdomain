# Google Maps Setup Guide

This project uses Google Maps for displaying property locations. Follow these steps to set it up:

## 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key

## 2. Configure API Key Restrictions (Recommended)

For security, restrict your API key:

1. Click on your API key in the Credentials page
2. Under "API restrictions", select "Restrict key"
3. Choose "Maps JavaScript API"
4. Under "Application restrictions", you can:
   - Restrict by HTTP referrer (for web apps)
   - Add your domain(s) to the allowed list

## 3. Add API Key to Environment Variables

Add your API key to `.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## 4. Pricing

Google Maps offers a **free tier** with $200/month credit, which covers:
- ~28,000 map loads per month
- ~100,000 static map requests
- ~40,000 dynamic map requests

For most small-to-medium sites, this is sufficient. See [Google Maps Pricing](https://developers.google.com/maps/billing-and-pricing/pricing) for details.

## 5. Verify Setup

After adding your API key:
1. Restart your development server
2. Visit `http://localhost:3001/map`
3. The map should load with Google Maps tiles

If you see an error message asking for an API key, check that:
- The key is correctly added to `.env.local`
- The server has been restarted
- The API key has the Maps JavaScript API enabled

## Troubleshooting

### "This page can't load Google Maps correctly"
- Check that your API key is correct
- Verify the Maps JavaScript API is enabled
- Check browser console for specific error messages

### API key restrictions blocking requests
- Make sure your localhost is allowed (for development)
- Add your production domain to allowed referrers

### Billing issues
- Ensure billing is enabled on your Google Cloud project
- Check your usage in the Google Cloud Console

