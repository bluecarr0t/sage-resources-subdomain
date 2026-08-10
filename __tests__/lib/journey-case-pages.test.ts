import {
  buildJourneyMapHref,
  getAllJourneyCaseSlugs,
  getJourneyCasePage,
  JOURNEY_CASE_PAGES,
} from '@/lib/journey-case-pages';
import { localizeInternalHref } from '@/lib/locale-links';

describe('journey case pages (comps map → financed study)', () => {
  it('includes the core from-comps-map-to-financed-study narrative', () => {
    const page = getJourneyCasePage('from-comps-map-to-financed-study');
    expect(page).not.toBeNull();
    expect(page!.steps.length).toBeGreaterThanOrEqual(3);
    expect(page!.compositeNote.toLowerCase()).toMatch(/composite|anonym/);
    expect(page!.outcome.toLowerCase()).not.toMatch(/\$\d+m financing|secured \$\d/);
  });

  it('never names analytics prospects in public copy', () => {
    const blob = JOURNEY_CASE_PAGES.map(
      (p) => `${p.title} ${p.intro} ${p.compositeNote} ${p.outcome}`
    ).join(' ');
    expect(blob).not.toMatch(/Nate|Gavin|Jeff|Whitney|Yeomans|Stickelmeyer|Sladick/i);
  });

  it('lists stable slugs for sitemap generation', () => {
    const slugs = getAllJourneyCaseSlugs();
    expect(slugs).toContain('from-comps-map-to-financed-study');
    expect(slugs).toContain('colorado-comps-to-feasibility');
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('builds map deep-links for market-scoped journeys', () => {
    const colorado = getJourneyCasePage('colorado-comps-to-feasibility');
    expect(colorado).not.toBeNull();
    expect(buildJourneyMapHref('en', colorado!)).toBe('/en/map?state=Colorado');
  });
});

describe('localizeInternalHref query support', () => {
  it('prefixes locale while preserving map filter query strings', () => {
    expect(localizeInternalHref('/map?state=Colorado', 'en')).toBe(
      '/en/map?state=Colorado'
    );
    expect(localizeInternalHref('/landing/glamping-appraisal', 'de')).toBe(
      '/de/landing/glamping-appraisal'
    );
  });
});
