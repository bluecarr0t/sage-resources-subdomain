import { GlossaryTerm } from "@/lib/glossary/index";
import Link from "next/link";
import Image from "next/image";
import { generateDefinitionSchema, generateFAQSchema } from "@/lib/glossary-schema";
import { generateSpeakableSchema } from "@/lib/schema";
import { generateGlossaryImageAltText, generateImageTitle } from "@/lib/glossary/image-alt-text";
import Footer from "./Footer";
import FloatingHeader from "./FloatingHeader";

interface GlossaryTermTemplateProps {
  term: GlossaryTerm;
  relatedTerms: GlossaryTerm[];
}

export default function GlossaryTermTemplate({ term, relatedTerms }: GlossaryTermTemplateProps) {
  const definitionSchema = generateDefinitionSchema(term);
  const faqSchema = term.faqs ? generateFAQSchema(term.faqs) : null;
  const speakableSchema = term.faqs && term.faqs.length > 0 
    ? generateSpeakableSchema([".speakable-answer", "h1", "h2"])
    : null;

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definitionSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {speakableSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
        />
      )}

      <div className="min-h-screen bg-white">
        {/* Floating Header */}
        <FloatingHeader showFullNav={true} showSpacer={false} />

        {/* Breadcrumb */}
        <nav className="bg-gray-50 border-b border-gray-200 pt-32 md:pt-36">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center space-x-2 text-sm">
              <Link href="https://sageoutdooradvisory.com" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <Link href="/glossary" className="text-gray-500 hover:text-gray-700">
                Glossary
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{term.term}</span>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Term Header */}
              <div className="mb-8">
                <div className="inline-block px-3 py-1 bg-[#00b6a6]/10 text-[#006b5f] text-sm font-semibold rounded-full mb-4">
                  {term.category}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  What is {term.term}?
                </h1>
                {term.image && (
                  <div className="mb-6 relative overflow-hidden rounded-3xl shadow-2xl border-4 border-white/20 backdrop-blur-sm bg-gradient-to-br from-slate-900/10 to-slate-800/10">
                    <div className="aspect-video relative">
                      <Image
                        src={term.image}
                        alt={generateGlossaryImageAltText(term.term, term.definition)}
                        fill
                        className="object-cover"
                        priority
                        fetchPriority="high"
                        quality={90}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                        title={generateImageTitle(term.term)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>
                  </div>
                )}
                <div className="bg-[#00b6a6]/10 border-l-4 border-[#00b6a6] p-6 rounded-2xl shadow-sm">
                  <p className="text-lg text-gray-800 leading-relaxed">
                    {term.definition}
                  </p>
                </div>
              </div>

              {/* Extended Definition */}
              <section className="prose prose-lg max-w-none mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Understanding {term.term}
                </h2>
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: term.extendedDefinition.replace(/\n/g, '<br />') }}
                />
              </section>

              {/* Examples */}
              {term.examples && term.examples.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Examples of {term.term}
                  </h2>
                  <ul className="space-y-3">
                    {term.examples.map((example, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[#006b5f] mr-2">•</span>
                        <span className="text-gray-700">{example}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Use Cases */}
              {term.useCases && term.useCases.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Common Use Cases
                  </h2>
                  <ul className="space-y-3">
                    {term.useCases.map((useCase, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[#006b5f] mr-2">•</span>
                        <span className="text-gray-700">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Internal Links */}
              {term.internalLinks && term.internalLinks.length > 0 && (
                <section className="mb-8 bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Related Services
                  </h2>
                  <ul className="space-y-2">
                    {term.internalLinks.map((link, index) => (
                      <li key={index}>
                        <Link
                          href={link.url}
                          className="text-[#006b5f] hover:text-[#005a4f] underline"
                        >
                          {link.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* FAQs */}
              {term.faqs && term.faqs.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Frequently Asked Questions About {term.term}
                  </h2>
                  <div className="space-y-4">
                    {term.faqs.map((faq, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {faq.question}
                        </h3>
                        <p 
                          className="text-gray-700 leading-relaxed speakable-answer"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* CTA */}
              <section className="bg-[#00b6a6] rounded-lg p-8 text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Need Help with Your Outdoor Hospitality Project?
                </h2>
                <p className="text-white/90 mb-6">
                  Our experts can help you understand how {term.term.toLowerCase()} applies to your project.
                </p>
                <Link
                  href="https://sageoutdooradvisory.com/contact-us/"
                  className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Schedule Free Consultation
                </Link>
              </section>

              {/* Back to Glossary */}
              <div className="text-center">
                <Link
                  href="/glossary"
                  className="text-[#006b5f] hover:text-[#005a4f] font-medium"
                >
                  ← Back to Glossary
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                {/* Related Terms */}
                {relatedTerms.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Related Terms
                    </h3>
                    <ul className="space-y-2">
                      {relatedTerms.map((relatedTerm) => (
                        <li key={relatedTerm.slug}>
                          <Link
                            href={`/glossary/${relatedTerm.slug}`}
                            className="text-[#006b5f] hover:text-[#005a4f] underline"
                          >
                            {relatedTerm.term}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Links */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Quick Links
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        href="/glossary"
                        className="text-[#006b5f] hover:text-[#005a4f] underline"
                      >
                        View All Terms
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/services-overview/"
                        className="text-[#006b5f] hover:text-[#005a4f] underline"
                      >
                        Our Services
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/shop/"
                        className="text-[#006b5f] hover:text-[#005a4f] underline"
                      >
                        Market Reports
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/contact-us/"
                        className="text-[#006b5f] hover:text-[#005a4f] underline font-semibold"
                      >
                        Schedule Consultation
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

