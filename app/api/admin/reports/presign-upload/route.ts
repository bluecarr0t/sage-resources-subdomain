import { NextRequest, NextResponse } from 'next/server';
import { createServerClientWithCookies } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { isManagedUser, isAllowedEmailDomain } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'report-uploads';
const MAX_FILES = 20;

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

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!isAllowedEmailDomain(session.user.email)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const hasAccess = await isManagedUser(session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

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
    }> = [];

    for (const file of files) {
      const storagePath = `temp-uploads/${batchId}/${file.name}`;
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(storagePath);

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message: `Failed to prepare upload for ${file.name}: ${error.message}`,
          },
          { status: 500 }
        );
      }

      uploads.push({
        name: file.name,
        storagePath,
        signedUrl: data.signedUrl,
        token: data.token,
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
