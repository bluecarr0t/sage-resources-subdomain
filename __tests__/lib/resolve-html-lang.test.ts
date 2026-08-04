import { resolveHtmlLang } from '@/lib/resolve-html-lang';

describe('resolveHtmlLang', () => {
  it('prefers the URL locale header over the cookie', () => {
    expect(resolveHtmlLang('fr', 'en')).toBe('fr');
    expect(resolveHtmlLang('de', 'es')).toBe('de');
  });

  it('falls back to cookie when header is missing or invalid', () => {
    expect(resolveHtmlLang(undefined, 'es')).toBe('es');
    expect(resolveHtmlLang('xx', 'de')).toBe('de');
    expect(resolveHtmlLang(null, 'fr')).toBe('fr');
  });

  it('defaults to en when neither header nor cookie is usable', () => {
    expect(resolveHtmlLang(undefined, undefined)).toBe('en');
    expect(resolveHtmlLang('nope', 'also-nope')).toBe('en');
  });
});
