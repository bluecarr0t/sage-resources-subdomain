import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    return NextResponse.next();
  }

  // If pathname is just "/" or has multiple segments, let Next.js handle it
  // Only rewrite single-segment paths that aren't excluded
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 1 && !excludedRoutes.includes(segments[0])) {
    // Rewrite to /landing/:slug
    const url = request.nextUrl.clone();
    url.pathname = `/landing/${segments[0]}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
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

