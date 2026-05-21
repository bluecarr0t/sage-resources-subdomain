import {
  MAIN_SITEMAP_PAGE_PATHS,
  getLocalesForMainSitemapPage,
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
