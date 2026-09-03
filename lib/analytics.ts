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

import {
  classifySeoPageSection,
  extractSeoContentSlug,
  type SeoPageSection,
} from '@/lib/seo-page-section';
import { getResourcesAttributionParamsFromUrl } from '@/lib/root-domain-attribution';

function getGaMeasurementId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
}

/** Block localhost/dev hits from polluting production GA4 unless explicitly allowed. */
export function shouldSendGa4Events(
  hostname: string | null | undefined =
    typeof window !== 'undefined' ? window.location.hostname : undefined,
  options?: { skipInternalTraffic?: boolean }
): boolean {
  if (options?.skipInternalTraffic) return false;
  if (!getGaMeasurementId()) return false;
  if (!hostname) return true;

  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  ) {
    return process.env.NEXT_PUBLIC_GA4_ALLOW_LOCALHOST === 'true';
  }

  if (host.endsWith('.vercel.app') || host.endsWith('.vercel.sh')) {
    return process.env.NEXT_PUBLIC_GA4_ALLOW_PREVIEW === 'true';
  }

  return true;
}

function attributionEventParams(url?: string): Record<string, string> {
  if (!url) return {};
  const params = getResourcesAttributionParamsFromUrl(url);
  const out: Record<string, string> = {};
  if (params.utm_source) out.utm_source = params.utm_source;
  if (params.utm_medium) out.utm_medium = params.utm_medium;
  if (params.utm_campaign) out.utm_campaign = params.utm_campaign;
  if (params.utm_content) out.utm_content = params.utm_content;
  return out;
}

/**
 * Check if GA4 is available
 */
export function isGA4Available(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.gtag &&
    !!getGaMeasurementId() &&
    shouldSendGa4Events()
  );
}

/**
 * Explicit SPA page_view — required for GA4 landing page + channel reports.
 * Config-only `send_page_view` is unreliable after hydration on map routes.
 */
export function trackPageView(options: {
  pathname: string;
  searchParams?: URLSearchParams | string | null;
  extra?: Record<string, unknown>;
}): void {
  if (!isGA4Available()) return;

  const pagePath = (() => {
    const path = options.pathname.startsWith('/')
      ? options.pathname
      : `/${options.pathname}`;
    const search = options.searchParams;
    if (!search) return path;
    const query =
      search instanceof URLSearchParams
        ? search.toString()
        : search.replace(/^\?/, '').trim();
    return query ? `${path}?${query}` : path;
  })();

  window.gtag!('event', 'page_view', {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
    ...(options.extra ?? {}),
  });
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
    ...attributionEventParams(url),
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
    ...attributionEventParams(destination),
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
 * Custom time-on-page ping (not GA4's automatic `page_engagement` event).
 * Fires once on exit — GA4 already collects engagement duration natively.
 */
export function trackResourcesTimeOnPage(timeOnPageMs: number): void {
  if (timeOnPageMs < 3000) return;
  trackEvent('resources_time_on_page', {
    engagement_time_msec: timeOnPageMs,
  });
}

/**
 * Track map interactions
 */
export function trackMapInteraction(
  action: 'marker_click' | 'filter_change' | 'zoom' | 'pan' | 'region_select',
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

/** Params for GA4 Explore / organic section reports (register as custom dimensions). */
export function getSeoPageContextParams(pathname: string): {
  seo_section: SeoPageSection;
  seo_content_slug?: string;
} {
  const seo_section = classifySeoPageSection(pathname);
  const slug = extractSeoContentSlug(pathname);
  return slug ? { seo_section, seo_content_slug: slug } : { seo_section };
}

/**
 * Service-site CTA clicks (subdomain → sageoutdooradvisory.com).
 */
export function trackSeoConversionClick(
  ctaText: string,
  ctaLocation: string,
  destination: string
): void {
  trackEvent('seo_conversion_click', {
    cta_text: ctaText,
    cta_location: ctaLocation,
    destination,
    link_domain: (() => {
      try {
        return new URL(destination).hostname;
      } catch {
        return destination;
      }
    })(),
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

  window.gtag!('config', getGaMeasurementId()!, {
    custom_map: {
      [dimensionName]: value,
    },
  });
}
