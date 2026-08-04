/**
 * Shared GA4 config for resources ↔ root session stitching.
 *
 * Subdomains of sageoutdooradvisory.com share first-party cookies when
 * cookie_domain is the parent host. Linker + accept_incoming covers www/apex
 * handoffs and incoming `_gl` decoration from the root site.
 */

export const GA4_LINKED_DOMAINS = [
  'sageoutdooradvisory.com',
  'www.sageoutdooradvisory.com',
  'resources.sageoutdooradvisory.com',
] as const;

export const GA4_COOKIE_DOMAIN = '.sageoutdooradvisory.com' as const;

export type Ga4ConfigOptions = {
  page_path?: string;
  send_page_view?: boolean;
  allow_enhanced_conversions?: boolean;
  allow_google_signals?: boolean;
  allow_ad_personalization_signals?: boolean;
  cookie_domain?: string;
  cookie_flags?: string;
  linker?: {
    domains: string[];
    accept_incoming: boolean;
    decorate_forms?: boolean;
  };
  debug_mode?: boolean;
  [key: string]: unknown;
};

export function shouldUseParentCookieDomain(
  hostname: string | null | undefined = typeof window !== 'undefined'
    ? window.location.hostname
    : undefined
): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return false;
  }
  // Preview / ephemeral hosts should not write cookies for the production parent.
  if (host.endsWith('.vercel.app') || host.endsWith('.vercel.sh')) {
    return false;
  }
  return (
    host === 'sageoutdooradvisory.com' ||
    host.endsWith('.sageoutdooradvisory.com')
  );
}

/**
 * Base gtag config shared by the bootstrap snippet and client pageview updates.
 */
export function buildGa4ConfigOptions(options?: {
  pagePath?: string;
  debugMode?: boolean;
  hostname?: string | null;
  extra?: Record<string, unknown>;
}): Ga4ConfigOptions {
  const hostname =
    options?.hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : undefined);
  const useParentCookie = shouldUseParentCookieDomain(hostname);

  const config: Ga4ConfigOptions = {
    send_page_view: true,
    allow_enhanced_conversions: true,
    allow_google_signals: true,
    allow_ad_personalization_signals: true,
    cookie_flags: 'SameSite=None;Secure',
    linker: {
      domains: [...GA4_LINKED_DOMAINS],
      accept_incoming: true,
      decorate_forms: true,
    },
    ...(options?.pagePath ? { page_path: options.pagePath } : {}),
    ...(options?.debugMode ? { debug_mode: true } : {}),
    ...(options?.extra ?? {}),
  };

  if (useParentCookie) {
    config.cookie_domain = GA4_COOKIE_DOMAIN;
  }

  return config;
}

/** Serialize config for the inline bootstrap <script> (no functions). */
export function serializeGa4ConfigForInlineScript(
  config: Ga4ConfigOptions
): string {
  return JSON.stringify(config);
}
