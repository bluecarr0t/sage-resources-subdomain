import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';
import { sanitizeFilename } from '@/lib/sanitize-filename';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth-errors';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'report-uploads';
const MAX_FILES = 20;

function getContentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  // Use octet-stream for .xlsm and .doc - Supabase rejects macroEnabled.12 and msword
  if (lower.endsWith('.xlsm') || lower.endsWith('.doc')) return 'application/octet-stream';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createServerClientWithCookies();
    const {
      data: { session },
      error: sessionError,
    } = await supabaseAuth.auth.getSession();

    if (sessionError || !session?.user) return unauthorizedResponse();
    if (!isAllowedEmailDomain(session.user.email)) return forbiddenResponse();
    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) return forbiddenResponse();

    const { files } = (await request.json()) as {
      files: Array<{ name: string; size: number }>;
    };

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files specified' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_FILES} files per batch` },
        { status: 400 }
      );
    }

    const batchId = crypto.randomUUID();
    const supabaseAdmin = createServerClient();
    const uploads: Array<{
      name: string;
      storagePath: string;
      signedUrl: string;
      token: string;
      contentType: string;
    }> = [];

    for (const file of files) {
      const safeName = sanitizeFilename(file.name);
      const storagePath = `temp-uploads/${batchId}/${safeName}`;
      const contentType = getContentTypeForFilename(safeName);
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(storagePath, { upsert: true });

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: `Failed to prepare upload for ${safeName}: ${error.message}`,
          },
          { status: 500 }
        );
      }

      uploads.push({
        name: safeName,
        storagePath,
        signedUrl: data.signedUrl,
        token: data.token,
        contentType,
      });
    }

    return NextResponse.json({ success: true, batchId, uploads });
  } catch (err) {
    console.error('[presign-upload] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to prepare uploads' },
      { status: 500 }
    );
  }
}
