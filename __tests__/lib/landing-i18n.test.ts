import {
  getLandingLocalesForSlug,
  landingSlugHasLocaleTranslation,
} from '@/lib/landing-i18n';

describe('landingSlugHasLocaleTranslation', () => {
  it('always true for English', () => {
    expect(landingSlugHasLocaleTranslation('glamping-feasibility-study-texas', 'en')).toBe(
      true
    );
  });

  it('true for core translated slugs in Spanish', () => {
    expect(landingSlugHasLocaleTranslation('glamping-feasibility-study', 'es')).toBe(true);
    expect(landingSlugHasLocaleTranslation('feasibility-study-faq', 'es')).toBe(true);
  });

  it('false for state-only slugs in Spanish', () => {
    expect(
      landingSlugHasLocaleTranslation('glamping-feasibility-study-texas', 'es')
    ).toBe(false);
  });
});

describe('getLandingLocalesForSlug', () => {
  it('includes en only for untranslated state pages', () => {
    const locales = getLandingLocalesForSlug('glamping-feasibility-study-texas');
    expect(locales).toEqual(['en']);
  });

  it('includes all locales for fully translated core page', () => {
    const locales = getLandingLocalesForSlug('glamping-feasibility-study');
    expect(locales).toContain('en');
    expect(locales).toContain('es');
    expect(locales).toContain('fr');
    expect(locales).toContain('de');
  });
});
