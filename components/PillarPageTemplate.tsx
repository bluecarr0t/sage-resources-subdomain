"use client";

import { GuideContent, getGuide } from "@/lib/guides";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateGuideBreadcrumbSchema,
  generateFAQSchema,
  generateArticleSchema,
} from "@/lib/schema";
import Footer from "./Footer";

interface PillarPageTemplateProps {
  content: GuideContent;
}

export default function PillarPageTemplate({ content }: PillarPageTemplateProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [showTOC, setShowTOC] = useState(false);

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const localBusinessSchema = generateLocalBusinessSchema();
  const breadcrumbSchema = generateGuideBreadcrumbSchema(content.slug, content.hero.headline);
  const articleSchema = generateArticleSchema(content);
  const faqSchema = content.faqs ? generateFAQSchema(content.faqs) : null;

  // Track scroll position for active section highlighting
  useEffect(() => {
    const handleScroll = () => {
      const sections = content.sections.map((s) => s.id);
      const scrollPosition = window.scrollY + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content.sections]);

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Floating CTA Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="https://sageoutdooradvisory.com/contact-us/"
          className="inline-block px-6 py-3 bg-[#00b6a6] text-white font-semibold rounded-full shadow-2xl hover:bg-[#009688] transition-all transform hover:scale-105"
        >
          Schedule Free Call
        </Link>
      </div>

      {/* Mobile TOC Toggle */}
      <button
        onClick={() => setShowTOC(!showTOC)}
        className="lg:hidden fixed top-20 right-4 z-40 bg-[#00b6a6] text-white px-4 py-2 rounded-lg shadow-lg hover:bg-[#009688] transition-colors"
      >
        {showTOC ? "Hide" : "Show"} Contents
      </button>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-black border-b border-gray-800 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <Link href="https://sageoutdooradvisory.com" className="flex items-center">
                <Image
                  src="/sage-logo-black-header.png"
                  alt="Sage Outdoor Advisory"
                  width={200}
                  height={100}
                  className="h-16 w-auto"
                  priority
                />
              </Link>
              <Link
                href="https://sageoutdooradvisory.com/contact-us"
                className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </header>

        {/* Breadcrumbs */}
        <nav className="bg-gray-50 border-b border-gray-200 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="https://sageoutdooradvisory.com" className="hover:text-[#006b5f]">
                Home
              </Link>
              <span>/</span>
              <Link href="/guides" className="hover:text-[#006b5f]">
                Guides
              </Link>
              <span>/</span>
              <span className="text-gray-900">{content.hero.headline}</span>
            </div>
          </div>
        </nav>

        <main>
        {/* Hero Section */}
        <section className={`relative ${content.hero.backgroundImage ? 'py-16 overflow-hidden' : 'bg-gradient-to-br from-blue-50 to-indigo-100 py-16'}`}>
          {content.hero.backgroundImage && (
            <>
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={content.hero.backgroundImage}
                  alt={`${content.hero.headline} background`}
                  fill
                  className="object-cover"
                  priority
                  sizes="100vw"
                  quality={90}
                />
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
              </div>
            </>
          )}
          <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${content.hero.backgroundImage ? 'relative z-10' : ''}`}>
            <div className="max-w-4xl mx-auto text-center">
              <h1 className={`text-5xl font-bold mb-6 ${content.hero.backgroundImage ? 'text-white drop-shadow-lg' : 'text-gray-900'}`} style={{ fontSize: '3rem' }}>
                {content.hero.headline}
              </h1>
              <p className={`text-xl mb-8 ${content.hero.backgroundImage ? 'text-white/95 drop-shadow-md' : 'text-gray-700'}`}>
                {content.hero.subheadline}
              </p>
              {content.lastModified && (
                <p className={`text-xs mb-6 ${content.hero.backgroundImage ? 'text-white/80' : 'text-gray-500'}`}>
                  Last Updated: December 1, 2025
                </p>
              )}
              {content.hero.ctaText && content.hero.ctaLink && (
                <Link
                  href={content.hero.ctaLink}
                  className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-lg"
                >
                  {content.hero.ctaText}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Main Content Area with TOC */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Table of Contents - Sticky Sidebar */}
            <aside
              className={`lg:w-64 flex-shrink-0 ${
                showTOC ? "block" : "hidden lg:block"
              }`}
            >
              <div className="sticky top-24">
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h2>
                  <nav className="space-y-2">
                    {content.tableOfContents.map((item, index) => (
                      <Link
                        key={index}
                        href={`#${item.anchor}`}
                        className={`block text-sm py-2 px-3 rounded transition-colors ${
                          activeSection === item.anchor
                            ? "bg-[#00b6a6] text-white font-semibold"
                            : "text-gray-700 hover:bg-gray-100 hover:text-[#006b5f]"
                        } ${
                          item.level === 2 ? "pl-3" : item.level === 3 ? "pl-6" : ""
                        }`}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 max-w-4xl">
              <article className="prose prose-lg max-w-none">
                {content.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="mb-12 scroll-mt-24"
                  >
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-12 first:mt-0">
                      {section.title}
                    </h2>
                    <div
                      className="text-gray-700 leading-relaxed prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                    {section.subsections && (
                      <div className="mt-8 space-y-8">
                        {section.subsections.map((subsection) => (
                          <div key={subsection.id} id={subsection.id} className="scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                              {subsection.title}
                            </h3>
                            <div
                              className="text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: subsection.content }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </article>

              {/* Cluster Pages Section */}
              {content.clusterPages && content.clusterPages.length > 0 && (
                <section className="mt-16 pt-12 border-t border-gray-200">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Related Guides & Resources
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Explore these related guides to dive deeper into specific topics:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    {content.clusterPages.map((clusterPage, index) => (
                      <Link
                        key={index}
                        href={clusterPage.url}
                        className="block bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-[#00b6a6] transition-all"
                      >
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {clusterPage.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">{clusterPage.description}</p>
                        <span className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm">
                          Read guide →
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Related Guides Section */}
              {content.relatedGuides && content.relatedGuides.length > 0 && (
                <section className="mt-12 pt-12 border-t border-gray-200">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Related Comprehensive Guides
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {content.relatedGuides.map((guideSlug) => {
                      const relatedGuide = getGuide(guideSlug);
                      if (!relatedGuide) return null;
                      return (
                        <Link
                          key={guideSlug}
                          href={`/guides/${guideSlug}`}
                          className="block bg-white p-6 rounded-lg border-2 border-gray-200 hover:shadow-lg hover:border-[#00b6a6] transition-all"
                        >
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {relatedGuide.hero.headline}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {relatedGuide.metaDescription}
                          </p>
                          <span className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm">
                            Read guide →
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Related Services Section */}
              {content.relatedServices && content.relatedServices.services.length > 0 && (
                <section className="mt-12 pt-12 border-t border-gray-200">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    {content.relatedServices.title}
                  </h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    {content.relatedServices.services.map((service, index) => (
                      <div
                        key={index}
                        className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg hover:border-[#00b6a6] transition-all"
                      >
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          <Link
                            href={service.url}
                            className="text-[#006b5f] hover:text-[#005a4f]"
                          >
                            {service.name}
                          </Link>
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                        <Link
                          href={service.url}
                          className="inline-block text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
                        >
                          Learn More →
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        {content.faqs && content.faqs.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {content.faqs.map((faq, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {faq.question}
                    </h3>
                    <div
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <p className="text-gray-700 mb-4 text-lg">
                  Have more questions? Let&apos;s discuss your project.
                </p>
                <Link
                  href="https://sageoutdooradvisory.com/contact-us/"
                  className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-lg"
                >
                  Schedule Your Free Consultation
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        {content.cta && (
          <section className="py-20 bg-[#00b6a6]">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">{content.cta.title}</h2>
              <p className="text-xl text-white/90 mb-8">{content.cta.description}</p>
              <Link
                href={content.cta.buttonLink}
                className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                {content.cta.buttonText}
              </Link>
            </div>
          </section>
        )}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

