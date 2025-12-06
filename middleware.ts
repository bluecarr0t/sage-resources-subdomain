import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
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
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
  '_next',
];

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Handle root path - redirect to default locale
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/${defaultLocale}`;
      return NextResponse.redirect(url);
    }

    // Check if pathname already has a locale prefix
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // Check if pathname is just a locale (e.g., /en, /es, /fr, /de)
    const isLocaleOnly = locales.some((locale) => pathname === `/${locale}`);

    // Skip middleware for excluded routes, static files, and Next.js internals
    if (
      excludedRoutes.some(route => pathname.startsWith(`/${route}`)) ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.') // Skip static files (images, etc.)
    ) {
      // Still apply i18n middleware for these routes
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
      // Get locale from Accept-Language header or use default
      const acceptLanguage = request.headers.get('accept-language') || '';
      let detectedLocale = defaultLocale;
      
      // Simple locale detection from Accept-Language header
      for (const locale of locales) {
        if (acceptLanguage.includes(locale)) {
          detectedLocale = locale;
          break;
        }
      }
      
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
