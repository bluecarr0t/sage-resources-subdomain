/**
 * @jest-environment node
 */
import {
  extractProductImageUrlsFromHtml,
  isHttpsUrlSafeForServerFetch,
} from '@/lib/site-builder/fetch-catalog-product-image';

describe('extractProductImageUrlsFromHtml', () => {
  it('reads og:image and resolves relative URLs', () => {
    const html = `
      <head>
        <meta property="og:image" content="/assets/hero.jpg" />
      </head>
    `;
    const urls = extractProductImageUrlsFromHtml(html, 'https://example.com/products/dome');
    expect(urls).toEqual(['https://example.com/assets/hero.jpg']);
  });

  it('reads og:image when content attribute comes first', () => {
    const html = `<meta content="https://cdn.example/img.png" property="og:image" />`;
    expect(extractProductImageUrlsFromHtml(html, 'https://example.com/')).toContain(
      'https://cdn.example/img.png'
    );
  });

  it('deduplicates identical URLs', () => {
    const html = `
      <meta property="og:image" content="https://x.com/a.webp" />
      <meta property="og:image:url" content="https://x.com/a.webp" />
    `;
    expect(extractProductImageUrlsFromHtml(html, 'https://x.com/')).toEqual(['https://x.com/a.webp']);
  });
});

describe('isHttpsUrlSafeForServerFetch', () => {
  it('allows normal https hosts', () => {
    expect(isHttpsUrlSafeForServerFetch('https://waldeninsights.com/unit')).toBe(true);
  });

  it('rejects non-https and localhost', () => {
    expect(isHttpsUrlSafeForServerFetch('http://example.com/')).toBe(false);
    expect(isHttpsUrlSafeForServerFetch('https://localhost/foo')).toBe(false);
    expect(isHttpsUrlSafeForServerFetch('https://127.0.0.1/')).toBe(false);
    expect(isHttpsUrlSafeForServerFetch('https://192.168.1.1/')).toBe(false);
    expect(isHttpsUrlSafeForServerFetch('https://10.0.0.1/')).toBe(false);
  });
});
