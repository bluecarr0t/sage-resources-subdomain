'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  GHL_EXTERNAL_TRACKING_SCRIPT_SRC,
  getGhlExternalTrackingId,
  shouldLoadGhlExternalTracking,
} from '@/lib/ghl/external-tracking';

/**
 * GHL External Tracking pixel (CRM attribution). Independent of GA4.
 */
export default function GhlExternalTracking() {
  const pathname = usePathname();

  if (!shouldLoadGhlExternalTracking(pathname)) {
    return null;
  }

  return (
    <Script
      id="ghl-external-tracking"
      src={GHL_EXTERNAL_TRACKING_SCRIPT_SRC}
      strategy="afterInteractive"
      data-tracking-id={getGhlExternalTrackingId()}
    />
  );
}
