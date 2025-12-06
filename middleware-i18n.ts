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

  // Don't redirect for these paths
  localeDetection: true,
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
  const { pathname } = request.nextUrl;

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

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If pathname is just "/" or has multiple segments, let Next.js handle it
  // Only rewrite single-segment paths that aren't excluded and don't have locale
  const segments = pathname.split('/').filter(Boolean);
  
  if (
    segments.length === 1 && 
    !excludedRoutes.includes(segments[0]) &&
    !pathnameHasLocale
  ) {
    // First apply i18n middleware to get the locale
    const response = intlMiddleware(request);
    
    // Then rewrite to /[locale]/landing/:slug
    const locale = response.headers.get('x-middleware-rewrite')?.match(/\/([a-z]{2})\//)?.[1] || defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/landing/${segments[0]}`;
    return NextResponse.rewrite(url);
  }

  // Apply i18n middleware for all other routes
  return intlMiddleware(request);
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
