import { GlossaryTerm } from '@/lib/glossary/index';
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

export default function GlossaryTermTemplate({
  term,
  relatedTerms,
  locale,
}: GlossaryTermTemplateProps) {
  const links = createLocaleLinks(locale);
  const accent = getGlossaryCategoryAccent(term.category);
  const definitionSchema = generateDefinitionSchema(term);
  const faqSchema = term.faqs ? generateFAQSchema(term.faqs) : null;
  const speakableSchema =
    term.faqs && term.faqs.length > 0
      ? generateSpeakableSchema(['.speakable-answer', 'h1', 'h2'])
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

      <EditorialPageShell footer={null}>
        <FloatingHeader locale={locale} showFullNav showSpacer={false} />

        <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
          <nav
            className="mb-10 text-[11px] font-light uppercase tracking-widest text-neutral-500"
            aria-label="Breadcrumb"
          >
            <Link href={links.glossary} className="transition-colors hover:text-neutral-900">
              Glossary
            </Link>
            <span className="mx-2 text-neutral-400" aria-hidden>
              /
            </span>
            <span className="text-neutral-700">{term.term}</span>
          </nav>

          <header className="mb-12 border-b border-sage-200/80 pb-10">
            <p className={`${EDITORIAL_SECTION_LABEL_CLASS} font-medium ${accent.label}`}>
              {term.category}
            </p>
            <h1 className={`mt-3 ${EDITORIAL_GUIDE_TITLE_CLASS}`}>
              What is {getArticle(term.term)} {term.term}?
            </h1>
          </header>

          <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
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
                <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Quick answer</h2>
                <p className={`mt-4 max-w-3xl text-base font-light leading-relaxed text-neutral-800 speakable-answer`}>
                  {term.definition}
                </p>
              </section>

              <section className="mb-12 border-t border-sage-200/80 pt-10">
                <h2 className="font-[Georgia] text-2xl font-light tracking-tight text-neutral-900">
                  Understanding {term.term}
                </h2>
                <div
                  className={`mt-6 ${EDITORIAL_GUIDE_PROSE_CLASS}`}
                  dangerouslySetInnerHTML={{
                    __html: prefixInternalResourceHrefsInHtml(
                      term.extendedDefinition.replace(/\n/g, '<br />'),
                      locale
                    ),
                  }}
                />
              </section>

              {term.examples && term.examples.length > 0 ? (
                <section className="mb-12 border-t border-sage-200/80 pt-10">
                  <h2 className={EDITORIAL_H2_CLASS}>Examples</h2>
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
                  <h2 className={EDITORIAL_H2_CLASS}>Common use cases</h2>
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
                  <h2 className={EDITORIAL_H2_CLASS}>Related services</h2>
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
                  <h2 className={EDITORIAL_H2_CLASS}>Frequently asked questions</h2>
                  <dl className="mt-8 space-y-8">
                    {term.faqs.map((faq, index) => (
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
                </section>
              ) : null}

              <EditorialCtaBand
                title="Need help with your outdoor hospitality project?"
                description={`Our experts can help you understand how ${term.term.toLowerCase()} applies to your project.`}
                buttonLabel="Schedule free consultation"
                buttonHref="https://sageoutdooradvisory.com/contact-us/"
                external
              />

              <p className="mt-10 text-center">
                <Link href={links.glossary} className={EDITORIAL_LINK_CLASS}>
                  ← Back to glossary
                </Link>
              </p>
            </div>

            <aside className="lg:w-56 lg:shrink-0">
              <div className="sticky top-28 space-y-6">
                {relatedTerms.length > 0 ? (
                  <div className={`${EDITORIAL_CARD_CLASS} ${accent.card} p-4`}>
                    <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Related terms</h2>
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
                  <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Quick links</h2>
                  <ul className="mt-4 space-y-2 text-sm font-light">
                    <li>
                      <Link href={links.glossary} className={EDITORIAL_LINK_CLASS}>
                        View all terms
                      </Link>
                    </li>
                    <li>
                      <Link href={links.guides} className={EDITORIAL_LINK_CLASS}>
                        Expert guides
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/services-overview/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        Our services
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/shop/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        Market reports
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://sageoutdooradvisory.com/contact-us/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={EDITORIAL_LINK_CLASS}
                      >
                        Schedule consultation
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
