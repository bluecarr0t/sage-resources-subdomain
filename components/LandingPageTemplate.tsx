import { LandingPageContent, getLandingPageSync } from "@/lib/landing-pages";
import { getGuideSync } from "@/lib/guides";
import Link from "next/link";
import Image from "next/image";
import {
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateServiceSchema,
  generateHowToSchema,
  generateLandingPageArticleSchema,
  generateItemListSchema,
  generateSpeakableSchema,
  generateReviewSchema,
  generateAggregateRatingSchema,
} from "@/lib/schema";
import TableOfContents from "@/components/TableOfContents";
import RelatedLandingPages from "@/components/RelatedLandingPages";
import RelatedGlossaryTerms from "@/components/RelatedGlossaryTerms";
import Footer from "./Footer";
import FloatingHeader from "./FloatingHeader";

// Helper function to create a slug from a title (must match TOC component)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

interface LandingPageTemplateProps {
  content: LandingPageContent;
}

export default function LandingPageTemplate({ content }: LandingPageTemplateProps) {
  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const localBusinessSchema = generateLocalBusinessSchema();
  const breadcrumbSchema = generateBreadcrumbSchema(content.slug, content.hero.headline);
  const serviceSchema = generateServiceSchema(content);
  const articleSchema = generateLandingPageArticleSchema(content);
  const faqSchema = content.faqs ? generateFAQSchema(content.faqs) : null;
  const howToSchema = content.howToSteps && content.howToSteps.length > 0
    ? generateHowToSchema(content.howToSteps, content.hero.headline, content.metaDescription)
    : null;
  const keyTakeawaysSchema = content.keyTakeaways && content.keyTakeaways.length > 0
    ? generateItemListSchema(content.keyTakeaways, `Key Takeaways: ${content.hero.headline}`)
    : null;
  const speakableSchema = generateSpeakableSchema();

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
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
      {howToSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      )}
      {keyTakeawaysSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(keyTakeawaysSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
      />

      {/* Floating CTA Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="https://sageoutdooradvisory.com/contact-us/"
          className="inline-block px-6 py-3 bg-[#006b5f] text-white font-semibold rounded-full shadow-2xl hover:bg-[#005a4f] transition-all transform hover:scale-105"
        >
          Schedule Free Call
        </Link>
      </div>

      <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader showFullNav={true} showSpacer={false} />

      <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 pt-32 md:pt-36 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6" style={{ fontSize: '3rem' }}>
              {content.hero.headline}
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              {content.hero.subheadline}
            </p>
            <Link
              href={content.hero.ctaLink}
              className="inline-block px-8 py-4 bg-[#006b5f] text-white text-lg font-semibold rounded-lg hover:bg-[#005a4f] transition-colors shadow-lg"
            >
              {content.hero.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* Key Takeaways Section */}
      {content.keyTakeaways && content.keyTakeaways.length > 0 && (
        <section className="bg-[#006b5f]/10 border-l-4 border-[#006b5f] mx-4 sm:mx-6 lg:mx-8 my-8 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Takeaways</h2>
          <ul className="space-y-2">
            {content.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#006b5f] mr-2 font-bold">{index + 1}.</span>
                <span className="text-gray-700">{takeaway}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Main Content Sections */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Table of Contents */}
          {content.sections.length >= 3 && (
            <div className="mb-12">
              <TableOfContents sections={content.sections} />
            </div>
          )}
          
          <div className="space-y-16">
            {content.sections.map((section, index) => {
              const sectionId = slugify(section.title);
              return (
                <div key={index} className="prose prose-lg max-w-none">
                  <h2 
                    id={sectionId}
                    className="text-3xl font-bold text-gray-900 mb-4 scroll-mt-24"
                  >
                    {section.title}
                  </h2>
              <div 
                className="text-gray-700 mb-6 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
              {section.bullets && (
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li 
                      key={bulletIndex} 
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: bullet }}
                    />
                  ))}
                </ul>
              )}
              {/* Add CTA after every other section */}
              {index % 2 === 1 && index < content.sections.length - 1 && (
                <div className="mt-8 text-center">
                  <Link
                    href="https://sageoutdooradvisory.com/contact-us/"
                    className="inline-block px-6 py-3 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
                  >
                    Schedule Free Consultation
                  </Link>
                </div>
              )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {content.benefits && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why Choose Sage Outdoor Advisory?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {content.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md text-center"
                >
                  <p className="text-gray-700 font-medium">{benefit}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="inline-block px-8 py-4 bg-[#006b5f] text-white text-lg font-semibold rounded-lg hover:bg-[#005a4f] transition-colors shadow-lg"
              >
                Schedule Your Free Consultation
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {content.testimonials && content.testimonials.showSection && (
        <section className="py-16 bg-white">
          {/* Review Schema for Testimonials */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(generateReviewSchema({
              author: "Randy Knapp",
              rating: 5,
              reviewBody: "Sage's feasibility study was essential to the success of the first phases of development at our Margaritaville RV Resort in Auburndale. They continue to provide valuable market and financial insights for several of our other new projects. Their unparalleled knowledge of the industry and their unwavering commitment to their clients make them a true asset.",
              datePublished: "2024-01-15"
            })) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(generateReviewSchema({
              author: "Bygnal Dutson",
              rating: 5,
              reviewBody: "Sage creates win-win scenarios for hoteliers and bankers or investors who want to get into the unconventional glamping space. Open Sky is currently in its second season of operations, in large part, thanks to the relationship with Sage. They provided a thorough and realistic appraisal of our glamping property, which in turn, allowed Open Sky to secure traditional bank funding for our pre-planned & designed build out.",
              datePublished: "2024-06-01"
            })) }}
          />
          {/* Aggregate Rating Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(generateAggregateRatingSchema(4.9, 127)) }}
          />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-center text-gray-700 mb-8">
              See how Sage Outdoor Advisory has helped successful outdoor hospitality projects across the United States.
            </p>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-lg mb-8">
              <blockquote className="text-lg text-gray-800 italic mb-4">
                &ldquo;Sage&apos;s feasibility study was essential to the success of the first phases of development at our Margaritaville RV Resort in Auburndale. They continue to provide valuable market and financial insights for several of our other new projects. Their unparalleled knowledge of the industry and their unwavering commitment to their clients make them a true asset.&rdquo;
              </blockquote>
              <p className="text-gray-700 font-semibold">
                — Randy Knapp, Owner – Margaritaville RV Resort, Auburndale FL
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Recipient of &apos;Top 10&apos; Awards from USA Today, Campendium, RV Share and Traveler&apos;s Choice
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-lg mb-8">
              <blockquote className="text-lg text-gray-800 italic mb-4">
                &ldquo;Sage creates win-win scenarios for hoteliers and bankers or investors who want to get into the unconventional glamping space. Open Sky is currently in its second season of operations, in large part, thanks to the relationship with Sage. They provided a thorough and realistic appraisal of our glamping property, which in turn, allowed Open Sky to secure traditional bank funding for our pre-planned & designed build out.&rdquo;
              </blockquote>
              <p className="text-gray-700 font-semibold">
                — Bygnal Dutson, Founder of Open Sky, Zion, UT
              </p>
            </div>
            <div className="text-center">
              <Link
                href={content.testimonials.ctaLink || "https://sageoutdooradvisory.com/clients/"}
                className="text-[#006b5f] hover:text-[#005a4f] font-semibold text-lg"
              >
                {content.testimonials.ctaText || "View All Client Testimonials"} →
              </Link>
            </div>
            <div className="mt-8 text-center">
              <p className="text-gray-700 mb-4">Ready to join our success stories?</p>
              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="inline-block px-8 py-4 bg-[#006b5f] text-white text-lg font-semibold rounded-lg hover:bg-[#005a4f] transition-colors shadow-lg"
              >
                Schedule Your Free Consultation
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Partners Section */}
      {content.partners && content.partners.links.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              {content.partners.title}
            </h2>
            <p className="text-center text-gray-700 mb-8">
              {content.partners.description}
            </p>
            <div className="space-y-4">
              {content.partners.links.map((partner, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#006b5f] hover:text-[#005a4f]"
                >
                  {partner.name}
                </Link>
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {partner.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center space-y-4">
              <Link
                href="https://sageoutdooradvisory.com/sage-key-partners/"
                className="text-[#006b5f] hover:text-[#005a4f] font-medium block mb-4"
              >
                View All Sage Partners →
              </Link>
              <p className="text-gray-700 mb-2">Ready to get started with your project?</p>
              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="inline-block px-6 py-3 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
              >
                Schedule Free Consultation
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Guides Section - Pillar Page Linking */}
      {content.relatedPillarPages && content.relatedPillarPages.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Comprehensive Guides
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Explore our comprehensive guides for in-depth information on these topics
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {content.relatedPillarPages.map((guideSlug) => {
                const guide = getGuideSync(guideSlug);
                if (!guide) return null;
                return (
                  <Link
                    key={guideSlug}
                    href={`/guides/${guideSlug}`}
                    className="block bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200 hover:shadow-xl hover:border-[#006b5f] transition-all"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {guide.hero.headline}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {guide.metaDescription}
                    </p>
                    <span className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm">
                      Read complete guide →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Related Landing Pages Section - Enhanced Internal Cross-Linking */}
      <RelatedLandingPages currentPage={content} locale="en" maxPages={6} />

      {/* Related Services Section - Root Domain Linking */}
      {content.relatedServices && content.relatedServices.services.length > 0 && (
        <section className={`py-16 ${content.relatedPages ? "bg-white" : "bg-gray-50"}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              {content.relatedServices.title}
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Explore Sage Outdoor Advisory&apos;s professional services for outdoor hospitality projects
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {content.relatedServices.services.map((service, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-[#006b5f] transition-all"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    <Link
                      href={service.url}
                      className="text-[#006b5f] hover:text-[#005a4f]"
                    >
                      {service.name}
                    </Link>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {service.description}
                  </p>
                  <Link
                    href={service.url}
                    className="inline-block text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
                  >
                    Learn More →
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="https://sageoutdooradvisory.com/services-overview/"
                className="inline-block px-6 py-3 bg-[#006b5f] text-white font-semibold rounded-lg hover:bg-[#005a4f] transition-colors"
              >
                View All Services
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Resources Section - SEO Cross-Linking */}
      <section className={`py-16 border-t border-gray-200 ${content.relatedPages || content.relatedServices ? "bg-white" : "bg-gray-50"}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Related Resources from Sage Outdoor Advisory
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Explore more resources to help with your outdoor hospitality project
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/services-overview/"
                  className="text-[#006b5f] hover:text-[#005a4f]"
                >
                  Our Complete Services
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Learn about all of Sage&apos;s feasibility study and appraisal services for outdoor hospitality properties.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/services-overview/"
                className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
              >
                View Services →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/shop/"
                  className="text-[#006b5f] hover:text-[#005a4f]"
                >
                  Free Market Reports
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Download our comprehensive market reports including the 2025 USA Glamping Market Report.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/shop/"
                className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
              >
                Download Reports →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/clients/"
                  className="text-[#006b5f] hover:text-[#005a4f]"
                >
                  Client Success Stories
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                See how Sage has helped successful glamping, RV resort, and campground projects nationwide.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/clients/"
                className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
              >
                View Case Studies →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/data-insights/"
                  className="text-[#006b5f] hover:text-[#005a4f]"
                >
                  Data & Insights
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Access comprehensive market data and insights for the outdoor hospitality industry.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/data-insights/"
                className="text-[#006b5f] hover:text-[#005a4f] font-medium text-sm"
              >
                Explore Data →
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="https://sageoutdooradvisory.com/blog/"
              className="text-[#006b5f] hover:text-[#005a4f] font-medium"
            >
              Read our blog for industry insights and trends →
            </Link>
          </div>
        </div>
      </section>

      {/* Related Landing Pages Section - Enhanced Internal Linking */}
      <RelatedLandingPages currentPage={content} locale="en" maxPages={6} />

      {/* Related Glossary Terms Section - Enhanced Internal Linking */}
      {content.keywords && content.keywords.length > 0 && (
        <section className="py-12 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Related Industry Terms
            </h2>
            <p className="text-gray-600 mb-6">
              Explore key terms related to this topic in our comprehensive glossary.
            </p>
            <div className="flex flex-wrap gap-3">
              {content.keywords.slice(0, 8).map((keyword) => {
                // Try to find a matching glossary term
                const allTerms = require("@/lib/glossary/index").getAllGlossaryTerms();
                const matchingTerm = allTerms.find((term: any) => 
                  term.term.toLowerCase() === keyword.toLowerCase() ||
                  term.term.toLowerCase().includes(keyword.toLowerCase()) ||
                  keyword.toLowerCase().includes(term.term.toLowerCase())
                );
                
                if (matchingTerm) {
                  return (
                    <Link
                      key={matchingTerm.slug}
                      href={`/glossary/${matchingTerm.slug}`}
                      className="inline-block px-4 py-2 bg-gray-100 hover:bg-[#00b6a6] hover:text-white text-gray-900 rounded-lg transition-colors text-sm font-medium"
                    >
                      {matchingTerm.term}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {content.faqs && content.faqs.length > 0 && (
        <section className={`py-16 ${content.relatedPages || content.partners ? "bg-white" : "bg-gray-50"}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {content.faqs.map((faq, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h3>
                  <div 
                    className="text-gray-700 leading-relaxed speakable-answer"
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
                className="inline-block px-8 py-4 bg-[#006b5f] text-white text-lg font-semibold rounded-lg hover:bg-[#005a4f] transition-colors shadow-lg"
              >
                Schedule Your Free Consultation
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-[#006b5f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {content.cta.title}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {content.cta.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="https://sageoutdooradvisory.com/contact-us/"
              className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Schedule Free Consultation
            </Link>
            <Link
              href="https://sageoutdooradvisory.com/services-overview/"
              className="inline-block px-8 py-4 bg-transparent border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-[#006b5f] transition-colors"
            >
              Learn More About Our Services
            </Link>
          </div>
          <p className="text-white/90 mt-6 text-sm">
            <Link href="https://sageoutdooradvisory.com/about/" className="underline hover:text-white">
              Learn more about Sage Outdoor Advisory
            </Link> or <Link href="https://sageoutdooradvisory.com/clients/" className="underline hover:text-white">view our client success stories</Link>
          </p>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
    </>
  );
}

