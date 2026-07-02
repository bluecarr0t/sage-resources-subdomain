import { enforcePublicMapApiRateLimits } from '@/lib/public-map-api-rate-limit';
import { checkRateLimitAsync } from '@/lib/rate-limit';

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: jest.fn(),
}));

const checkRateLimitAsyncMock = checkRateLimitAsync as jest.MockedFunction<
  typeof checkRateLimitAsync
>;

const ORIGINAL_ENV = process.env;

function requestWith(headers: Record<string, string> = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    headers: {
      get(name: string) {
        return normalized.get(name.toLowerCase()) ?? null;
      },
    },
  };
}

describe('enforcePublicMapApiRateLimits', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PUBLIC_MAP_API_BYPASS_SECRET;
    checkRateLimitAsyncMock.mockReset();
    checkRateLimitAsyncMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('skips limits when bypass secret is present', async () => {
    process.env.PUBLIC_MAP_API_BYPASS_SECRET = 'secret';
    const result = await enforcePublicMapApiRateLimits(
      requestWith({
        'x-public-map-api-key': 'secret',
        'x-forwarded-for': '1.2.3.4',
      }),
      'properties'
    );
    expect(result.allowed).toBe(true);
    expect(checkRateLimitAsyncMock).not.toHaveBeenCalled();
  });

  it('returns 429 scope minute when combined minute bucket is exceeded', async () => {
    checkRateLimitAsyncMock.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 45_000,
    });

    const result = await enforcePublicMapApiRateLimits(
      requestWith({ 'x-forwarded-for': '9.9.9.9' }),
      'properties'
    );

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.scope).toBe('minute');
      expect(result.retryAfterSec).toBeGreaterThan(0);
    }
    expect(checkRateLimitAsyncMock).toHaveBeenCalledWith(
      'public_map_api:min:9.9.9.9',
      60,
      60_000
    );
  });

  it('applies an extra google-places minute bucket', async () => {
    await enforcePublicMapApiRateLimits(
      requestWith({ 'x-forwarded-for': '5.5.5.5' }),
      'google-places'
    );

    expect(checkRateLimitAsyncMock).toHaveBeenCalledWith(
      'public_map_api:google_places:min:5.5.5.5',
      30,
      60_000
    );
  });

  it('applies an extra google-places-photo minute bucket', async () => {
    await enforcePublicMapApiRateLimits(
      requestWith({ 'x-forwarded-for': '5.5.5.5' }),
      'google-places-photo'
    );

    expect(checkRateLimitAsyncMock).toHaveBeenCalledWith(
      'public_map_api:google_places_photo:min:5.5.5.5',
      40,
      60_000
    );
  });
});
