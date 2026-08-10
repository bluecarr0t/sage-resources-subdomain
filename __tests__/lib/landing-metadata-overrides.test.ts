import {
  COMMERCIAL_LANDING_META_SLUGS,
  LANDING_DESCRIPTION_SOFT_MAX,
  LANDING_DESCRIPTION_SOFT_MIN,
  LANDING_TITLE_SOFT_MAX,
  landingMetadataOverridesEn,
} from '@/lib/landing-metadata-overrides';
import { getLandingSitemapPriority } from '@/lib/sitemap-priority';
import { landingPages } from '@/lib/landing-pages';

describe('commercial landing metadata (Bing + Google pass)', () => {
  it('covers every core commercial landing slug', () => {
    for (const slug of COMMERCIAL_LANDING_META_SLUGS) {
      expect(landingMetadataOverridesEn[slug]).toBeDefined();
      expect(landingPages[slug]).toBeDefined();
      expect(getLandingSitemapPriority(slug)).toBe('0.9');
    }
  });

  it('keeps titles and descriptions in soft SERP length bands', () => {
    for (const slug of COMMERCIAL_LANDING_META_SLUGS) {
      const { title, description } = landingMetadataOverridesEn[slug];
      expect(title.length).toBeGreaterThan(30);
      expect(title.length).toBeLessThanOrEqual(LANDING_TITLE_SOFT_MAX);
      expect(description.length).toBeGreaterThanOrEqual(LANDING_DESCRIPTION_SOFT_MIN);
      expect(description.length).toBeLessThanOrEqual(LANDING_DESCRIPTION_SOFT_MAX);
    }
  });

  it('uses bank/lender or USPAP language and never the USOB misspelling', () => {
    for (const slug of COMMERCIAL_LANDING_META_SLUGS) {
      const { title, description } = landingMetadataOverridesEn[slug];
      const blob = `${title} ${description}`;
      expect(blob).toMatch(/bank|lender|USPAP|financ|underwrit/i);
      expect(blob.includes('USOB')).toBe(false);
      if (slug.includes('appraisal')) {
        expect(blob.includes('USPAP')).toBe(true);
      }
    }
  });

  it('aligns English page title/meta with overrides and lender-ready H1s', () => {
    for (const slug of COMMERCIAL_LANDING_META_SLUGS) {
      const override = landingMetadataOverridesEn[slug];
      const page = landingPages[slug];
      expect(page.title).toBe(override.title);
      expect(page.metaDescription).toBe(override.description);
      expect(page.hero.headline.length).toBeGreaterThan(10);

      const h1Blob = `${page.hero.headline} ${page.hero.subheadline}`;
      expect(h1Blob).toMatch(/bank|lender|USPAP|financ|FAQ|What Banks Require/i);

      const visible = `${page.title} ${page.metaDescription} ${page.hero.headline}`;
      expect(visible.includes('USOB')).toBe(false);
    }
  });
});
