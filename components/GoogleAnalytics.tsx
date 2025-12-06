'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { trackScrollDepth, trackPageEngagement } from '@/lib/analytics';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Track page view
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
        // Enhanced measurement settings
        send_page_view: true,
        // Enable enhanced measurement features
        allow_enhanced_conversions: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: true,
        // Debug mode in development
        debug_mode: IS_DEVELOPMENT,
      });
    }
  }, [pathname, searchParams]);

  // Track scroll depth
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    let scrollTracked = {
      25: false,
      50: false,
      75: false,
      90: false,
    };

    const handleScroll = () => {
      const scrollPercent = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      );

      // Track milestone scroll depths
      if (scrollPercent >= 90 && !scrollTracked[90]) {
        trackScrollDepth(90);
        scrollTracked[90] = true;
      } else if (scrollPercent >= 75 && !scrollTracked[75]) {
        trackScrollDepth(75);
        scrollTracked[75] = true;
      } else if (scrollPercent >= 50 && !scrollTracked[50]) {
        trackScrollDepth(50);
        scrollTracked[50] = true;
      } else if (scrollPercent >= 25 && !scrollTracked[25]) {
        trackScrollDepth(25);
        scrollTracked[25] = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track time on page
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const startTime = Date.now();

    const trackEngagement = () => {
      const timeOnPage = Date.now() - startTime;
      if (timeOnPage > 3000) {
        // Only track if user spent more than 3 seconds
        trackPageEngagement(timeOnPage);
      }
    };

    // Track engagement when user leaves the page
    const handleBeforeUnload = () => {
      trackEngagement();
    };

    // Track engagement every 30 seconds while on page
    const interval = setInterval(trackEngagement, 30000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      trackEngagement();
    };
  }, [pathname]);

  // Track outbound link clicks
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's an outbound link (external domain)
      try {
        const linkUrl = new URL(href, window.location.origin);
        const currentUrl = new URL(window.location.href);
        
        // Track if it's an external link
        if (linkUrl.hostname !== currentUrl.hostname && !href.startsWith('#')) {
          const { trackOutboundLink } = require('@/lib/analytics');
          trackOutboundLink(href, link.textContent || undefined);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Track file downloads
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's a file download
      const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.csv'];
      const isFileDownload = fileExtensions.some(ext => href.toLowerCase().endsWith(ext));

      if (isFileDownload) {
        const fileName = href.split('/').pop() || '';
        const fileType = fileName.split('.').pop() || '';
        const { trackFileDownload } = require('@/lib/analytics');
        trackFileDownload(fileName, fileType);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Track errors
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleError = (event: ErrorEvent) => {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: event.message,
          fatal: false,
          error_file: event.filename,
          error_line: event.lineno,
        });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
              allow_enhanced_conversions: true,
              allow_google_signals: true,
              allow_ad_personalization_signals: true,
              ${IS_DEVELOPMENT ? "debug_mode: true," : ""}
            });
          `,
        }}
      />
    </>
  );
}
