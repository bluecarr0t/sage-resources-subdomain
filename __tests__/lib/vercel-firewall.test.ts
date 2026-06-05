import {
  blockIpOnVercelFirewall,
  isValidIpOrCidr,
  isVercelFirewallConfigured,
} from '@/lib/vercel-firewall';

const ORIGINAL_ENV = process.env;

describe('vercel-firewall', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.VERCEL_FIREWALL_API_TOKEN;
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TEAM_ID;
    (global.fetch as unknown) = jest.fn();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  describe('isValidIpOrCidr', () => {
    it('accepts IPv4 and CIDR', () => {
      expect(isValidIpOrCidr('212.83.77.168')).toBe(true);
      expect(isValidIpOrCidr('12.34.56.0/24')).toBe(true);
    });

    it('accepts loose IPv6', () => {
      expect(isValidIpOrCidr('2001:db8::1')).toBe(true);
    });

    it('rejects garbage and out-of-range octets', () => {
      expect(isValidIpOrCidr('999.1.1.1')).toBe(false);
      expect(isValidIpOrCidr('not-an-ip')).toBe(false);
      expect(isValidIpOrCidr('')).toBe(false);
      expect(isValidIpOrCidr('10.0.0.1/40')).toBe(false);
    });
  });

  describe('isVercelFirewallConfigured', () => {
    it('is false without token/project', () => {
      expect(isVercelFirewallConfigured()).toBe(false);
    });

    it('is true with token + project', () => {
      process.env.VERCEL_TOKEN = 'tok';
      process.env.VERCEL_PROJECT_ID = 'prj_123';
      expect(isVercelFirewallConfigured()).toBe(true);
    });
  });

  describe('blockIpOnVercelFirewall', () => {
    it('skips when not configured', async () => {
      const result = await blockIpOnVercelFirewall('1.2.3.4', 'test');
      expect(result).toEqual({ ok: false, skipped: true, reason: expect.any(String) });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('skips invalid IPs without calling the API', async () => {
      process.env.VERCEL_TOKEN = 'tok';
      process.env.VERCEL_PROJECT_ID = 'prj_123';
      const result = await blockIpOnVercelFirewall('not-an-ip', 'test');
      expect(result.ok).toBe(false);
      if (!result.ok && result.skipped) {
        expect(result.reason).toContain('Invalid IP');
      }
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('PATCHes an ip.insert deny rule with the correct payload', async () => {
      process.env.VERCEL_FIREWALL_API_TOKEN = 'tok';
      process.env.VERCEL_PROJECT_ID = 'prj_123';
      process.env.VERCEL_TEAM_ID = 'team_abc';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await blockIpOnVercelFirewall('212.83.77.168', 'abuse');
      expect(result).toEqual({ ok: true, status: 200 });

      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('https://api.vercel.com/v1/security/firewall/config');
      expect(url).toContain('projectId=prj_123');
      expect(url).toContain('teamId=team_abc');
      expect(init.method).toBe('PATCH');
      expect(init.headers.Authorization).toBe('Bearer tok');

      const payload = JSON.parse(init.body);
      expect(payload.action).toBe('ip.insert');
      expect(payload.value).toMatchObject({
        action: 'deny',
        hostname: '*',
        ip: '212.83.77.168',
      });
    });

    it('returns a structured error on non-OK response', async () => {
      process.env.VERCEL_TOKEN = 'tok';
      process.env.VERCEL_PROJECT_ID = 'prj_123';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'no access',
      });

      const result = await blockIpOnVercelFirewall('1.2.3.4', 'abuse');
      expect(result).toEqual({
        ok: false,
        skipped: false,
        status: 403,
        error: 'no access',
      });
    });
  });
});
