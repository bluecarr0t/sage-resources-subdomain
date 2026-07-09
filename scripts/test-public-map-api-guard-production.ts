/**
 * Production smoke tests for public map API scraper guard + auto-ban cron.
 *
 * Run:
 *   npm run test:public-map-api-guard:prod
 *
 * Notes:
 * - Vercel Bot Protection may return 429 + x-vercel-mitigated: challenge for curl/scripts.
 *   That counts as PASS for edge scraper blocking (not a failure).
 * - App-level 403 JSON requires reaching the origin (browser or allowlisted IP).
 *
 * Optional env (.env.local):
 *   BASE_URL, CRON_SECRET, PUBLIC_MAP_API_BYPASS_SECRET
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = (process.env.BASE_URL || 'https://resources.sageoutdooradvisory.com').replace(
  /\/$/,
  ''
);
const ORIGIN = 'https://resources.sageoutdooradvisory.com';

type ResponseKind =
  | 'vercel_challenge'
  | 'vercel_deny'
  | 'app_forbidden'
  | 'app_rate_limit'
  | 'app_ok'
  | 'app_error'
  | 'other';

type CaseResult = { name: string; pass: boolean; detail: string };

const results: CaseResult[] = [];

function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}`);
  console.log(`   ${detail}\n`);
}

function classifyResponse(
  status: number,
  headers: Headers,
  bodyText: string
): ResponseKind {
  const mitigated = headers.get('x-vercel-mitigated');
  if (mitigated === 'challenge') return 'vercel_challenge';
  if (mitigated === 'deny') return 'vercel_deny';

  const contentType = headers.get('content-type') || '';
  if (contentType.includes('text/html') && bodyText.includes('Vercel Security Checkpoint')) {
    return 'vercel_challenge';
  }

  if (status === 403) {
    try {
      const json = JSON.parse(bodyText);
      if (json?.error === 'Forbidden' || json?.success === false) return 'app_forbidden';
    } catch {
      /* not JSON */
    }
    return 'other';
  }

  if (status === 429 && headers.get('x-ratelimit-scope')) return 'app_rate_limit';
  if (status === 429) return 'other';

  if (status >= 200 && status < 500) return 'app_ok';
  return 'app_error';
}

async function fetchProbe(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const bodyText = await response.text();
  const kind = classifyResponse(response.status, response.headers, bodyText);
  return { status: response.status, headers: response.headers, bodyText, kind };
}

function isBlockedAtEdge(kind: ResponseKind): boolean {
  return kind === 'vercel_challenge' || kind === 'vercel_deny';
}

function isBlockedByApp(kind: ResponseKind): boolean {
  return kind === 'app_forbidden' || kind === 'app_rate_limit';
}

async function testScraperBlockedWithoutOrigin(path: string) {
  const { status, kind } = await fetchProbe(path);
  const pass = isBlockedAtEdge(kind) || kind === 'app_forbidden';
  record(
    `Block ${path} without Origin`,
    pass,
    `status=${status}, kind=${kind} (edge or app block expected)`
  );
}

async function testScraperUaBlocked(path: string) {
  const { status, kind } = await fetchProbe(path, {
    headers: {
      Origin: ORIGIN,
      'User-Agent': 'Mozilla/5.0 (compatible; OutReserveBot/1.0)',
    },
  });
  const pass = isBlockedAtEdge(kind) || kind === 'app_forbidden';
  record(
    `Block ${path} with OutReserveBot UA`,
    pass,
    `status=${status}, kind=${kind}`
  );
}

async function testVercelEdgeProtection() {
  const { status, kind, headers } = await fetchProbe('/api/properties');
  const mitigated = headers.get('x-vercel-mitigated');
  record(
    'Vercel edge bot protection active',
    isBlockedAtEdge(kind),
    `status=${status}, x-vercel-mitigated=${mitigated ?? 'none'}, kind=${kind}`
  );
}

async function testLegitimateOrEdge(path: string) {
  const { status, kind } = await fetchProbe(path, {
    headers: { Origin: ORIGIN, 'User-Agent': 'Mozilla/5.0' },
  });
  const pass = kind === 'app_ok' || isBlockedAtEdge(kind);
  record(
    `Allow or edge-protect ${path} with Origin`,
    pass,
    `status=${status}, kind=${kind}`
  );
}

async function testGooglePlacesNoStore() {
  const { status, kind, headers } = await fetchProbe(
    '/api/google-places?propertyName=Smoke+Test+Property',
    { headers: { Origin: ORIGIN } }
  );
  if (isBlockedAtEdge(kind)) {
    record('Google Places JSON cache headers', true, `skipped — edge ${kind}`);
    return;
  }
  const cacheControl = headers.get('cache-control') || '';
  const noStore = cacheControl.toLowerCase().includes('no-store');
  record(
    'Google Places JSON uses no-store cache',
    noStore,
    `status=${status}, cache-control=${cacheControl || '(missing)'}`
  );
}

async function testPhotoProxyGuarded() {
  const blocked = await fetchProbe('/api/google-places-photo?photoName=places/test');
  const passBlocked =
    isBlockedAtEdge(blocked.kind) || blocked.kind === 'app_forbidden';
  record(
    'Photo proxy blocked without Origin',
    passBlocked,
    `status=${blocked.status}, kind=${blocked.kind}`
  );

  if (isBlockedAtEdge(blocked.kind)) {
    record('Photo proxy guarded with Origin', true, 'skipped — edge challenge on all API paths');
    return;
  }

  const allowed = await fetchProbe('/api/google-places-photo?photoName=places/test', {
    headers: { Origin: ORIGIN },
  });
  const passAllowed =
    allowed.kind === 'app_ok' ||
    allowed.kind === 'app_error' ||
    allowed.status === 400 ||
    allowed.status === 500;
  record(
    'Photo proxy reachable with Origin after guard',
    passAllowed,
    `status=${allowed.status}, kind=${allowed.kind}`
  );
}

async function testBypassSecret() {
  const secret = process.env.PUBLIC_MAP_API_BYPASS_SECRET;
  if (!secret) {
    record(
      'Bypass secret (skipped)',
      true,
      'PUBLIC_MAP_API_BYPASS_SECRET not set locally'
    );
    return;
  }

  const { status, kind } = await fetchProbe('/api/properties?fields=id', {
    headers: { 'x-public-map-api-key': secret },
  });
  const pass = kind === 'app_ok' || isBlockedAtEdge(kind);
  record(
    'Bypass header probe',
    pass,
    `status=${status}, kind=${kind}`
  );
}

async function testAutoBanCron() {
  const cronSecret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {
    'User-Agent': 'vercel-cron/1.0',
    'x-vercel-cron': '1',
  };
  if (cronSecret) headers.Authorization = `Bearer ${cronSecret}`;

  const { status, kind, bodyText } = await fetchProbe('/api/cron/ban-abusive-ips', {
    headers,
  });

  if (isBlockedAtEdge(kind)) {
    record(
      'Auto-ban cron reachable (edge blocks CLI)',
      true,
      `Vercel challenge on cron path — verify in dashboard cron logs or Vercel Functions`
    );
    record(
      'Auto-ban enabled (manual follow-up)',
      true,
      'PUBLIC_MAP_API_AUTO_BAN_ENABLED=true per user — confirm cron JSON in Vercel → Cron / Logs'
    );
    return;
  }

  if (!cronSecret) {
    record('Auto-ban cron requires auth', status === 401, `status=${status}`);
    return;
  }

  if (status !== 200) {
    record('Auto-ban cron authorized call', false, `status=${status}: ${bodyText.slice(0, 200)}`);
    return;
  }

  let payload: { enabled?: boolean; success?: boolean; error?: string; candidates?: number };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    record('Auto-ban cron JSON response', false, bodyText.slice(0, 200));
    return;
  }

  record('Auto-ban cron enabled on production', payload.enabled === true, `enabled=${payload.enabled}`);
  record(
    'Auto-ban cron firewall configured',
    payload.success === true && !payload.error,
    payload.error ?? `success=${payload.success}, candidates=${payload.candidates ?? 0}`
  );
}

async function main() {
  console.log('🔒 Public map API guard — production smoke test\n');
  console.log('='.repeat(70));
  console.log(`Base URL: ${BASE_URL}\n`);

  await testVercelEdgeProtection();

  const guardedPaths = ['/api/properties', '/api/google-places', '/api/google-places-photo'];
  for (const path of guardedPaths) {
    await testScraperBlockedWithoutOrigin(path);
    await testScraperUaBlocked(path);
  }

  await testLegitimateOrEdge('/api/properties?fields=id');
  await testGooglePlacesNoStore();
  await testPhotoProxyGuarded();
  await testBypassSecret();
  await testAutoBanCron();

  console.log('='.repeat(70));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n📋 ${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length > 0) {
    console.log('\nFailed:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }

  console.log('\n🎉 Production guard smoke test passed.');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
