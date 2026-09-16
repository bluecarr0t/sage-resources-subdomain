/**
 * Tests for GET /api/glamping-show-quiz/open-market-overview.
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  GMO_BOOTH_UNLOCK_COOKIE,
  createGmoBoothUnlockToken,
} from '@/lib/gmo-booth-unlock';
import { GET } from '@/app/api/glamping-show-quiz/open-market-overview/route';

function makeRequest(search: string): NextRequest {
  return new NextRequest(
    `https://resources.sageoutdooradvisory.com/api/glamping-show-quiz/open-market-overview${search}`,
    { method: 'GET' }
  );
}

describe('GET /api/glamping-show-quiz/open-market-overview', () => {
  const originalSecret = process.env.GMO_BOOTH_UNLOCK_SECRET;

  beforeEach(() => {
    process.env.GMO_BOOTH_UNLOCK_SECRET = 'booth-test-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.GMO_BOOTH_UNLOCK_SECRET;
    else process.env.GMO_BOOTH_UNLOCK_SECRET = originalSecret;
  });

  it('sets the booth cookie and redirects to the Market Overview with UTMs', async () => {
    const token = createGmoBoothUnlockToken();
    expect(token).toEqual(expect.any(String));
    const res = await GET(
      makeRequest(
        `?booth=${encodeURIComponent(token as string)}&utm_content=just_exploring`
      )
    );

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/glamping-market-overview');
    expect(location).toContain('utm_content=just_exploring');
    expect(location).toContain('utm_source=glamping_show');
    expect(location).toContain('utm_medium=booth_quiz');
    expect(location).toContain('utm_campaign=gsa_2026');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${GMO_BOOTH_UNLOCK_COOKIE}=`);
    expect(setCookie).toContain('Path=/glamping-market-overview');
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('still redirects when the token is missing so the emailed link remains usable', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/glamping-market-overview');
    expect(res.headers.get('set-cookie') ?? '').not.toContain(
      `${GMO_BOOTH_UNLOCK_COOKIE}=`
    );
  });
});
