/**
 * Attribution for resources.sageoutdooradvisory.com → sageoutdooradvisory.com
 * contact/booking handoffs. GHL stores utm_* on calendar bookings; GA4 outbound
 * events should use the same utm_content join key.
 */

export const RESOURCES_ROOT_CONTACT_BASE =
  'https://sageoutdooradvisory.com/contact-us/' as const;

export const RESOURCES_ATTRIBUTION = {
  utm_source: 'resources_subdomain',
  utm_medium: 'referral',
  utm_campaign: 'resources_cta',
} as const;

const ROOT_HOST_RE = /^(?:www\.)?sageoutdooradvisory\.com$/i;
const CONTACT_PATH_RE = /^\/contact-us(?:-2)?\/?$/i;
const CONTACT_HREF_IN_HTML_RE =
  /href=(["'])(https?:\/\/(?:www\.)?sageoutdooradvisory\.com\/contact-us(?:-2)?\/?(?:\?[^"']*)?)\1/gi;

/** Strip locale prefix and bound length for CRM-friendly utm_content values. */
export function normalizeResourcesUtmContent(pathname: string): string {
  let path = pathname.trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;

  const withoutLocale = path.replace(/^\/(en|es|fr|de)(?=\/|$)/i, '');
  path = withoutLocale || '/';

  // Drop query/hash if a full path-like string was passed
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q) || '/';
  const h = path.indexOf('#');
  if (h >= 0) path = path.slice(0, h) || '/';

  if (path.length > 120) path = path.slice(0, 120);
  return path;
}

export function isRootDomainContactUrl(url: string): boolean {
  if (!url) return false;
  // Relative paths are site-local; only absolute root-domain contact URLs qualify.
  if (!/^https?:\/\//i.test(url.trim())) return false;
  try {
    const parsed = new URL(url);
    if (!ROOT_HOST_RE.test(parsed.hostname)) return false;
    return CONTACT_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Add resources subdomain UTMs to a root-domain contact URL.
 * Non-contact URLs are returned unchanged.
 */
export function withResourcesAttribution(url: string, pagePath: string): string {
  if (!isRootDomainContactUrl(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('utm_source', RESOURCES_ATTRIBUTION.utm_source);
    parsed.searchParams.set('utm_medium', RESOURCES_ATTRIBUTION.utm_medium);
    parsed.searchParams.set('utm_campaign', RESOURCES_ATTRIBUTION.utm_campaign);
    parsed.searchParams.set('utm_content', normalizeResourcesUtmContent(pagePath));
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resourcesContactUsUrl(pagePath: string): string {
  return withResourcesAttribution(RESOURCES_ROOT_CONTACT_BASE, pagePath);
}

/** Rewrite contact-us hrefs inside HTML fragments (guides, FAQs, landing body). */
export function attributeRootDomainContactHrefsInHtml(
  html: string,
  pagePath: string
): string {
  if (!html) return html;
  return html.replace(
    CONTACT_HREF_IN_HTML_RE,
    (_match, quote: string, href: string) =>
      `href=${quote}${withResourcesAttribution(href, pagePath)}${quote}`
  );
}

export function getUtmContentFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, 'https://resources.sageoutdooradvisory.com').searchParams.get(
      'utm_content'
    );
  } catch {
    return null;
  }
}

export function getResourcesAttributionParamsFromUrl(url: string): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
} {
  try {
    const params = new URL(url, 'https://resources.sageoutdooradvisory.com').searchParams;
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
    };
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    };
  }
}
