import { LandingPageContent } from "@/lib/landing-pages";
import Link from "next/link";
import Image from "next/image";
import {
  generateLocalBusinessSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateServiceSchema,
} from "@/lib/schema";

interface LandingPageTemplateProps {
  content: LandingPageContent;
}

export default function LandingPageTemplate({ content }: LandingPageTemplateProps) {
  // Generate structured data
  const localBusinessSchema = generateLocalBusinessSchema();
  const breadcrumbSchema = generateBreadcrumbSchema(content.slug, content.hero.headline);
  const serviceSchema = generateServiceSchema(content);
  const faqSchema = content.faqs ? generateFAQSchema(content.faqs) : null;

  return (
    <>
      {/* Structured Data */}
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
            <Link
              href="https://sageoutdooradvisory.com/contact-us"
              className="px-6 py-2 bg-[#00b6a6] text-white rounded-lg hover:bg-[#009688] transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {content.hero.headline}
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              {content.hero.subheadline}
            </p>
            <Link
              href={content.hero.ctaLink}
              className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-lg"
            >
              {content.hero.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {content.sections.map((section, index) => (
            <div key={index} className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {section.title}
              </h2>
              <div 
                className="text-gray-700 mb-6 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
              {section.bullets && (
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="leading-relaxed">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {/* Add CTA after every other section */}
              {index % 2 === 1 && index < content.sections.length - 1 && (
                <div className="mt-8 text-center">
                  <Link
                    href="https://sageoutdooradvisory.com/contact-us/"
                    className="inline-block px-6 py-3 bg-[#00b6a6] text-white font-semibold rounded-lg hover:bg-[#009688] transition-colors"
                  >
                    Schedule Free Consultation
                  </Link>
                </div>
              )}
            </div>
          ))}
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
                className="inline-block px-8 py-4 bg-[#00b6a6] text-white text-lg font-semibold rounded-lg hover:bg-[#009688] transition-colors shadow-lg"
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
                className="text-[#00b6a6] hover:text-[#009688] font-semibold text-lg"
              >
                {content.testimonials.ctaText || "View All Client Testimonials"} →
              </Link>
            </div>
            <div className="mt-8 text-center">
              <p className="text-gray-700 mb-4">Ready to join our success stories?</p>
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
                  className="text-[#00b6a6] hover:text-[#009688]"
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
                className="text-[#00b6a6] hover:text-[#009688] font-medium block mb-4"
              >
                View All Sage Partners →
              </Link>
              <p className="text-gray-700 mb-2">Ready to get started with your project?</p>
              <Link
                href="https://sageoutdooradvisory.com/contact-us/"
                className="inline-block px-6 py-3 bg-[#00b6a6] text-white font-semibold rounded-lg hover:bg-[#009688] transition-colors"
              >
                Schedule Free Consultation
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Related Resources Section - SEO Cross-Linking */}
      <section className="py-16 bg-white border-t border-gray-200">
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
                  href="https://sageoutdooradvisory.com/our-services/"
                  className="text-[#00b6a6] hover:text-[#009688]"
                >
                  Our Complete Services
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Learn about all of Sage&apos;s feasibility study and appraisal services for outdoor hospitality properties.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/our-services/"
                className="text-[#00b6a6] hover:text-[#009688] font-medium text-sm"
              >
                View Services →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/market-reports/"
                  className="text-[#00b6a6] hover:text-[#009688]"
                >
                  Free Market Reports
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Download our comprehensive market reports including the 2025 USA Glamping Market Report.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/market-reports/"
                className="text-[#00b6a6] hover:text-[#009688] font-medium text-sm"
              >
                Download Reports →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/clients/"
                  className="text-[#00b6a6] hover:text-[#009688]"
                >
                  Client Success Stories
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                See how Sage has helped successful glamping, RV resort, and campground projects nationwide.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/clients/"
                className="text-[#00b6a6] hover:text-[#009688] font-medium text-sm"
              >
                View Case Studies →
              </Link>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                <Link
                  href="https://sageoutdooradvisory.com/data-insights/"
                  className="text-[#00b6a6] hover:text-[#009688]"
                >
                  Data & Insights
                </Link>
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                Access comprehensive market data and insights for the outdoor hospitality industry.
              </p>
              <Link
                href="https://sageoutdooradvisory.com/data-insights/"
                className="text-[#00b6a6] hover:text-[#009688] font-medium text-sm"
              >
                Explore Data →
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="https://sageoutdooradvisory.com/blog/"
              className="text-[#00b6a6] hover:text-[#009688] font-medium"
            >
              Read our blog for industry insights and trends →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {content.faqs && content.faqs.length > 0 && (
        <section className={`py-16 ${content.partners ? "bg-white" : "bg-gray-50"}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {content.faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
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
      <section className="py-20 bg-[#00b6a6]">
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
              className="inline-block px-8 py-4 bg-white text-[#00b6a6] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Schedule Free Consultation
            </Link>
            <Link
              href="https://sageoutdooradvisory.com/our-services/"
              className="inline-block px-8 py-4 bg-transparent border-2 border-white text-white text-lg font-semibold rounded-lg hover:bg-white hover:text-[#00b6a6] transition-colors"
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

      {/* Footer */}
      <footer className="bg-black text-white py-12">
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
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="https://sageoutdooradvisory.com/our-services" className="hover:text-white">
                    Feasibility Studies
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/our-services" className="hover:text-white">
                    Appraisals
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/market-reports" className="hover:text-white">
                    Market Reports
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/data-insights" className="hover:text-white">
                    Data & Insights
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="https://sageoutdooradvisory.com/contact-us/" className="hover:text-white font-semibold">
                    Schedule Free Consultation →
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
                <li>
                  <Link href="https://sageoutdooradvisory.com/blog" className="hover:text-white">
                    Blog
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

