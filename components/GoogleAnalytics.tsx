'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import {
  getSeoPageContextParams,
  trackScrollDepth,
  trackResourcesTimeOnPage,
  trackOutboundLink,
  trackCTAClick,
  trackFileDownload,
  trackPageView,
  shouldSendGa4Events,
} from '@/lib/analytics';
import { isRootDomainContactUrl } from '@/lib/root-domain-attribution';
import {
  buildGa4ConfigOptions,
  buildGa4PagePath,
  serializeGa4ConfigForInlineScript,
} from '@/lib/ga4-cross-domain';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export default function GoogleAnalytics({
  skipInternalTraffic = false,
}: {
  skipInternalTraffic?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gtagReadyRef = useRef(false);
  const lastPagePathRef = useRef<string | null>(null);
  const allowGa4 = shouldSendGa4Events(undefined, { skipInternalTraffic });

  const sendPageView = useCallback(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) {
      return;
    }
    if (typeof window === 'undefined' || !window.gtag) return;

    const pagePath = buildGa4PagePath(pathname, searchParams ?? undefined);
    if (lastPagePathRef.current === pagePath) return;
    lastPagePathRef.current = pagePath;

    const seoContext = getSeoPageContextParams(pathname);
    trackPageView({
      pathname,
      searchParams: searchParams ?? null,
      extra: seoContext,
    });
  }, [pathname, searchParams, allowGa4]);

  const markGtagReady = useCallback(() => {
    if (gtagReadyRef.current) return;
    gtagReadyRef.current = true;
    sendPageView();
  }, [sendPageView]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;
    if (gtagReadyRef.current) {
      sendPageView();
    }
  }, [sendPageView]);

  // Track scroll depth
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;

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
  }, [pathname]);

  // Track time on page once when the tab hides or unloads (no 30s polling).
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;

    const startTime = Date.now();

    const flushEngagement = () => {
      trackResourcesTimeOnPage(Date.now() - startTime);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEngagement();
      }
    };

    window.addEventListener('pagehide', flushEngagement);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushEngagement);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushEngagement();
    };
  }, [pathname]);

  // Track outbound link clicks
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const linkUrl = new URL(href, window.location.origin);
        const currentUrl = new URL(window.location.href);

        if (linkUrl.hostname !== currentUrl.hostname && !href.startsWith('#')) {
          trackOutboundLink(href, link.textContent || undefined);
          if (isRootDomainContactUrl(href)) {
            trackCTAClick(
              (link.textContent || 'Contact').trim(),
              'outbound_contact_link',
              href
            );
          }
        }
      } catch {
        // Invalid URL, skip
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Track file downloads
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.csv'];
      const isFileDownload = fileExtensions.some((ext) => href.toLowerCase().endsWith(ext));

      if (isFileDownload) {
        const fileName = href.split('/').pop() || '';
        const fileType = fileName.split('.').pop() || '';
        trackFileDownload(fileName, fileType);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Track errors
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !allowGa4) return;

    const handleError = (event: ErrorEvent) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
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

  if (!GA_MEASUREMENT_ID || !allowGa4) {
    return null;
  }

  const bootstrapHostname =
    typeof window !== 'undefined'
      ? window.location.hostname
      : process.env.NODE_ENV === 'production'
        ? 'resources.sageoutdooradvisory.com'
        : 'localhost';

  const bootstrapPagePath =
    typeof window !== 'undefined'
      ? buildGa4PagePath(window.location.pathname, window.location.search.replace(/^\?/, ''))
      : '/';

  const bootstrapConfig = serializeGa4ConfigForInlineScript(
    buildGa4ConfigOptions({
      pagePath: bootstrapPagePath,
      debugMode: IS_DEVELOPMENT,
      hostname: bootstrapHostname,
      sendPageView: false,
    })
  );

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={markGtagReady}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onReady={markGtagReady}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', ${bootstrapConfig});
          `,
        }}
      />
    </>
  );
}
