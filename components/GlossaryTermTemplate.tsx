import { GlossaryTerm } from "@/lib/glossary";
import Link from "next/link";
import Image from "next/image";
import { generateDefinitionSchema, generateFAQSchema } from "@/lib/glossary-schema";

interface GlossaryTermTemplateProps {
  term: GlossaryTerm;
  relatedTerms: GlossaryTerm[];
}

export default function GlossaryTermTemplate({ term, relatedTerms }: GlossaryTermTemplateProps) {
  const definitionSchema = generateDefinitionSchema(term);
  const faqSchema = term.faqs ? generateFAQSchema(term.faqs) : null;

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

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="https://sageoutdooradvisory.com" className="flex items-center">
                <Image
                  src="/sage-logo-black-header.png"
                  alt="Sage Outdoor Advisory"
                  width={200}
                  height={100}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/glossary"
                  className="px-4 py-2 text-white hover:text-gray-300"
                >
                  Glossary
                </Link>
                <Link
                  href="https://sageoutdooradvisory.com/contact-us/"
                  className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav className="bg-gray-50 border-b border-gray-200">
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Term Header */}
              <div className="mb-8">
                <div className="inline-block px-3 py-1 bg-[#00b6a6]/10 text-[#00b6a6] text-sm font-semibold rounded-full mb-4">
                  {term.category}
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  What is {term.term}?
                </h1>
                <div className="bg-[#00b6a6]/10 border-l-4 border-[#00b6a6] p-6 rounded-lg">
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
                        <span className="text-[#00b6a6] mr-2">•</span>
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
                        <span className="text-[#00b6a6] mr-2">•</span>
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
                          className="text-[#00b6a6] hover:text-[#009688] underline"
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
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
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
                  className="inline-block px-8 py-4 bg-white text-[#00b6a6] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Schedule Free Consultation
                </Link>
              </section>

              {/* Back to Glossary */}
              <div className="text-center">
                <Link
                  href="/glossary"
                  className="text-blue-600 hover:text-blue-700 font-medium"
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
                            className="text-[#00b6a6] hover:text-[#009688] underline"
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
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        View All Terms
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/our-services/"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Our Services
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/market-reports/"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Market Reports
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="https://sageoutdooradvisory.com/contact-us/"
                        className="text-blue-600 hover:text-blue-700 underline font-semibold"
                      >
                        Schedule Consultation
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-black text-white py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Sage Outdoor Advisory</h3>
                <p className="text-gray-400">
                  5113 South Harper, Suite 2C – #4001<br />
                  Chicago, Illinois 60615
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <Link href="/glossary" className="hover:text-white">
                      Glossary
                    </Link>
                  </li>
                  <li>
                    <Link href="https://sageoutdooradvisory.com/our-services" className="hover:text-white">
                      Services
                    </Link>
                  </li>
                  <li>
                    <Link href="https://sageoutdooradvisory.com/market-reports" className="hover:text-white">
                      Market Reports
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Connect</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>
                    <Link href="https://sageoutdooradvisory.com/contact-us/" className="hover:text-white font-semibold">
                      Schedule Consultation →
                    </Link>
                  </li>
                  <li>
                    <Link href="https://sageoutdooradvisory.com/clients/" className="hover:text-white">
                      Client Testimonials
                    </Link>
                  </li>
                  <li>
                    <Link href="https://sageoutdooradvisory.com/about" className="hover:text-white">
                      About
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
              <p>&copy; {new Date().getFullYear()} Sage Outdoor Advisory. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

