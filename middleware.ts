import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, type Locale } from './i18n';
import { NextRequest, NextResponse } from 'next/server';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always show locale prefix (no default locale without prefix)
  localePrefix: 'always',
});

/**
 * Map country codes to locales
 * Country codes are ISO 3166-1 alpha-2 codes (e.g., 'US', 'FR', 'ES')
 */
const countryToLocaleMap: Record<string, Locale> = {
  // English-speaking countries
  US: 'en',
  GB: 'en',
  CA: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
  SG: 'en',
  HK: 'en',
  // Spanish-speaking countries
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  // French-speaking countries
  FR: 'fr',
  BE: 'fr', // Belgium (primary French-speaking region)
  CH: 'fr', // Switzerland (French-speaking region; German speakers will use Accept-Language header)
  LU: 'fr',
  MC: 'fr',
  // German-speaking countries
  DE: 'de',
  AT: 'de',
  LI: 'de',
  // CH: 'de', // Switzerland (German-speaking region, but defaulting to fr)
};

/**
 * Get locale from geo location (country code only)
 * Returns null if geo info is not available or country is not mapped
 */
function getGeoLocale(request: NextRequest): Locale | null {
  const geo = request.geo;
  if (geo?.country) {
    const countryCode = geo.country.toUpperCase();
    const geoLocale = countryToLocaleMap[countryCode];
    if (geoLocale) {
      return geoLocale;
    }
  }
  return null;
}

/**
 * Detect locale based on geographic location
 * Falls back to Accept-Language header, then defaultLocale
 */
function detectLocale(request: NextRequest): Locale {
  // Priority 1: Geo-based detection (if available via Vercel geo)
  const geoLocale = getGeoLocale(request);
  if (geoLocale) {
    return geoLocale;
  }

  // Priority 2: Accept-Language header
  const acceptLanguage = request.headers.get('accept-language') || '';
  if (acceptLanguage) {
    // Parse Accept-Language header and find matching locale
    // Format: "en-US,en;q=0.9,fr;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase().substring(0, 2));
    
    for (const lang of languages) {
      if (locales.includes(lang as Locale)) {
        return lang as Locale;
      }
    }
  }

  // Priority 3: Default locale
  return defaultLocale;
}

/**
 * Extract locale from pathname
 * Returns the locale if pathname starts with /{locale}/ or is /{locale}, null otherwise
 */
function getLocaleFromPathname(pathname: string): Locale | null {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale as Locale;
    }
  }
  return null;
}

/**
 * Remove locale prefix from pathname
 * e.g., /fr/guides/test -> /guides/test
 */
function removeLocaleFromPathname(pathname: string): string {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(locale.length + 1);
    }
    if (pathname === `/${locale}`) {
      return '/';
    }
  }
  return pathname;
}

// Routes that should NOT be rewritten to /landing
const excludedRoutes = [
  'map',
  'glossary',
  'guides',
  'partners',
  'map-sheet',
  'api',
  'landing',
  'property',
  'login',
  'privacy-policy',
  'terms-of-service',
  'admin',
  'sitemap',
  'sitemap.xml',
  'sitemaps',
  'robots.txt',
  'llms.txt',
  'favicon.ico',
  '_next',
];

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Check if pathname already has a locale prefix (needed early for sitemap logic)
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // Handle root path - redirect to detected locale based on geo location
    if (pathname === '/') {
      const detectedLocale = detectLocale(request);
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLocale}`;
      return NextResponse.redirect(url);
    }

    // Handle sitemap routes - completely exclude from i18n middleware
    // These should be served directly without any locale processing
    if (pathname === '/sitemap.xml' || pathname.startsWith('/sitemaps/')) {
      // Let Next.js serve the route handler directly, no middleware processing
      return NextResponse.next();
    }

    // Skip geo-based redirect for API routes, static files, and Next.js internals
    const shouldSkipGeoRedirect = 
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.'); // Skip static files (images, etc.)

    // Check if pathname has a locale prefix and redirect based on geo location
    // Only redirect if we have geo information and it doesn't match the path locale
    if (!shouldSkipGeoRedirect) {
      const pathLocale = getLocaleFromPathname(pathname);
      if (pathLocale) {
        const geoLocale = getGeoLocale(request);
        // If we have geo info and it doesn't match the path locale, redirect
        if (geoLocale && geoLocale !== pathLocale) {
          const pathWithoutLocale = removeLocaleFromPathname(pathname);
          const url = request.nextUrl.clone();
          // If path was just /{locale}, redirect to /{geoLocale}
          url.pathname = pathWithoutLocale === '/' 
            ? `/${geoLocale}` 
            : `/${geoLocale}${pathWithoutLocale}`;
          return NextResponse.redirect(url);
        }
      }
    }

    // Handle locale-prefixed sitemap requests - redirect to root sitemap
    // e.g., /en/sitemap.xml -> /sitemap.xml
    // e.g., /en/sitemaps/main.xml -> /sitemaps/main.xml
    if (pathname.endsWith('/sitemap.xml') && pathname !== '/sitemap.xml') {
      const url = request.nextUrl.clone();
      url.pathname = '/sitemap.xml';
      return NextResponse.redirect(url);
    }
    if (pathname.includes('/sitemaps/') && pathnameHasLocale) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/[a-z]{2}\//, '/');
      return NextResponse.redirect(url);
    }

    // Check if pathname is just a locale (e.g., /en, /es, /fr, /de)
    const isLocaleOnly = locales.some((locale) => pathname === `/${locale}`);

    // Skip middleware for excluded routes, static files, and Next.js internals
    if (
      excludedRoutes.some(route => pathname.startsWith(`/${route}`)) ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.') // Skip static files (images, etc.)
    ) {
        // For sitemap, robots.txt, login, admin, and legal pages, skip i18n middleware entirely
        if (pathname === '/sitemap.xml' || pathname.startsWith('/sitemaps/') || pathname === '/robots.txt' || pathname === '/llms.txt' || pathname === '/login' || pathname === '/admin' || pathname === '/privacy-policy' || pathname === '/terms-of-service') {
          return NextResponse.next();
        }
      // Still apply i18n middleware for other excluded routes
      return intlMiddleware(request);
    }

    // If pathname is just a locale (e.g., /en), let i18n middleware handle it
    // This allows the locale-only route to work properly
    if (isLocaleOnly) {
      return intlMiddleware(request);
    }

    // If pathname has multiple segments, let Next.js handle it
    // Only rewrite single-segment paths that aren't excluded and don't have locale
    const segments = pathname.split('/').filter(Boolean);
    
    if (
      segments.length === 1 && 
      !excludedRoutes.includes(segments[0]) &&
      !pathnameHasLocale
    ) {
      // Detect locale based on geo location, Accept-Language header, or default
      const detectedLocale = detectLocale(request);
      
      // Rewrite to /[locale]/landing/:slug
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLocale}/landing/${segments[0]}`;
      return NextResponse.rewrite(url);
    }

    // Apply i18n middleware for all other routes
    return intlMiddleware(request);
  } catch (error) {
    // Fallback: if anything goes wrong, redirect to default locale
    console.error('Middleware error:', error);
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
