import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  listRemapHistory,
  type QuickbooksRemapHistoryAction,
  type QuickbooksRemapHistorySource,
} from '@/lib/quickbooks';

export const dynamic = 'force-dynamic';

function parseAction(
  value: string | null
): QuickbooksRemapHistoryAction | 'all' {
  if (
    value === 'updated' ||
    value === 'matched_dry_run' ||
    value === 'error' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
}

function parseSource(
  value: string | null
): QuickbooksRemapHistorySource | 'all' {
  if (
    value === 'admin' ||
    value === 'cron' ||
    value === 'webhook' ||
    value === 'script' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page') || '1'), 1);
  const perPage = Math.min(Math.max(Number(searchParams.get('perPage') || '50'), 1), 100);
  const action = parseAction(searchParams.get('action'));
  const source = parseSource(searchParams.get('source'));
  const offset = (page - 1) * perPage;

  try {
    const { entries, total } = await listRemapHistory({
      limit: perPage,
      offset,
      action,
      source,
    });

    return NextResponse.json({
      entries,
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Could not load remap history',
      },
      { status: 500 }
    );
  }
}, { requireRole: 'admin' });
