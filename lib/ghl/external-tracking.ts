/**
 * GoHighLevel External Tracking (not GA4).
 * Same script/id as sageoutdooradvisory.com WPCode footer.
 */

export const GHL_EXTERNAL_TRACKING_SCRIPT_SRC =
  'https://link.msgsndr.com/js/external-tracking.js' as const;

/** Public tracking id (same as WordPress). Override with NEXT_PUBLIC_GHL_EXTERNAL_TRACKING_ID. */
export const GHL_EXTERNAL_TRACKING_ID_DEFAULT =
  'tk_856ca8c83b494b0f971b30be0a84b581' as const;

export function getGhlExternalTrackingId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GHL_EXTERNAL_TRACKING_ID?.trim();
  return fromEnv || GHL_EXTERNAL_TRACKING_ID_DEFAULT;
}

export function shouldLoadGhlExternalTracking(
  pathname: string | null | undefined,
  options?: {
    nodeEnv?: string;
    vercelEnv?: string | null;
  }
): boolean {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const vercelEnv =
    options?.vercelEnv ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? null;

  if (!getGhlExternalTrackingId()) return false;
  if (nodeEnv === 'development') return false;
  if (vercelEnv === 'preview') return false;

  const path = pathname ?? '';
  if (path === '/admin' || path.startsWith('/admin/')) return false;

  return true;
}
