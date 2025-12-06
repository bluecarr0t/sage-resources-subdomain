# Google Analytics 4 Implementation Guide

## Overview

This guide documents the enhanced GA4 implementation for the Sage Outdoor Advisory subdomain marketing site. The implementation includes automatic event tracking, custom events, and best practices for data collection.

## Features Implemented

### ✅ Automatic Tracking

1. **Page Views** - Automatically tracked on all route changes
2. **Scroll Depth** - Tracks when users scroll 25%, 50%, 75%, and 90% of the page
3. **Time on Page** - Tracks engagement time (tracks every 30 seconds and on page exit)
4. **Outbound Links** - Automatically tracks clicks to external domains (e.g., sageoutdooradvisory.com)
5. **File Downloads** - Tracks downloads of PDFs, Word docs, Excel files, etc.
6. **Error Tracking** - Captures JavaScript errors automatically

### ✅ Custom Event Tracking

The `lib/analytics.ts` file provides helper functions for tracking custom events:

#### Available Functions

- `trackEvent()` - Generic event tracking
- `trackOutboundLink()` - Track external link clicks
- `trackCTAClick()` - Track CTA button clicks
- `trackFormSubmission()` - Track form submissions
- `trackScrollDepth()` - Track scroll milestones
- `trackFileDownload()` - Track file downloads
- `trackSearch()` - Track search queries
- `trackVideoInteraction()` - Track video play/pause/complete
- `trackMapInteraction()` - Track map interactions
- `trackPropertyInteraction()` - Track property page interactions
- `trackGlossaryTermView()` - Track glossary term views
- `trackGuideView()` - Track guide page views
- `trackLandingPageView()` - Track landing page views with content type

## Usage Examples

### Track CTA Button Clicks

```tsx
import { trackCTAClick } from '@/lib/analytics';

function CTAButton() {
  const handleClick = () => {
    trackCTAClick('Schedule Consultation', 'hero_section', 'https://sageoutdooradvisory.com/contact-us/');
    // Navigate to link...
  };

  return <button onClick={handleClick}>Schedule Consultation</button>;
}
```

### Track Form Submissions

```tsx
import { trackFormSubmission } from '@/lib/analytics';

function ContactForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Submit form...
      trackFormSubmission('contact_form', 'landing_page', true);
    } catch (error) {
      trackFormSubmission('contact_form', 'landing_page', false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Track Map Interactions

```tsx
import { trackMapInteraction } from '@/lib/analytics';

function PropertyMap() {
  const handleMarkerClick = (propertyId: string) => {
    trackMapInteraction('marker_click', {
      property_id: propertyId,
      property_name: 'Example Property',
    });
  };

  return <Map onMarkerClick={handleMarkerClick} />;
}
```

### Track Property Page Views

```tsx
import { trackPropertyInteraction } from '@/lib/analytics';

useEffect(() => {
  trackPropertyInteraction('view', propertyName, propertyId);
}, [propertyName, propertyId]);
```

## Recommended Custom Dimensions

Set up these custom dimensions in GA4 for better segmentation:

1. **Content Type** - landing_page, guide, glossary, property, map
2. **Page Category** - feasibility, appraisal, industry, resources
3. **User Type** - new, returning
4. **Traffic Source** - organic, direct, referral, social

### Setting Up Custom Dimensions in GA4

1. Go to Admin → Custom Definitions → Custom Dimensions
2. Click "Create custom dimension"
3. Add dimensions:
   - Dimension name: `Content Type`
   - Scope: `Event`
   - Event parameter: `content_type`

Repeat for other dimensions.

## Event Naming Conventions

We follow GA4 best practices:

- **Use snake_case** for event names: `cta_click`, `form_submit`
- **Be descriptive**: `property_interaction` not `click`
- **Group related events**: All property events start with `property_`
- **Include context**: Add parameters like `cta_location`, `form_name`

## Debugging

### Development Mode

In development, GA4 debug mode is automatically enabled. You can:

1. Open browser DevTools → Console
2. Look for GA4 debug messages
3. Use the [GA Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)

### Testing Events

1. Open GA4 → Admin → DebugView
2. Enable debug mode in your browser
3. Navigate your site and see events in real-time

### Verifying Events

1. Go to GA4 → Reports → Engagement → Events
2. Wait 24-48 hours for data to appear (or use DebugView for real-time)
3. Check that events are firing correctly

## Privacy Considerations

### GDPR Compliance

If you serve EU users, consider:

1. **Cookie Consent** - Implement a cookie consent banner
2. **Anonymize IP** - Already enabled in the config
3. **Data Retention** - Set in GA4 Admin → Data Settings → Data Retention

### Update Configuration

```typescript
gtag('config', GA_MEASUREMENT_ID, {
  anonymize_ip: true, // Anonymize IP addresses
  cookie_flags: 'SameSite=None;Secure', // For cross-domain tracking
});
```

## Performance Best Practices

1. **Script Loading** - Uses `afterInteractive` strategy (loads after page is interactive)
2. **Event Batching** - GA4 automatically batches events
3. **Beacon API** - Outbound links use `transport_type: 'beacon'` for reliable tracking

## Key Metrics to Monitor

### Engagement Metrics
- **Scroll Depth** - Are users reading your content?
- **Time on Page** - How engaged are users?
- **Pages per Session** - Are users exploring multiple pages?

### Conversion Metrics
- **CTA Clicks** - Track all CTA button clicks
- **Form Submissions** - Track contact form submissions
- **Outbound Link Clicks** - Track clicks to main domain

### Content Performance
- **Landing Page Views** - Which landing pages perform best?
- **Guide Views** - Which guides are most popular?
- **Glossary Term Views** - Which terms are most searched?

### User Behavior
- **Map Interactions** - How users interact with property maps
- **Property Views** - Which properties get the most views
- **Search Queries** - What are users searching for?

## Troubleshooting

### Events Not Appearing

1. Check that `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
2. Verify events in DebugView
3. Check browser console for errors
4. Ensure you're not using an ad blocker

### Outbound Links Not Tracking

- Links must be `<a>` tags (not buttons styled as links)
- Links must have `href` attribute
- External links are detected by hostname comparison

### Scroll Depth Not Working

- Ensure pages have enough content to scroll
- Check that scroll event listener is attached
- Verify in DebugView that scroll events fire

## Next Steps

1. **Set up Custom Dimensions** in GA4 Admin
2. **Create Custom Reports** for key metrics
3. **Set up Goals/Conversions** for important events
4. **Implement Cookie Consent** if serving EU users
5. **Add more custom events** as needed for your specific use cases

## Resources

- [GA4 Event Documentation](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [GA4 Custom Dimensions](https://support.google.com/analytics/answer/10075209)
- [GA4 DebugView](https://support.google.com/analytics/answer/7203662)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)
