import {
  clientIpFromHeaders,
  isGa4BlockedClientIp,
  normalizeClientIp,
  parseGa4BlockedIps,
} from '@/lib/ga4-blocked-ips';

describe('normalizeClientIp', () => {
  it('takes the first x-forwarded-for hop', () => {
    expect(normalizeClientIp('47.151.154.219, 10.0.0.1')).toBe('47.151.154.219');
  });

  it('strips IPv4-mapped IPv6 prefix', () => {
    expect(normalizeClientIp('::ffff:47.151.154.219')).toBe('47.151.154.219');
  });
});

describe('parseGa4BlockedIps', () => {
  it('always includes Nick\'s office IP', () => {
    expect(parseGa4BlockedIps(undefined).has('47.151.154.219')).toBe(true);
  });

  it('merges extra env IPs', () => {
    expect(parseGa4BlockedIps('8.8.8.8, 1.1.1.1').has('8.8.8.8')).toBe(true);
  });
});

describe('isGa4BlockedClientIp', () => {
  it('matches the Sage office IP', () => {
    expect(isGa4BlockedClientIp('47.151.154.219')).toBe(true);
    expect(isGa4BlockedClientIp('8.8.8.8')).toBe(false);
  });
});

describe('clientIpFromHeaders', () => {
  it('prefers x-real-ip', () => {
    const headers = {
      get(name: string) {
        if (name === 'x-real-ip') return '47.151.154.219';
        if (name === 'x-forwarded-for') return '1.1.1.1';
        return null;
      },
    };
    expect(clientIpFromHeaders(headers)).toBe('47.151.154.219');
  });
});
