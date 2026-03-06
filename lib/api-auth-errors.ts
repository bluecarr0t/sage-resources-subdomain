/**
 * Standardized auth error responses for admin API routes.
 * Use consistent messages to avoid enumeration and improve security.
 */

import { NextResponse } from 'next/server';

export const AUTH_ERRORS = {
  /** 401 - No session or invalid session */
  UNAUTHORIZED: { success: false, error: 'Unauthorized' },
  /** 403 - Session valid but not allowed (domain, managed user) */
  FORBIDDEN: { success: false, error: 'Forbidden' },
} as const;

export function unauthorizedResponse() {
  return NextResponse.json(AUTH_ERRORS.UNAUTHORIZED, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json(AUTH_ERRORS.FORBIDDEN, { status: 403 });
}
