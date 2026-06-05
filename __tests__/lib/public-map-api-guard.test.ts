import {
  getAllowedPublicMapApiOrigins,
  isAllowedPublicMapApiCaller,
  isBlockedScraperRequest,
} from '@/lib/public-map-api-guard';

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

describe('public-map-api-guard', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PUBLIC_MAP_API_GUARD_DISABLED;
    delete process.env.PUBLIC_MAP_API_BYPASS_SECRET;
    delete process.env.PUBLIC_MAP_API_BLOCK_UA_SUBSTRINGS;
    delete process.env.PUBLIC_MAP_API_BLOCK_IPS;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('blocks OutReserveBot user agent', () => {
    const req = requestWith({
      'user-agent': 'Mozilla/5.0 (compatible; OutReserveBot/1.0)',
      origin: 'https://resources.sageoutdooradvisory.com',
    });
    expect(isBlockedScraperRequest(req)).toBe(true);
    expect(isAllowedPublicMapApiCaller(req)).toBe(false);
  });

  it('blocks PetalBot user agent', () => {
    const req = requestWith({
      'user-agent':
        'Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
      origin: 'https://resources.sageoutdooradvisory.com',
    });
    expect(isBlockedScraperRequest(req)).toBe(true);
    expect(isAllowedPublicMapApiCaller(req)).toBe(false);
  });

  it('blocks known scraper IP', () => {
    const req = requestWith({
      'x-forwarded-for': '212.83.77.168, 1.2.3.4',
      origin: 'https://resources.sageoutdooradvisory.com',
    });
    expect(isBlockedScraperRequest(req)).toBe(true);
    expect(isAllowedPublicMapApiCaller(req)).toBe(false);
  });

  it('allows same-site origin for map fetches', () => {
    const req = requestWith({
      origin: 'https://resources.sageoutdooradvisory.com',
      'user-agent': 'Mozilla/5.0',
    });
    expect(isAllowedPublicMapApiCaller(req)).toBe(true);
  });

  it('allows same-site referer when origin is omitted', () => {
    const req = requestWith({
      referer: 'https://resources.sageoutdooradvisory.com/en/map',
      'user-agent': 'Mozilla/5.0',
    });
    expect(isAllowedPublicMapApiCaller(req)).toBe(true);
  });

  it('denies direct API access without origin or referer', () => {
    const req = requestWith({
      'user-agent': 'curl/8.0',
    });
    expect(isAllowedPublicMapApiCaller(req)).toBe(false);
  });

  it('allows bypass secret for scripts', () => {
    process.env.PUBLIC_MAP_API_BYPASS_SECRET = 'test-bypass';
    const req = requestWith({
      'x-public-map-api-key': 'test-bypass',
      'user-agent': 'curl/8.0',
    });
    expect(isAllowedPublicMapApiCaller(req)).toBe(true);
  });

  it('includes SITE_URL in allowed origins', () => {
    process.env.SITE_URL = 'https://preview.example.com';
    expect(getAllowedPublicMapApiOrigins()).toContain('https://preview.example.com');
  });
});
