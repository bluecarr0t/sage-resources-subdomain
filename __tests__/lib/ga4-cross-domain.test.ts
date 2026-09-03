import {
  GA4_COOKIE_DOMAIN,
  GA4_LINKED_DOMAINS,
  buildGa4ConfigOptions,
  serializeGa4ConfigForInlineScript,
  shouldUseParentCookieDomain,
} from '@/lib/ga4-cross-domain';

describe('shouldUseParentCookieDomain', () => {
  it('allows apex and resources subdomain', () => {
    expect(shouldUseParentCookieDomain('sageoutdooradvisory.com')).toBe(true);
    expect(shouldUseParentCookieDomain('www.sageoutdooradvisory.com')).toBe(true);
    expect(shouldUseParentCookieDomain('resources.sageoutdooradvisory.com')).toBe(
      true
    );
  });

  it('rejects localhost and preview hosts', () => {
    expect(shouldUseParentCookieDomain('localhost')).toBe(false);
    expect(shouldUseParentCookieDomain('127.0.0.1')).toBe(false);
    expect(shouldUseParentCookieDomain('sage-resources.vercel.app')).toBe(false);
  });
});

describe('buildGa4ConfigOptions', () => {
  it('sets parent cookie domain and linker for production hosts', () => {
    const config = buildGa4ConfigOptions({
      pagePath: '/en/guides/foo',
      hostname: 'resources.sageoutdooradvisory.com',
    });

    expect(config.cookie_domain).toBe(GA4_COOKIE_DOMAIN);
    expect(config.linker).toEqual({
      domains: [...GA4_LINKED_DOMAINS],
      accept_incoming: true,
      decorate_forms: true,
    });
    expect(config.page_path).toBe('/en/guides/foo');
    expect(config.send_page_view).toBe(false);
    expect(config.cookie_flags).toBe('SameSite=None;Secure');
  });

  it('omits parent cookie domain on localhost', () => {
    const config = buildGa4ConfigOptions({
      hostname: 'localhost',
      debugMode: true,
    });
    expect(config.cookie_domain).toBeUndefined();
    expect(config.debug_mode).toBe(true);
    expect(config.linker?.accept_incoming).toBe(true);
  });
});

describe('serializeGa4ConfigForInlineScript', () => {
  it('produces JSON usable in the bootstrap snippet', () => {
    const json = serializeGa4ConfigForInlineScript(
      buildGa4ConfigOptions({
        hostname: 'resources.sageoutdooradvisory.com',
        pagePath: '/',
      })
    );
    const parsed = JSON.parse(json) as { cookie_domain?: string; linker?: unknown };
    expect(parsed.cookie_domain).toBe(GA4_COOKIE_DOMAIN);
    expect(parsed.linker).toBeTruthy();
  });
});
