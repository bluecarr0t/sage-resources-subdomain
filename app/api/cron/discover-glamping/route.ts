import { NextRequest, NextResponse } from 'next/server';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

/**
 * Cron endpoint for glamping discovery pipeline
 * Runs Tavily-based discovery with limit 1 to stay within serverless timeout.
 * Tavily is preferred over RSS because Google News RSS URLs frequently fail to fetch.
 *
 * Schedule: Daily at 15:00 UTC — see vercel.json (`0 15 * * *`).
 * Vercel Cron invokes this route with HTTP GET (and POST is supported for manual triggers).
 * Set CRON_SECRET in Vercel for auth. Required env: NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY), OPENAI_API_KEY, TAVILY_API_KEY.
 *
 * For full runs, use: npm run discover:glamping (or GitHub Actions)
 */
function runDiscovery(request: NextRequest): NextResponse {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scriptPath = resolve(process.cwd(), 'scripts/discover-glamping-from-news.ts');

  try {
    const result = spawnSync('npx', ['tsx', scriptPath, '--tavily', '--limit', '1'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 90000, // 90s max
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

    if (result.status !== 0) {
      console.error('Glamping discovery failed:', output);
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Script failed', output: output.slice(-500) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Discovery run completed (Tavily, limit 1 article)',
      output: output.slice(-1000),
    });
  } catch (err) {
    console.error('Glamping discovery cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}

/** Vercel Cron uses GET */
export async function GET(request: NextRequest) {
  return runDiscovery(request);
}

/** Manual / integration triggers */
export async function POST(request: NextRequest) {
  return runDiscovery(request);
}
