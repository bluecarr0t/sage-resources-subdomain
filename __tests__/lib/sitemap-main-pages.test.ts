import {
  MAIN_SITEMAP_PAGE_PATHS,
  NON_LOCALE_PUBLIC_SITEMAP_PATHS,
  getLocalesForMainSitemapPage,
  getNonLocalePublicSitemapEntries,
} from '@/lib/sitemap-main-pages';

describe('getLocalesForMainSitemapPage', () => {
  it('lists only en for guides and glossary hubs (non-en redirect to en)', () => {
    expect(getLocalesForMainSitemapPage('/guides')).toEqual(['en']);
    expect(getLocalesForMainSitemapPage('/glossary')).toEqual(['en']);
  });

  it('lists all locales for translated hub pages', () => {
    expect(getLocalesForMainSitemapPage('')).toEqual(['en', 'es', 'fr', 'de']);
    expect(getLocalesForMainSitemapPage('/map')).toEqual(['en', 'es', 'fr', 'de']);
    expect(getLocalesForMainSitemapPage('/partners')).toEqual(['en', 'es', 'fr', 'de']);
    expect(getLocalesForMainSitemapPage('/sitemap')).toEqual(['en', 'es', 'fr', 'de']);
  });

  it('covers every main sitemap hub path', () => {
    for (const path of MAIN_SITEMAP_PAGE_PATHS) {
      expect(getLocalesForMainSitemapPage(path).length).toBeGreaterThan(0);
    }
  });
});

describe('non-locale public sitemap paths', () => {
  it('includes taxonomy and legal pages', () => {
    expect([...NON_LOCALE_PUBLIC_SITEMAP_PATHS]).toEqual([
      '/glamping-unit-type-classification',
      '/privacy-policy',
      '/terms-of-service',
    ]);
  });

  it('returns sitemap entries for every non-locale public path', () => {
    const entries = getNonLocalePublicSitemapEntries();
    expect(entries.map((e) => e.path)).toEqual([...NON_LOCALE_PUBLIC_SITEMAP_PATHS]);
    for (const entry of entries) {
      expect(Number(entry.priority)).toBeGreaterThan(0);
      expect(Number(entry.priority)).toBeLessThanOrEqual(1);
      expect(['weekly', 'monthly', 'yearly']).toContain(entry.changefreq);
    }
  });

  it('ranks the unit-type taxonomy above legal pages', () => {
    const entries = getNonLocalePublicSitemapEntries();
    const taxonomy = entries.find((e) => e.path === '/glamping-unit-type-classification');
    const privacy = entries.find((e) => e.path === '/privacy-policy');
    expect(taxonomy).toBeDefined();
    expect(privacy).toBeDefined();
    expect(Number(taxonomy!.priority)).toBeGreaterThan(Number(privacy!.priority));
  });
});
