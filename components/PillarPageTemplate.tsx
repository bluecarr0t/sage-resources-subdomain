'use client';

import type { GuideContent } from '@/lib/guides';
import { getAllLandingPageSlugs, getLandingPageSync } from '@/lib/landing-pages';
import {
  createLocaleLinks,
  localizeInternalHref,
  prefixInternalResourceHrefsInHtml,
} from '@/lib/locale-links';
import { getRelatedServiceAnchorText } from '@/lib/related-service-anchor-text';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  generateOrganizationSchema,
  generateGuideBreadcrumbSchema,
  generateFAQSchema,
  generateArticleSchema,
  generateSpeakableSchema,
  generateHowToSchema,
  extractHowToStepsFromGuide,
  generateItemListSchema,
} from '@/lib/schema';
import ContentAuthorByline from '@/components/ContentAuthorByline';
import RelatedGuides from './RelatedGuides';
import Footer from './Footer';
import FloatingHeader from './FloatingHeader';
import { EditorialCtaBand } from '@/components/editorial/EditorialCtaBand';
import { PodcastContextLinks } from '@/components/podcast/PodcastContextLinks';
import { getGuidePodcastPlacement } from '@/lib/guide-podcast-links';
import {
  EditorialPageShell,
  EDITORIAL_BODY_CLASS,
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_FILTER_ACTIVE_CLASS,
  EDITORIAL_FILTER_IDLE_CLASS,
  EDITORIAL_GUIDE_PROSE_CLASS,
  EDITORIAL_GUIDE_TITLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_LEAD_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_MAIN_WITH_HEADER_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

interface PillarPageTemplateProps {
  content: GuideContent;
  locale: string;
}

const CATEGORY_LABELS: Record<GuideContent['category'], string> = {
  feasibility: 'Feasibility',
  appraisal: 'Appraisal',
  industry: 'Industry',
};

export default function PillarPageTemplate({ content, locale }: PillarPageTemplateProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [showTOC, setShowTOC] = useState(false);
  const links = createLocaleLinks(locale);
  const pageCanonicalUrl = `https://resources.sageoutdooradvisory.com/${locale}/guides/${content.slug}`;

  const organizationSchema = generateOrganizationSchema(false);
  const breadcrumbSchema = generateGuideBreadcrumbSchema(content.slug, content.hero.headline);
  const articleSchema = generateArticleSchema(content);
  const faqSchema = content.faqs ? generateFAQSchema(content.faqs) : null;
  const speakableSchema =
    content.faqs && content.faqs.length > 0
      ? generateSpeakableSchema(['.speakable-answer', 'h1', 'h2'])
      : generateSpeakableSchema(['h1', 'h2', 'h3', '.guide-prose p']);
  const howToSteps = content.howToSteps || extractHowToStepsFromGuide(content);
  const howToSchema =
    howToSteps && howToSteps.length > 0
      ? generateHowToSchema(howToSteps, content.hero.headline, content.metaDescription)
      : null;
  const keyTakeawaysSchema =
    content.keyTakeaways && content.keyTakeaways.length > 0
      ? generateItemListSchema(
          content.keyTakeaways,
          `Key Takeaways: ${content.hero.headline}`,
          pageCanonicalUrl
        )
      : null;

  const tocSectionIds = useMemo(
    () => [
      ...content.sections.map((s) => s.id),
      ...(content.citations && content.citations.length > 0 ? ['references'] : []),
    ],
    [content.sections, content.citations]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      for (let i = tocSectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(tocSectionIds[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(tocSectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocSectionIds]);

  const relatedLandingLinks = useMemo(() => {
    if (!content.keywords?.length) return [];
    const slugs = getAllLandingPageSlugs();
    const seen = new Set<string>();
    const pages: Array<{ slug: string; headline: string }> = [];
    for (const keyword of content.keywords.slice(0, 6)) {
      for (const slug of slugs) {
        if (seen.has(slug)) continue;
        const page = getLandingPageSync(slug);
        if (!page?.keywords) continue;
        const match = page.keywords.some(
          (k) =>
            k.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(k.toLowerCase())
        );
        if (match) {
          seen.add(slug);
          pages.push({ slug: page.slug, headline: page.hero.headline });
          if (pages.length >= 6) return pages;
        }
      }
    }
    return pages;
  }, [content.keywords]);

  const tocLinkClass = (anchor: string, level?: number) => {
    const isActive = activeSection === anchor;
    const indent = level === 2 ? 'pl-0' : level === 3 ? 'pl-3' : '';
    return `block py-1.5 text-[11px] font-light leading-snug transition-colors ${indent} ${
      isActive
        ? 'font-medium text-sage-800'
        : 'text-neutral-600 hover:text-neutral-900'
    }`;
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
      />
      {howToSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      ) : null}
      {keyTakeawaysSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(keyTakeawaysSchema) }}
        />
      ) : null}

      <EditorialPageShell footer={null} solidPageBackground>
        <FloatingHeader locale={locale} showFullNav showSpacer={false} />

        <button
          type="button"
          onClick={() => setShowTOC(!showTOC)}
          className={`fixed right-4 top-24 z-40 lg:hidden ${showTOC ? EDITORIAL_FILTER_ACTIVE_CLASS : EDITORIAL_FILTER_IDLE_CLASS} px-4 py-2`}
          aria-expanded={showTOC}
        >
          {showTOC ? 'Hide' : 'Show'} contents
        </button>

        <a
          href="https://sageoutdooradvisory.com/contact-us/"
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed bottom-6 right-6 z-40 hidden sm:inline-block ${EDITORIAL_BUTTON_PRIMARY_CLASS}`}
        >
          Schedule free call
        </a>

        <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
          <nav
            className="mb-10 text-[11px] font-light uppercase tracking-widest text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href={links.guides} className="transition-colors hover:text-neutral-900">
              Guides
            </Link>
            <span className="mx-2 text-neutral-400" aria-hidden>
              /
            </span>
            <span className="text-neutral-700">{content.hero.headline}</span>
          </nav>

          <header className="mb-12 border-b border-sage-200/80 pb-10">
            <p className={EDITORIAL_SECTION_LABEL_CLASS}>{CATEGORY_LABELS[content.category]}</p>
            <h1 className={`mt-3 ${EDITORIAL_GUIDE_TITLE_CLASS}`}>{content.hero.headline}</h1>
            {content.hero.subheadline ? (
              <p className={EDITORIAL_LEAD_CLASS}>{content.hero.subheadline}</p>
            ) : null}
            {content.hero.ctaText && content.hero.ctaLink ? (
              <a
                href={content.hero.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${EDITORIAL_BUTTON_OUTLINE_CLASS} mt-8`}
              >
                {content.hero.ctaText}
              </a>
            ) : null}
            <ContentAuthorByline lastUpdated={content.lastModified} className="mt-6" />
          </header>

          {content.hero.backgroundImage ? (
            <div className="relative mb-12 aspect-[16/10] w-full overflow-hidden border border-sage-200/90 bg-neutral-100/40">
              <Image
                src={content.hero.backgroundImage}
                alt={`${content.hero.headline} — white geodesic glamping dome on a deck overlooking mountains`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                quality={90}
              />
            </div>
          ) : null}

          {(content.quickAnswer ?? content.metaDescription) ? (
            <section className="mb-12 border-l-4 border-sage-600 bg-white/50 px-6 py-6 sm:px-8">
              <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Quick answer</h2>
              <p className={`mt-4 max-w-3xl ${EDITORIAL_BODY_CLASS} speakable-answer`}>
                {content.quickAnswer ?? content.metaDescription}
              </p>
            </section>
          ) : null}

          {content.keyTakeaways && content.keyTakeaways.length > 0 ? (
            <section className="mb-12 border border-sage-200/90 bg-white/40 px-6 py-8 sm:px-8">
              <h2 className={EDITORIAL_H2_CLASS}>Key takeaways</h2>
              <ol className="mt-6 space-y-3 border-l border-sage-200 pl-4">
                {content.keyTakeaways.map((takeaway, index) => (
                  <li key={index} className={`${EDITORIAL_BODY_CLASS} text-neutral-800`}>
                    <span className="tabular-nums text-neutral-500">{index + 1}.</span> {takeaway}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {(content.lastModified || content.changeLog) && (
            <div className="mb-10 text-[11px] font-light text-neutral-500">
              {content.lastModified ? (
                <p>
                  Last updated:{' '}
                  {new Date(content.lastModified).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              ) : null}
              {content.changeLog && content.changeLog.length > 0 ? (
                <details className="mt-2">
                  <summary className={`cursor-pointer ${EDITORIAL_LINK_CLASS}`}>Change log</summary>
                  <ul className="mt-2 space-y-1 border-l border-sage-200 pl-4">
                    {content.changeLog.map((entry, i) => (
                      <li key={i} className={EDITORIAL_BODY_CLASS}>
                        <span className="font-medium text-neutral-700">
                          {new Date(entry.date).toLocaleDateString('en-US')}:
                        </span>{' '}
                        {entry.changes.join('; ')}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-12 lg:flex-row">
            <aside
              className={`lg:w-56 lg:shrink-0 lg:self-stretch ${showTOC ? 'block' : 'hidden lg:block'}`}
            >
              <div
                className={`sticky top-28 z-10 max-h-[calc(100vh-7rem)] overflow-y-auto ${EDITORIAL_CARD_CLASS}`}
              >
                <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Contents</h2>
                <nav className="mt-4 space-y-1" aria-label="Table of contents">
                  {content.tableOfContents.map((item, index) => (
                    <Link
                      key={index}
                      href={`#${item.anchor}`}
                      className={tocLinkClass(item.anchor, item.level)}
                    >
                      {item.title}
                    </Link>
                  ))}
                  {content.citations && content.citations.length > 0 ? (
                    <Link href="#references" className={tocLinkClass('references')}>
                      References
                    </Link>
                  ) : null}
                </nav>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <article className="guide-prose">
                {content.sections.map((section) => {
                  const podcastPlacement =
                    content.podcastPlacements?.find((p) => p.sectionId === section.id) ??
                    getGuidePodcastPlacement(content.slug, section.id);
                  return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="mb-14 scroll-mt-28 border-t border-sage-200/80 pt-10 first:border-t-0 first:pt-0"
                  >
                    <h2 className="font-[Georgia] text-2xl font-light tracking-tight text-neutral-900">
                      {section.title}
                    </h2>
                    <div className={`guide-prose mt-6 ${EDITORIAL_GUIDE_PROSE_CLASS}`}>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: prefixInternalResourceHrefsInHtml(section.content, locale),
                        }}
                      />
                      {podcastPlacement ? (
                        <PodcastContextLinks
                          links={podcastPlacement.links}
                          contentSlug={content.slug}
                          medium="guides-page"
                          variant="guide"
                          intro={podcastPlacement.intro}
                          linkJoiner={podcastPlacement.linkJoiner}
                          outro={podcastPlacement.outro}
                        />
                      ) : null}
                    </div>
                    {section.subsections ? (
                      <div className="mt-10 space-y-10">
                        {section.subsections.map((subsection) => (
                          <div key={subsection.id} id={subsection.id} className="scroll-mt-28">
                            <h3 className="text-lg font-medium text-neutral-900">
                              {subsection.title}
                            </h3>
                            <div
                              className={`mt-4 ${EDITORIAL_GUIDE_PROSE_CLASS}`}
                              dangerouslySetInnerHTML={{
                                __html: prefixInternalResourceHrefsInHtml(
                                  subsection.content,
                                  locale
                                ),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                  );
                })}
              </article>

              {content.citations && content.citations.length > 0 ? (
                <section id="references" className="mt-14 scroll-mt-28 border-t border-sage-200/80 pt-12">
                  <h2 className={EDITORIAL_H2_CLASS}>References</h2>
                  <ol className="mt-6 space-y-3 border-l border-sage-200 pl-4">
                    {content.citations.map((cite) => (
                      <li key={cite.id} id={`ref-${cite.id}`} className={EDITORIAL_BODY_CLASS}>
                        <a
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={EDITORIAL_LINK_CLASS}
                        >
                          {cite.title}
                        </a>
                        {cite.accessed ? (
                          <span className="text-neutral-500"> (accessed {cite.accessed})</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {content.clusterPages && content.clusterPages.length > 0 ? (
                <section className="mt-14 border-t border-sage-200/80 pt-12">
                  <h2 className={EDITORIAL_H2_CLASS}>Related guides &amp; resources</h2>
                  <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>
                    Explore these related guides to dive deeper into specific topics.
                  </p>
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {content.clusterPages.map((clusterPage, index) => (
                      <Link
                        key={index}
                        href={localizeInternalHref(clusterPage.url, locale)}
                        className={`${EDITORIAL_CARD_CLASS} group`}
                      >
                        <h3 className="text-sm font-bold text-neutral-900 group-hover:text-sage-800">
                          {clusterPage.title}
                        </h3>
                        <p className={`mt-2 line-clamp-3 ${EDITORIAL_BODY_CLASS}`}>
                          {clusterPage.description}
                        </p>
                        <span
                          className={`mt-4 inline-block text-[11px] uppercase tracking-wider ${EDITORIAL_LINK_CLASS}`}
                        >
                          Read guide →
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {content.relatedServices && content.relatedServices.services.length > 0 ? (
                <section className="mt-14 border-t border-sage-200/80 pt-12">
                  <h2 className={EDITORIAL_H2_CLASS}>{content.relatedServices.title}</h2>
                  <ul className="mt-8 space-y-6">
                    {content.relatedServices.services.map((service, index) => (
                      <li
                        key={index}
                        className={`${EDITORIAL_CARD_CLASS} p-5`}
                      >
                        <h3 className="text-sm font-bold text-neutral-900">
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={EDITORIAL_LINK_CLASS}
                          >
                            {service.name}
                          </a>
                        </h3>
                        <p className={`mt-2 ${EDITORIAL_BODY_CLASS}`}>{service.description}</p>
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-4 inline-block text-[11px] uppercase tracking-wider ${EDITORIAL_LINK_CLASS}`}
                        >
                          {getRelatedServiceAnchorText(service.name)} →
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>

          {content.faqs && content.faqs.length > 0 ? (
            <section className="mt-16 border-t border-sage-200/80 pt-14">
              <h2 className={EDITORIAL_H2_CLASS}>Frequently asked questions</h2>
              <dl className="mt-8 space-y-8">
                {content.faqs.map((faq, index) => (
                  <div key={index}>
                    <dt className="text-sm font-bold text-neutral-900">{faq.question}</dt>
                    <dd
                      className={`mt-2 border-l border-sage-200 pl-4 ${EDITORIAL_BODY_CLASS} speakable-answer`}
                      dangerouslySetInnerHTML={{
                        __html: prefixInternalResourceHrefsInHtml(faq.answer, locale),
                      }}
                    />
                  </div>
                ))}
              </dl>
              <EditorialCtaBand
                title="Have more questions?"
                description="Let's discuss your outdoor hospitality project."
                buttonLabel="Get In Touch"
                buttonHref="https://sageoutdooradvisory.com/contact-us/"
                external
              />
            </section>
          ) : null}

          <RelatedGuides currentGuide={content} locale={locale} maxGuides={6} />

          {relatedLandingLinks.length > 0 ? (
            <section className="mt-14 border-t border-sage-200/80 pt-14">
              <h2 className={EDITORIAL_H2_CLASS}>Related resources</h2>
              <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>
                Explore related landing pages and resources for your outdoor hospitality project.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {relatedLandingLinks.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={links.landing(page.slug)}
                      className={EDITORIAL_FILTER_IDLE_CLASS + ' inline-block px-4 py-2 normal-case tracking-normal'}
                    >
                      {page.headline}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.cta ? (
            <EditorialCtaBand
              title={content.cta.title}
              description={content.cta.description}
              buttonLabel={content.cta.buttonText}
              buttonHref={content.cta.buttonLink}
              external={content.cta.buttonLink.startsWith('http')}
            />
          ) : null}
        </main>

        <Footer locale={locale} />
      </EditorialPageShell>
    </>
  );
}
