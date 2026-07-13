import {
  brandSlugFromPropertyUrl,
  websiteHostFromUrl,
} from '@/lib/brand-website-host';

describe('websiteHostFromUrl', () => {
  it('strips www and returns lowercase host', () => {
    expect(websiteHostFromUrl('https://www.autocamp.com/zion')).toBe('autocamp.com');
  });

  it('adds https when missing', () => {
    expect(websiteHostFromUrl('koa.com/campgrounds')).toBe('koa.com');
  });

  it('returns null for invalid input', () => {
    expect(websiteHostFromUrl('')).toBeNull();
    expect(websiteHostFromUrl(null)).toBeNull();
  });
});

describe('brandSlugFromPropertyUrl', () => {
  it('maps known operator domains', () => {
    expect(brandSlugFromPropertyUrl('https://westgateresorts.com/hotels/river-ranch')).toBe(
      'westgate-river-ranch'
    );
    expect(brandSlugFromPropertyUrl('https://www.huttopia.com/en/usa/')).toBe('huttopia');
  });

  it('returns null for unknown domains', () => {
    expect(brandSlugFromPropertyUrl('https://example-unknown.com')).toBeNull();
  });
});
