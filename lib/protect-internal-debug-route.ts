import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { authorizeVercelCronRequest } from '@/lib/vercel-cron-auth';
import type { NextRequest } from 'next/server';

/**
 * Blocks unauthenticated access to internal debug/test API routes in production.
 * In development, allows open access for local debugging.
 */
export async function guardInternalDebugRoute(
  request: NextRequest
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (authorizeVercelCronRequest(request)) {
    return null;
  }

  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}
