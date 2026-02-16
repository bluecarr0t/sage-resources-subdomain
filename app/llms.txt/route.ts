import { NextResponse } from 'next/server';
import { getAllGuideSlugs, getGuideSync } from '@/lib/guides';
import { getAllLandingPageSlugs, getLandingPageSync } from '@/lib/landing-pages';
import { getAllGlossaryTerms } from '@/lib/glossary/index';

const baseUrl = 'https://resources.sageoutdooradvisory.com';
const enBase = `${baseUrl}/en`;

export const dynamic = 'force-dynamic';

export async function GET() {
  const guideSlugs = getAllGuideSlugs();
  const landingSlugs = getAllLandingPageSlugs();
  const glossaryTerms = getAllGlossaryTerms();

  // Pillar guides (highest priority - comprehensive guides)
  const pillarGuides = guideSlugs.filter((s) =>
    ['feasibility-studies-complete-guide', 'property-appraisals-complete-guide', 'glamping-industry-complete-guide'].includes(s)
  );
  const otherGuides = guideSlugs.filter((s) => !pillarGuides.includes(s));

  // Core landing pages (service overviews)
  const coreLanding = landingSlugs.filter((s) =>
    [
      'glamping-feasibility-study',
      'rv-resort-feasibility-study',
      'campground-feasibility-study',
      'glamping-appraisal',
      'rv-resort-appraisal',
      'campground-appraisal',
      'how-to-finance-glamping-resort',
      'feasibility-study-faq',
      'appraisal-faq',
    ].includes(s)
  );
  const locationLanding = landingSlugs.filter((s) => !coreLanding.includes(s));

  const lines: string[] = [
    '# Sage Outdoor Advisory Resources',
    '',
    '> Comprehensive resources for the outdoor hospitality industry: glamping feasibility studies, RV resort appraisals, campground market analysis, and expert guides. 1,266+ glamping properties database with interactive map. Industry expertise from 350+ completed projects.',
    '',
    'Sage Outdoor Advisory provides feasibility studies, appraisals, and market analysis for glamping resorts, RV parks, and campgrounds across North America and Europe.',
    '',
    '## Guides',
    ...pillarGuides.map((slug) => {
      const guide = getGuideSync(slug);
      const title = guide?.title?.split('|')[0]?.trim() || slug.replace(/-/g, ' ');
      return `- [${title}](${enBase}/guides/${slug}): ${guide?.metaDescription?.slice(0, 80) || 'Expert guide'}...`;
    }),
    ...otherGuides.slice(0, 12).map((slug) => {
      const guide = getGuideSync(slug);
      const title = guide?.title?.split('|')[0]?.trim() || slug.replace(/-/g, ' ');
      return `- [${title}](${enBase}/guides/${slug}): ${guide?.metaDescription?.slice(0, 60) || ''}...`;
    }),
    '',
    '## Map and Properties',
    `- [Interactive Glamping Map](${enBase}/map): Explore 1,266+ glamping properties across US, Canada, and Europe with filters by location, unit type, and price`,
    `- [Sitemap](${baseUrl}/sitemap.xml): Complete sitemap of all pages`,
    '',
    '## Services',
    ...coreLanding.slice(0, 9).map((slug) => {
      const page = getLandingPageSync(slug);
      const title = page?.hero?.headline || slug.replace(/-/g, ' ');
      return `- [${title}](${enBase}/landing/${slug}): ${page?.metaDescription?.slice(0, 60) || ''}...`;
    }),
    '',
    '## Glossary',
    `- [Glossary Index](${enBase}/glossary): Industry term definitions for feasibility studies, appraisals, glamping, RV resorts, and campgrounds`,
    ...glossaryTerms
      .slice(0, 15)
      .map((t) => `- [${t.term}](${enBase}/glossary/${t.slug}): ${t.definition.slice(0, 50)}...`),
    '',
    '## Optional',
    `- [Partners](${enBase}/partners): Industry partnerships`,
    `- [Main Site](https://sageoutdooradvisory.com): Sage Outdoor Advisory consulting services`,
    ...otherGuides.slice(12).map((slug) => {
      const guide = getGuideSync(slug);
      const title = guide?.title?.split('|')[0]?.trim() || slug.replace(/-/g, ' ');
      return `- [${title}](${enBase}/guides/${slug})`;
    }),
    ...locationLanding.slice(0, 20).map((slug) => {
      const page = getLandingPageSync(slug);
      const title = page?.hero?.headline || slug.replace(/-/g, ' ');
      return `- [${title}](${enBase}/landing/${slug})`;
    }),
    ...glossaryTerms.slice(15, 35).map((t) => `- [${t.term}](${enBase}/glossary/${t.slug})`),
  ];

  const content = lines.join('\n');

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
