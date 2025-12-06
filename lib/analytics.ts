/**
 * Google Analytics 4 Event Tracking Utilities
 * 
 * This file provides helper functions for tracking custom events in GA4.
 * Use these functions throughout the application to track user interactions.
 */

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date | Record<string, any>,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Check if GA4 is available
 */
export function isGA4Available(): boolean {
  return typeof window !== 'undefined' && !!window.gtag && !!GA_MEASUREMENT_ID;
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  if (!isGA4Available()) return;

  window.gtag!('event', eventName, {
    ...eventParams,
    // Add timestamp for debugging
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track outbound link clicks
 */
export function trackOutboundLink(url: string, linkText?: string): void {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: url,
    link_url: url,
    link_text: linkText,
    transport_type: 'beacon',
  });
}

/**
 * Track CTA button clicks
 */
export function trackCTAClick(
  ctaText: string,
  ctaLocation: string,
  destination?: string
): void {
  trackEvent('cta_click', {
    cta_text: ctaText,
    cta_location: ctaLocation,
    destination: destination,
  });
}

/**
 * Track form submissions
 */
export function trackFormSubmission(
  formName: string,
  formLocation: string,
  success: boolean = true
): void {
  trackEvent(success ? 'form_submit' : 'form_submit_error', {
    form_name: formName,
    form_location: formLocation,
  });
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(depth: number): void {
  trackEvent('scroll', {
    event_category: 'engagement',
    value: depth,
    scroll_depth: `${depth}%`,
  });
}

/**
 * Track file downloads
 */
export function trackFileDownload(fileName: string, fileType: string): void {
  trackEvent('file_download', {
    file_name: fileName,
    file_extension: fileType,
  });
}

/**
 * Track search queries (if you have site search)
 */
export function trackSearch(query: string, resultsCount?: number): void {
  trackEvent('search', {
    search_term: query,
    results_count: resultsCount,
  });
}

/**
 * Track video interactions (if you have videos)
 */
export function trackVideoInteraction(
  action: 'play' | 'pause' | 'complete',
  videoTitle: string,
  videoDuration?: number
): void {
  trackEvent('video_' + action, {
    video_title: videoTitle,
    video_duration: videoDuration,
  });
}

/**
 * Track page engagement (time on page)
 */
export function trackPageEngagement(timeOnPage: number): void {
  trackEvent('page_engagement', {
    engagement_time_msec: timeOnPage,
  });
}

/**
 * Track map interactions
 */
export function trackMapInteraction(
  action: 'marker_click' | 'filter_change' | 'zoom' | 'pan',
  details?: Record<string, any>
): void {
  trackEvent('map_interaction', {
    map_action: action,
    ...details,
  });
}

/**
 * Track property page interactions
 */
export function trackPropertyInteraction(
  action: 'view' | 'photo_click' | 'directions_click',
  propertyName: string,
  propertyId?: string
): void {
  trackEvent('property_interaction', {
    property_action: action,
    property_name: propertyName,
    property_id: propertyId,
  });
}

/**
 * Track glossary term views
 */
export function trackGlossaryTermView(term: string): void {
  trackEvent('glossary_term_view', {
    term: term,
  });
}

/**
 * Track guide views
 */
export function trackGuideView(guideSlug: string, guideTitle: string): void {
  trackEvent('guide_view', {
    guide_slug: guideSlug,
    guide_title: guideTitle,
  });
}

/**
 * Track landing page views with content type
 */
export function trackLandingPageView(
  slug: string,
  contentType: string
): void {
  trackEvent('landing_page_view', {
    page_slug: slug,
    content_type: contentType,
  });
}

/**
 * Set custom user properties
 */
export function setUserProperty(property: string, value: string): void {
  if (!isGA4Available()) return;

  window.gtag!('set', 'user_properties', {
    [property]: value,
  });
}

/**
 * Set custom dimensions (requires setup in GA4)
 */
export function setCustomDimension(
  dimensionName: string,
  value: string
): void {
  if (!isGA4Available()) return;

  window.gtag!('config', GA_MEASUREMENT_ID!, {
    custom_map: {
      [dimensionName]: value,
    },
  });
}
