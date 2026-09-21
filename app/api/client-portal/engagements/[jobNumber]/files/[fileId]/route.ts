import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireClientPortalJobAccess } from '@/lib/client-portal/auth';
import {
  createClientPortalSignedUrl,
  fetchClientPortalFileById,
} from '@/lib/client-portal/db';

export const dynamic = 'force-dynamic';

type ParamsContext = { params: Promise<{ jobNumber: string; fileId: string }> };

export async function GET(_request: NextRequest, context: ParamsContext) {
  const { jobNumber: rawJob, fileId } = await context.params;
  const jobNumber = decodeURIComponent(rawJob ?? '');
  const access = await requireClientPortalJobAccess(jobNumber);
  if (!access.ok) return access.response;

  const supabase = createServerClient();
  const file = await fetchClientPortalFileById(supabase, fileId);
  if (!file || file.engagementId !== access.access.engagement?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (file.externalUrl) {
    return NextResponse.redirect(file.externalUrl);
  }
  if (!file.storagePath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const signed = await createClientPortalSignedUrl(supabase, file.storagePath);
  if (!signed) {
    return NextResponse.json({ error: 'Could not open file' }, { status: 500 });
  }
  return NextResponse.redirect(signed);
}
