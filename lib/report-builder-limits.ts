import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import {
  acquireReportJobLock,
  generateDraftLockId,
  regenerateLockId,
  releaseReportJobLock,
} from '@/lib/report-job-lock';

const HOUR_MS = 60 * 60 * 1000;

export const REPORT_RATE_LIMITS = {
  generateDraft: { limit: 5, windowMs: HOUR_MS },
  proposeAssumptions: { limit: 10, windowMs: HOUR_MS },
  regenerate: { limit: 5, windowMs: HOUR_MS },
} as const;

export function rateLimitExceededResponse(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { success: false, error: 'Rate limit exceeded. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export function generationInProgressResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Generation already in progress' },
    { status: 409 }
  );
}

export async function checkReportRateLimit(
  action: keyof typeof REPORT_RATE_LIMITS,
  userId: string
): Promise<{ allowed: true } | { allowed: false; resetAt: number }> {
  const spec = REPORT_RATE_LIMITS[action];
  const result = await checkRateLimitAsync(
    `report-builder:${action}:${userId}`,
    spec.limit,
    spec.windowMs
  );
  if (!result.allowed) {
    return { allowed: false, resetAt: result.resetAt };
  }
  return { allowed: true };
}

export async function acquireGenerateDraftLock(userId: string): Promise<boolean> {
  return acquireReportJobLock(generateDraftLockId(userId));
}

export async function releaseGenerateDraftLock(userId: string): Promise<void> {
  await releaseReportJobLock(generateDraftLockId(userId));
}

export async function acquireRegenerateLock(studyId: string): Promise<boolean> {
  return acquireReportJobLock(regenerateLockId(studyId));
}

export async function releaseRegenerateLock(studyId: string): Promise<void> {
  await releaseReportJobLock(regenerateLockId(studyId));
}
