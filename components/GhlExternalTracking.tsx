import {
  GHL_EXTERNAL_TRACKING_SCRIPT_SRC,
  getGhlExternalTrackingId,
  shouldLoadGhlExternalTracking,
} from '@/lib/ghl/external-tracking';

/**
 * GHL External Tracking (CRM). Native server-rendered tag so it appears in
 * View Source, matching the WordPress footer snippet. Not GA4.
 */
export default function GhlExternalTracking({
  pathname,
}: {
  pathname?: string | null;
}) {
  if (!shouldLoadGhlExternalTracking(pathname)) {
    return null;
  }

  return (
    <script
      id="ghl-external-tracking"
      src={GHL_EXTERNAL_TRACKING_SCRIPT_SRC}
      data-tracking-id={getGhlExternalTrackingId()}
    />
  );
}
