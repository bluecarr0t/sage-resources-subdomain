import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/require-admin-auth';
import { getSageAiServerCapabilities } from '@/lib/sage-ai/server-capabilities';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authResult = await requireAdminAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  return NextResponse.json(getSageAiServerCapabilities());
}
