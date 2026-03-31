/**
 * @jest-environment node
 */

import { isUrlSafeForServerScrape } from '@/lib/comps-v2/safe-scrape-url';

describe('isUrlSafeForServerScrape', () => {
  it('allows normal https URLs', () => {
    expect(isUrlSafeForServerScrape('https://example.com/path')).toBe(true);
  });

  it('blocks localhost and file', () => {
    expect(isUrlSafeForServerScrape('http://localhost:8080/')).toBe(false);
    expect(isUrlSafeForServerScrape('file:///etc/passwd')).toBe(false);
  });

  it('blocks private IPv4 hostnames', () => {
    expect(isUrlSafeForServerScrape('http://192.168.1.1/')).toBe(false);
    expect(isUrlSafeForServerScrape('http://10.0.0.1/')).toBe(false);
  });

  it('blocks IPv6 loopback, link-local, ULA, and IPv4-mapped private', () => {
    expect(isUrlSafeForServerScrape('http://[::1]:8080/')).toBe(false);
    expect(isUrlSafeForServerScrape('http://[fe80::1]/')).toBe(false);
    expect(isUrlSafeForServerScrape('http://[fc00::1]/')).toBe(false);
    expect(isUrlSafeForServerScrape('http://[::ffff:192.168.0.1]/')).toBe(false);
  });

  it('allows public IPv6 literals', () => {
    expect(isUrlSafeForServerScrape('http://[2001:db8::1]/')).toBe(true);
  });
});
