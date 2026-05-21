import { GlossaryTerm } from '@/lib/glossary/index';
import { getGlossaryCategoryMessageKey } from '@/lib/glossary/category-i18n';
import { normalizeGlossaryBodyHtml } from '@/lib/glossary/format-html';
import Link from 'next/link';
import Image from 'next/image';
import {
  createLocaleLinks,
  localizeInternalHref,
  prefixInternalResourceHrefsInHtml,
} from '@/lib/locale-links';
import { generateDefinitionSchema, generateFAQSchema } from '@/lib/glossary-schema';
import { generateSpeakableSchema } from '@/lib/schema';
import { generateGlossaryImageAltText, generateImageTitle } from '@/lib/glossary/image-alt-text';
import { getGlossaryCategoryAccent } from '@/lib/glossary-category-accent';
import RelatedGlossaryTerms from './RelatedGlossaryTerms';
import GlossaryImageGallery from './GlossaryImageGallery';
import Footer from './Footer';
import FloatingHeader from './FloatingHeader';
import { EditorialCtaBand } from '@/components/editorial/EditorialCtaBand';
import { GlossaryEnglishNotice } from '@/components/glossary/GlossaryEnglishNotice';
import ContentAuthorByline from '@/components/ContentAuthorByline';
import {
  EditorialPageShell,
  EDITORIAL_BODY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_GUIDE_PROSE_CLASS,
  EDITORIAL_GUIDE_TITLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_MAIN_WITH_HEADER_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { getTranslations } from 'next-intl/server';

interface GlossaryTermTemplateProps {
  term: GlossaryTerm;
  relatedTerms: GlossaryTerm[];
  locale: string;
}

function getArticle(term: string): string {
  const firstChar = term.trim().charAt(0).toLowerCase();
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(firstChar) ? 'an' : 'a';
}

function prepareGlossaryHtml(html: string, locale: string): string {
  return prefixInternalResourceHrefsInHtml(normalizeGlossaryBodyHtml(html), locale);
}

export default async function GlossaryTermTemplate({
  term,
  relatedTerms,
  locale,
}: GlossaryTermTemplateProps) {
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const tPage = await getTranslations({ locale, namespace: 'glossary.termPage' });
  const links = createLocaleLinks(locale);
  const accent = getGlossaryCategoryAccent(term.category);
  const categoryLabel = t(`categories.${getGlossaryCategoryMessageKey(term.category)}`);
  const definitionSchema = generateDefinitionSchema(term);
  const faqSchema = term.faqs ? generateFAQSchema(term.faqs) : null;
  const speakableSchema =
    term.faqs && term.faqs.length > 0
      ? generateSpeakableSchema(['.speakable-answer', 'h1', 'h2'])
      : null;

  const extendedHtml = prepareGlossaryHtml(term.extendedDefinition.replace(/\n/g, '<br />'), locale);
  const disambiguationHtml = term.disambiguation
    ? prepareGlossaryHtml(term.disambiguation.body, locale)
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definitionSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      {speakableSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
        />
      ) : null}

      <EditorialPageShell footer={null} solidPageBackground>
        <FloatingHeader locale={locale} showFullNav showSpacer={false} />

        <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
          <GlossaryEnglishNotice
            locale={locale}
            message={t('englishNotice.message')}
            linkLabel={t('englishNotice.link')}
          />

          <nav
            className="mb-10 text-[11px] font-light uppercase tracking-widest text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href={links.glossary} className="transition-colors hover:text-neutral-900">
              {tPage('breadcrumb')}
            </Link>
            <span className="mx-2 text-neutral-400" aria-hidden>
              /
            </span>
            <span className="text-neutral-700">{term.term}</span>
          </nav>

          <header className="mb-12 border-b border-sage-200/80 pb-10">
            <p className={`${EDITORIAL_SECTION_LABEL_CLASS} font-medium ${accent.label}`}>
              {categoryLabel}
            </p>
            <h1 className={`mt-3 ${EDITORIAL_GUIDE_TITLE_CLASS}`}>
              {tPage('title', { article: getArticle(term.term), term: term.term })}
            </h1>
            <ContentAuthorByline className="mt-6" />
          </header>

          <div className="flex flex-col gap-12 lg:flex-row">
            <div className="min-w-0 flex-1">
              {term.image ? (
                <div className="relative mb-10 aspect-[16/10] w-full overflow-hidden border border-sage-200/90 bg-neutral-100/40">
                  <Image
                    src={term.image}
                    alt={generateGlossaryImageAltText(term.term, term.definition)}
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: term.slug === 'a-frame' ? 'center 70%' : 'center bottom',
                    }}
                    priority
                    fetchPriority="high"
                    quality={90}
                    sizes="(max-width: 896px) 100vw, 896px"
                    title={generateImageTitle(term.term)}
                  />
                </div>
              ) : null}

              {term.images && term.images.length > 0 ? (
                <GlossaryImageGallery
                  images={term.images}
                  imageAltTexts={term.imageAltTexts}
                  term={term.term}
                  definition={term.definition}
                />
              ) : null}

              <section className="mb-12 border-l-4 border-sage-600 bg-white/50 px-6 py-6 sm:px-8">
                <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>{tPage('quickAnswer')}</h2>
                <p className="mt-4 max-w-3xl text-base font-light leading-relaxed text-neutral-800 speakable-answer">
                  {term.definition}
                </p>
              </section>

              {term.disambiguation && disambiguationHtml ? (
                <section
                  className="mb-12 border border-sage-200/90 bg-sage-50/50 px-6 py-6 sm:px-8"
                  aria-labelledby="glossary-disambiguation-heading"
                >
                  <h2 id="glossary-disambiguation-heading" className={EDITORIAL_H2_CLASS}>
                    {term.disambiguation.heading}
                  </h2>
                  <div
                    className={`mt-4 ${EDITORIAL_GUIDE_PROSE_CLASS}`}
                    dangerouslySetInnerHTML={{ __html: disambiguationHtml }}
                  />
                </section>
              ) : null}

              <section className="mb-12 border-t border-sage-200/80 pt-10">
                <h2 className="font-[Georgia] text-2xl font-light tracking-tight text-neutral-900">
                  {tPage('understanding', { term: term.term })}
                </h2>
                <div
                  className={`mt-6 ${EDITORIAL_GUIDE_PROSE_CLASS}`}
                  dangerouslySetInnerHTML={{ __html: extendedHtml }}
                />
              </section>

              {term.examples && term.examples.length > 0 ? (
                <section className="mb-12 border-t border-sage-200/80 pt-10">
                  <h2 className={EDITORIAL_H2_CLASS}>{tPage('examples')}</h2>
                  <ul className="mt-6 space-y-3 border-l border-sage-200 pl-4">
                    {term.examples.map((example, index) => (
                      <li key={index} className={EDITORIAL_BODY_CLASS}>
                        {example}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {term.useCases && term.useCases.length > 0 ? (
                <section className="mb-12 border-t border-sage-200/80 pt-10">
                  <h2 className={EDITORIAL_H2_CLASS}>{tPage('useCases')}</h2>
                  <ul className="mt-6 space-y-3 border-l border-sage-200 pl-4">
                    {term.useCases.map((useCase, index) => (
                      <li key={index} className={EDITORIAL_BODY_CLASS}>
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {term.internalLinks && term.internalLinks.length > 0 ? (
                <section className="mb-12 border-t border-sage-200/80 pt-10">
                  <h2 className={EDITORIAL_H2_CLASS}>{tPage('relatedServices')}</h2>
                  <ul className="mt-6 space-y-2 border-l border-sage-200 pl-4">
                    {term.internalLinks.map((link, index) => (
                      <li key={index}>
                        <Link
                          href={localizeInternalHref(link.url, locale)}
                          className={EDITORIAL_LINK_CLASS}
                        >
                          {link.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {term.faqs && term.faqs.length > 0 ? (
                <section className="mb-12 border-t border-sage-200/80 pt-10">
                  <h2 className={EDITORIAL_H2_CLASS}>{tPage('faqs')}</h2>
                  <dl className="mt-8 space-y-8">
                    {term.faqs.map((faq, index) => (
                      <div key={index}>
                        <dt className="text-sm font-bold text-neutral-900">{faq.question}</dt>
                        <dd
                          className={`mt-2 border-l border-sage-200 pl-4 ${EDITORIAL_BODY_CLASS} speakable-answer`}
                          dangerouslySetInnerHTML={{
                            __html: prepareGlossaryHtml(faq.answer, locale),
                          }}
                        />
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <EditorialCtaBand
                title={tPage('cta.title')}
                description={tPage('cta.description', { term: term.term })}
                buttonLabel={tPage('cta.button')}
                buttonHref="https://sageoutdooradvisory.com/contact-us/"
                external
              />

              <p className="mt-10 text-center">
                <Link href={links.glossary} className={EDITORIAL_LINK_CLASS}>
                  {tPage('backToGlossary')}
                </Link>
              </p>
            </div>

            <aside className="lg:w-56 lg:shrink-0 lg:self-stretch">
              <div className="sticky top-28 z-10 max-h-[calc(100vh-7rem)] space-y-6 overflow-y-auto">
                {relatedTerms.length > 0 ? (
                  <div className={`${EDITORIAL_CARD_CLASS} ${accent.card} p-4`}>
                    <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>{tPage('relatedTerms')}</h2>
                    <ul className="mt-4 space-y-2">
                      {relatedTerms.map((relatedTerm) => (
                        <li key={relatedTerm.slug}>
                          <Link
                            href={links.glossaryTerm(relatedTerm.slug)}
                            className={`text-sm font-light ${EDITORIAL_LINK_CLASS}`}
                          >
                            {relatedTerm.term}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className={`${EDITORIAL_CARD_CLASS} p-4`}>
                  <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>{tPage('quickLinks')}</h2>
                  <ul className="mt-4 space-y-2 text-sm font-light">
                    <li>
                      <Link href={links.glossary} className={EDITORIAL_LINK_CLASS}>
                        {tPage('viewAllTerms')}
                      </Link>
                    </li>
                    <li>
                      <Link href={links.guides} className={EDITORIAL_LINK_CLASS}>
                        {tPage('expertGuides')}
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/services-overview/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        {tPage('ourServices')}
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/shop/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        {tPage('marketReports')}
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/contact-us/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        {tPage('scheduleConsultation')}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>

          <RelatedGlossaryTerms currentTerm={term} locale={locale} maxTerms={8} />
        </main>

        <Footer locale={locale} />
      </EditorialPageShell>
    </>
  );
}
